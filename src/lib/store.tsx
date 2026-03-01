"use client";

import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from "react";
import { AppState, Market, Position, Bet } from "./types";
import {
  INITIAL_MARKETS,
  INITIAL_ASSETS,
  INITIAL_WALLET,
  INITIAL_LEADERBOARD,
} from "./mockData";
import { generateId, safeNum } from "./utils";
import { openPosition as engineOpenPosition, closePosition as engineClosePosition } from "./perpsEngine";
import { validatePlaceBet, resolveMarketCalc } from "./optionsEngine";

// ─── Versioned storage ──────────────────────────────────────
const STORAGE_KEY = "auricx_state";
const STATE_VERSION = 3;

const defaultState: AppState = {
  markets: INITIAL_MARKETS,
  assets: INITIAL_ASSETS,
  positions: [],
  bets: [],
  wallet: INITIAL_WALLET,
  leaderboard: INITIAL_LEADERBOARD,
};

function loadState(): AppState {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed._version !== STATE_VERSION) {
        localStorage.removeItem(STORAGE_KEY);
        return defaultState;
      }
      const { _version, ...rest } = parsed;
      return { ...defaultState, ...rest };
    }
  } catch {
    // corrupted
  }
  return defaultState;
}

function saveState(state: AppState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...state, _version: STATE_VERSION })
    );
  } catch {
    // quota exceeded or private mode
  }
}

// ─── Actions ────────────────────────────────────────────────
type Action =
  | { type: "INIT"; state: AppState }
  | { type: "ADD_MARKET"; market: Market }
  | { type: "RESOLVE_MARKET"; marketId: string; outcome: "yes" | "no" }
  | { type: "PLACE_BET"; bet: Bet }
  | { type: "OPEN_POSITION"; position: Position }
  | { type: "CLOSE_POSITION"; positionId: string; exitPrice: number }
  | { type: "DEPOSIT_ETH"; amount: number }
  | { type: "DEPOSIT_SKIN"; assetId: string; amount: number }
  | { type: "UPDATE_ASSET_PRICE"; assetId: string; price: number }
  | { type: "RESET_STATE" };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "INIT":
      return action.state;

    case "ADD_MARKET":
      return { ...state, markets: [...state.markets, action.market] };

    case "RESOLVE_MARKET": {
      const { resolvedBets, totalPayout } = resolveMarketCalc(
        action.marketId,
        action.outcome,
        state.bets
      );
      const markets = state.markets.map((m) =>
        m.id === action.marketId
          ? { ...m, status: "resolved" as const, outcome: action.outcome }
          : m
      );
      return {
        ...state,
        markets,
        bets: resolvedBets,
        wallet: {
          ...state.wallet,
          ethBalance: safeNum(state.wallet.ethBalance + totalPayout),
        },
      };
    }

    case "PLACE_BET": {
      const newBalance = safeNum(state.wallet.ethBalance - action.bet.amount);
      if (newBalance < 0) return state;
      return {
        ...state,
        bets: [...state.bets, action.bet],
        wallet: { ...state.wallet, ethBalance: newBalance },
      };
    }

    case "OPEN_POSITION": {
      const newBalance = safeNum(state.wallet.ethBalance - action.position.size);
      if (newBalance < 0) return state;
      return {
        ...state,
        positions: [...state.positions, action.position],
        wallet: { ...state.wallet, ethBalance: newBalance },
      };
    }

    case "CLOSE_POSITION": {
      const result = engineClosePosition(state, {
        positionId: action.positionId,
        exitPrice: action.exitPrice,
      });
      if (!result.ok || !result.closedPosition) return state;

      const positions = state.positions.map((p) =>
        p.id === action.positionId ? result.closedPosition! : p
      );
      return {
        ...state,
        positions,
        wallet: {
          ...state.wallet,
          ethBalance: result.newBalance ?? state.wallet.ethBalance,
        },
      };
    }

    case "DEPOSIT_ETH": {
      if (!isFinite(action.amount) || action.amount <= 0) return state;
      return {
        ...state,
        wallet: {
          ...state.wallet,
          ethBalance: safeNum(state.wallet.ethBalance + action.amount),
        },
      };
    }

    case "DEPOSIT_SKIN": {
      if (!isFinite(action.amount) || action.amount <= 0) return state;
      const tokens = { ...state.wallet.skinTokens };
      tokens[action.assetId] = (tokens[action.assetId] || 0) + action.amount;
      return { ...state, wallet: { ...state.wallet, skinTokens: tokens } };
    }

    case "UPDATE_ASSET_PRICE": {
      if (!isFinite(action.price) || action.price <= 0) return state;
      const assets = state.assets.map((a) => {
        if (a.id !== action.assetId) return a;
        const history = [...a.priceHistory.slice(-99), action.price];
        const firstPrice = a.priceHistory[0] || action.price;
        const change = firstPrice > 0 ? ((action.price - firstPrice) / firstPrice) * 100 : 0;
        return {
          ...a,
          currentPrice: action.price,
          priceHistory: history,
          priceChange24h: safeNum(change),
        };
      });
      return { ...state, assets };
    }

    case "RESET_STATE":
      if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
      return defaultState;

    default:
      return state;
  }
}

// ─── Context ────────────────────────────────────────────────
export interface StoreActions {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  addMarket: (market: Omit<Market, "id" | "createdAt" | "totalVolume">) => void;
  resolveMarket: (marketId: string, outcome: "yes" | "no") => void;
  placeBet: (marketId: string, choice: "yes" | "no", amount: number, odds: number) => { ok: boolean; error?: string };
  openPosition: (assetId: string, side: "long" | "short", size: number, leverage: number, entryPrice: number) => { ok: boolean; error?: string };
  closePosition: (positionId: string, exitPrice: number) => { ok: boolean; error?: string };
  depositETH: (amount: number) => void;
  depositSkin: (assetId: string, amount: number) => void;
}

const StoreContext = createContext<StoreActions | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, defaultState);
  const initialized = useRef(false);
  // Keep a ref for callbacks that need fresh state
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (!initialized.current) {
      dispatch({ type: "INIT", state: loadState() });
      initialized.current = true;
    }
  }, []);

  useEffect(() => {
    if (initialized.current) saveState(state);
  }, [state]);

  const addMarket = useCallback(
    (market: Omit<Market, "id" | "createdAt" | "totalVolume">) => {
      dispatch({
        type: "ADD_MARKET",
        market: { ...market, id: `mkt-${generateId()}`, createdAt: Date.now(), totalVolume: 0 },
      });
    },
    []
  );

  const resolveMarket = useCallback(
    (marketId: string, outcome: "yes" | "no") => {
      dispatch({ type: "RESOLVE_MARKET", marketId, outcome });
    },
    []
  );

  const placeBetFn = useCallback(
    (marketId: string, choice: "yes" | "no", amount: number, odds: number) => {
      const s = stateRef.current;
      const market = s.markets.find((m) => m.id === marketId);
      const result = validatePlaceBet({ marketId, choice, amount, odds }, s.wallet.ethBalance, market);
      if (!result.ok) return { ok: false, error: result.error };
      dispatch({ type: "PLACE_BET", bet: result.bet! });
      return { ok: true };
    },
    []
  );

  const openPositionFn = useCallback(
    (assetId: string, side: "long" | "short", size: number, leverage: number, entryPrice: number) => {
      const s = stateRef.current;
      const result = engineOpenPosition(s, { assetId, side, margin: size, leverage, entryPrice });
      if (!result.ok) return { ok: false, error: result.error };
      dispatch({ type: "OPEN_POSITION", position: result.position! });
      return { ok: true };
    },
    []
  );

  const closePositionFn = useCallback(
    (positionId: string, exitPrice: number) => {
      const s = stateRef.current;
      const pos = s.positions.find((p) => p.id === positionId);
      if (!pos) return { ok: false, error: "Position not found" };
      if (!pos.isOpen) return { ok: false, error: "Already closed" };
      if (pos.isClosedPayoutDone) return { ok: false, error: "Payout already done" };
      dispatch({ type: "CLOSE_POSITION", positionId, exitPrice });
      return { ok: true };
    },
    []
  );

  const depositETH = useCallback((amount: number) => {
    dispatch({ type: "DEPOSIT_ETH", amount });
  }, []);

  const depositSkin = useCallback((assetId: string, amount: number) => {
    dispatch({ type: "DEPOSIT_SKIN", assetId, amount });
  }, []);

  return (
    <StoreContext.Provider
      value={{
        state, dispatch, addMarket, resolveMarket,
        placeBet: placeBetFn, openPosition: openPositionFn, closePosition: closePositionFn,
        depositETH, depositSkin,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreActions {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
