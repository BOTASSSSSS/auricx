#!/usr/bin/env bash
# ─── AURICX Perps Patch (7 files) ─────────────────────────
# Run from project root: bash perps-patch.sh
set -euo pipefail

if [ ! -f "package.json" ]; then
  echo "ERROR: Run from AURICX project root"; exit 1
fi

BACKUP=".backups/perps-$(date +%Y%m%d-%H%M)"
echo "Backing up to $BACKUP..."

[ -f "src/lib/perpsEngine.ts" ] && mkdir -p "$BACKUP/$(dirname src/lib/perpsEngine.ts)" && cp "src/lib/perpsEngine.ts" "$BACKUP/src/lib/perpsEngine.ts" 2>/dev/null || true
[ -f "src/lib/prices.ts" ] && mkdir -p "$BACKUP/$(dirname src/lib/prices.ts)" && cp "src/lib/prices.ts" "$BACKUP/src/lib/prices.ts" 2>/dev/null || true
[ -f "src/lib/store.tsx" ] && mkdir -p "$BACKUP/$(dirname src/lib/store.tsx)" && cp "src/lib/store.tsx" "$BACKUP/src/lib/store.tsx" 2>/dev/null || true
[ -f "src/app/trade/perps/[assetId]/page.tsx" ] && mkdir -p "$BACKUP/$(dirname src/app/trade/perps/'[assetId]'/page.tsx)" && cp "src/app/trade/perps/[assetId]/page.tsx" "$BACKUP/src/app/trade/perps/[assetId]/page.tsx" 2>/dev/null || true
[ -f "src/components/AssetIcon.tsx" ] && mkdir -p "$BACKUP/$(dirname src/components/AssetIcon.tsx)" && cp "src/components/AssetIcon.tsx" "$BACKUP/src/components/AssetIcon.tsx" 2>/dev/null || true
[ -f "src/app/wallet/page.tsx" ] && mkdir -p "$BACKUP/$(dirname src/app/wallet/page.tsx)" && cp "src/app/wallet/page.tsx" "$BACKUP/src/app/wallet/page.tsx" 2>/dev/null || true
[ -f "src/components/MarketCard.tsx" ] && mkdir -p "$BACKUP/$(dirname src/components/MarketCard.tsx)" && cp "src/components/MarketCard.tsx" "$BACKUP/src/components/MarketCard.tsx" 2>/dev/null || true

echo "Applying 7 files..."

mkdir -p src/app/trade/perps/'[assetId]'
mkdir -p src/app/wallet
mkdir -p src/components
mkdir -p src/lib

cat > "src/lib/perpsEngine.ts" <<'EOF_SRC_LIB_PERPSENGINE_TS'
// ─── Perps Engine (pure logic, no React) ────────────────────
// All functions are pure. No side effects, no imports from React.

import { Position, Side, AppState } from "./types";
import { generateId, safeNum } from "./utils";

// ─── PnL Calculations ───────────────────────────────────────

/** Unrealized PnL for an open position at a given mark price */
export function calcUnrealizedPnl(position: Position, markPrice: number): number {
  if (!position.isOpen || !isFinite(markPrice) || markPrice <= 0) return 0;
  const change = (markPrice - position.entryPrice) / position.entryPrice;
  const raw = position.side === "long"
    ? position.size * position.leverage * change
    : position.size * position.leverage * -change;
  return safeNum(raw);
}

/** Realized PnL (same math, just explicit naming for closed positions) */
export function calcRealizedPnl(position: Position, exitPrice: number): number {
  if (!isFinite(exitPrice) || exitPrice <= 0) return 0;
  const change = (exitPrice - position.entryPrice) / position.entryPrice;
  const raw = position.side === "long"
    ? position.size * position.leverage * change
    : position.size * position.leverage * -change;
  return safeNum(raw);
}

// ─── Liquidation Price ──────────────────────────────────────

/** Estimated liquidation price (didactic, with 90% buffer) */
export function estLiquidationPrice(entryPrice: number, leverage: number, side: Side): number {
  if (!isFinite(entryPrice) || !isFinite(leverage) || leverage <= 0) return 0;
  const liqMove = (1 / leverage) * 0.9;
  return side === "long"
    ? safeNum(entryPrice * (1 - liqMove))
    : safeNum(entryPrice * (1 + liqMove));
}

// ─── Open Position ──────────────────────────────────────────

export interface OpenPositionInput {
  assetId: string;
  side: Side;
  margin: number;
  leverage: number;
  entryPrice: number; // should be mark price
}

export interface EngineResult {
  ok: boolean;
  error?: string;
}

export interface OpenPositionResult extends EngineResult {
  position?: Position;
  newBalance?: number;
}

/**
 * Validate and create a new position. Returns the position + updated balance.
 * Does NOT mutate state — caller applies the result.
 */
export function openPosition(state: AppState, input: OpenPositionInput): OpenPositionResult {
  const { assetId, side, margin, leverage, entryPrice } = input;

  // Validation
  if (!isFinite(margin) || margin <= 0)
    return { ok: false, error: "Margin must be > 0" };
  if (!isFinite(leverage) || leverage < 1 || leverage > 20)
    return { ok: false, error: "Leverage must be 1–20×" };
  if (!isFinite(entryPrice) || entryPrice <= 0)
    return { ok: false, error: "Invalid entry price" };
  if (margin > state.wallet.ethBalance)
    return { ok: false, error: `Insufficient balance (need ${margin.toFixed(4)}, have ${state.wallet.ethBalance.toFixed(4)})` };

  // Duplicate check: 1 open per asset per side
  const dup = state.positions.find(
    (p) => p.assetId === assetId && p.side === side && p.isOpen
  );
  if (dup) return { ok: false, error: `Already have open ${side.toUpperCase()} on this asset` };

  const position: Position = {
    id: `pos-${generateId()}`,
    assetId,
    side,
    size: margin,
    leverage,
    entryPrice,
    isOpen: true,
    isClosedPayoutDone: false,
    pnl: 0,
    openedAt: Date.now(),
  };

  return {
    ok: true,
    position,
    newBalance: safeNum(state.wallet.ethBalance - margin),
  };
}

// ─── Close Position ─────────────────────────────────────────

export interface ClosePositionInput {
  positionId: string;
  exitPrice: number; // should be mark price
}

export interface ClosePositionResult extends EngineResult {
  realizedPnl?: number;
  payout?: number;
  closedPosition?: Position;
  newBalance?: number;
}

/**
 * Validate and close a position. Returns payout + updated balance.
 * Anti-double-close: checks isOpen + isClosedPayoutDone.
 */
export function closePosition(state: AppState, input: ClosePositionInput): ClosePositionResult {
  const { positionId, exitPrice } = input;

  const pos = state.positions.find((p) => p.id === positionId);
  if (!pos) return { ok: false, error: "Position not found" };
  if (!pos.isOpen) return { ok: false, error: "Position already closed" };
  if (pos.isClosedPayoutDone) return { ok: false, error: "Payout already processed (anti-double-close)" };
  if (!isFinite(exitPrice) || exitPrice <= 0) return { ok: false, error: "Invalid exit price" };

  const pnl = calcRealizedPnl(pos, exitPrice);
  const payout = Math.max(0, pos.size + pnl); // can't lose more than margin

  const closedPosition: Position = {
    ...pos,
    isOpen: false,
    isClosedPayoutDone: true,
    pnl: safeNum(pnl),
    closedAt: Date.now(),
  };

  return {
    ok: true,
    realizedPnl: safeNum(pnl),
    payout: safeNum(payout),
    closedPosition,
    newBalance: safeNum(state.wallet.ethBalance + payout),
  };
}
EOF_SRC_LIB_PERPSENGINE_TS

cat > "src/lib/prices.ts" <<'EOF_SRC_LIB_PRICES_TS'
// ─── Price Layer ─────────────────────────────────────────────
// Provides consistent Index and Mark prices for the perps system.
// Index = raw asset price from the store (updated by price feed).
// Mark  = Index + small deterministic spread (simulates exchange mark price).

import { Asset } from "./types";
import { safeNum } from "./utils";

/**
 * Get the index price for an asset (the "spot" price).
 */
export function getIndexPrice(asset: Asset): number {
  return safeNum(asset.currentPrice);
}

/**
 * Deterministic spread based on assetId hash.
 * Returns a value in [-0.0015, +0.0015] range (±0.15% max).
 */
function spreadForAsset(assetId: string, ts: number): number {
  let h = 0;
  for (let i = 0; i < assetId.length; i++) {
    h = (Math.imul(31, h) + assetId.charCodeAt(i)) | 0;
  }
  // Use timestamp to make it slowly oscillate (period ~30s)
  const phase = Math.sin((ts / 30000) + (h & 0xffff));
  return phase * 0.0015;
}

/**
 * Get the mark price for an asset.
 * Mark = Index * (1 + spread).
 * This is used for PnL calculation and liquidation checks.
 */
export function getMarkPrice(asset: Asset): number {
  const index = getIndexPrice(asset);
  if (index <= 0) return 0;
  const spread = spreadForAsset(asset.id, Date.now());
  return safeNum(index * (1 + spread));
}

/**
 * Get both prices at once (avoids double computation).
 */
export function getPrices(asset: Asset): { index: number; mark: number } {
  const index = getIndexPrice(asset);
  if (index <= 0) return { index: 0, mark: 0 };
  const spread = spreadForAsset(asset.id, Date.now());
  return {
    index: safeNum(index),
    mark: safeNum(index * (1 + spread)),
  };
}
EOF_SRC_LIB_PRICES_TS

cat > "src/lib/store.tsx" <<'EOF_SRC_LIB_STORE_TSX'
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
EOF_SRC_LIB_STORE_TSX

cat > "src/app/trade/perps/[assetId]/page.tsx" <<'EOF_SRC_APP_TRADE_PERPS__ASSETID__PAGE_TSX'
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { usePriceFeed } from "@/lib/usePriceFeed";
import { PriceChart } from "@/components/PriceChart";
import { AssetIcon } from "@/components/AssetIcon";
import { calcUnrealizedPnl, estLiquidationPrice } from "@/lib/perpsEngine";
import { getPrices } from "@/lib/prices";
import { cn, formatPercent } from "@/lib/utils";
import Link from "next/link";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  X as XIcon,
  Activity,
} from "lucide-react";

export default function PerpsPage() {
  const params = useParams();
  const assetId = params.assetId as string;
  const { state, openPosition, closePosition } = useStore();
  const { toast } = useToast();
  const [side, setSide] = useState<"long" | "short">("long");
  const [amount, setAmount] = useState("");
  const [leverage, setLeverage] = useState(5);

  usePriceFeed();

  const asset = state.assets.find((a) => a.id === assetId);
  const myPositions = state.positions.filter((p) => p.assetId === assetId);
  const openPositions = myPositions.filter((p) => p.isOpen);
  const closedPositions = myPositions.filter((p) => !p.isOpen);

  if (!asset) {
    return (
      <div className="text-center py-20">
        <p className="text-muted mb-4">Asset not found</p>
        <Link href="/" className="btn-outline text-sm">Back to Markets</Link>
      </div>
    );
  }

  // Prices from consistency layer
  const { index: indexPrice, mark: markPrice } = getPrices(asset);
  const amountNum = parseFloat(amount) || 0;
  const liqPrice = amountNum > 0 ? estLiquidationPrice(markPrice, leverage, side) : 0;
  const notional = amountNum * leverage;
  const hasDupSide = !!openPositions.find((p) => p.side === side);

  const handleOpen = () => {
    if (amountNum <= 0) { toast("Enter a margin amount", "error"); return; }
    if (amountNum > state.wallet.ethBalance) { toast("Insufficient balance", "error"); return; }
    const result = openPosition(assetId, side, amountNum, leverage, markPrice);
    if (result.ok) {
      toast(`Opened ${side.toUpperCase()} ${amountNum.toFixed(4)} ETH @ ${leverage}x`, "success");
      setAmount("");
    } else {
      toast(result.error || "Failed to open position", "error");
    }
  };

  const handleClose = (positionId: string) => {
    const result = closePosition(positionId, markPrice);
    if (result.ok) {
      toast("Position closed!", "success");
    } else {
      toast(result.error || "Failed to close", "error");
    }
  };

  return (
    <div>
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted hover:text-white mb-4 transition-colors">
        <ArrowLeft size={16} /> Back
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT: Asset List */}
        <div className="lg:col-span-2 space-y-1">
          <h3 className="text-xs text-muted uppercase tracking-wider mb-3 px-1">Assets</h3>
          {state.assets.map((a) => (
            <Link
              key={a.id}
              href={`/trade/perps/${a.id}`}
              className={cn(
                "flex items-center gap-2 p-2 rounded-lg transition-all text-sm",
                a.id === assetId
                  ? "bg-accent/10 border border-accent/30"
                  : "hover:bg-card border border-transparent"
              )}
            >
              <AssetIcon category={a.category} size={16} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-xs truncate">{a.symbol}</div>
                <div className={cn("text-[10px]", a.priceChange24h >= 0 ? "text-positive" : "text-negative")}>
                  ${a.currentPrice.toFixed(2)}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* CENTER: Chart + Positions */}
        <div className="lg:col-span-7 space-y-4">
          {/* Asset Header */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 border border-accent/20">
                  <AssetIcon category={asset.category} size={22} />
                </div>
                <div>
                  <h1 className="text-lg font-bold">{asset.name}</h1>
                  <span className="text-xs text-muted">{asset.symbol} • {asset.category}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">${indexPrice.toFixed(2)}</div>
                <div className={cn("text-sm font-medium flex items-center justify-end gap-1", asset.priceChange24h >= 0 ? "text-positive" : "text-negative")}>
                  {asset.priceChange24h >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {formatPercent(asset.priceChange24h)}
                </div>
              </div>
            </div>

            {/* Index vs Mark */}
            <div className="flex gap-4 mb-4">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="w-2 h-2 rounded-full bg-accent" />
                <span className="text-muted">Index:</span>
                <span className="font-medium">${indexPrice.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <Activity size={10} className="text-warning" />
                <span className="text-muted">Mark:</span>
                <span className="font-medium text-warning">${markPrice.toFixed(2)}</span>
              </div>
              <div className="text-xs text-muted">
                Spread: {((markPrice - indexPrice) / indexPrice * 100).toFixed(3)}%
              </div>
            </div>

            {/* Chart */}
            {asset.priceHistory.length > 2 ? (
              <PriceChart
                data={asset.priceHistory}
                color={asset.priceChange24h >= 0 ? "#22C55E" : "#EF4444"}
                height={280}
              />
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted text-sm animate-pulse">
                Loading chart data...
              </div>
            )}
          </div>

          {/* Open Positions */}
          {openPositions.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold mb-3">Open Positions</h3>
              <div className="space-y-2">
                {openPositions.map((p) => {
                  const livePnl = calcUnrealizedPnl(p, markPrice);
                  const liq = estLiquidationPrice(p.entryPrice, p.leverage, p.side);
                  const pnlPct = p.size > 0 ? (livePnl / p.size) * 100 : 0;
                  return (
                    <div key={p.id} className="p-3 rounded-lg bg-card border border-border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={cn("px-2 py-0.5 rounded text-xs font-bold", p.side === "long" ? "bg-positive/20 text-positive" : "bg-negative/20 text-negative")}>
                            {p.side.toUpperCase()}
                          </span>
                          <div className="text-xs text-muted">
                            <div>{p.size.toFixed(4)} ETH × {p.leverage}x</div>
                            <div>Entry: ${p.entryPrice.toFixed(2)} • Liq: ${liq.toFixed(2)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className={cn("text-sm font-bold", livePnl >= 0 ? "text-positive" : "text-negative")}>
                              {livePnl >= 0 ? "+" : ""}{livePnl.toFixed(4)} ETH
                            </div>
                            <div className={cn("text-[10px]", livePnl >= 0 ? "text-positive/70" : "text-negative/70")}>
                              {pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(1)}%
                            </div>
                          </div>
                          <button
                            onClick={() => handleClose(p.id)}
                            className="p-2 rounded-lg bg-negative/10 text-negative hover:bg-negative/20 transition-all"
                            title="Close position"
                          >
                            <XIcon size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Trade History */}
          {closedPositions.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold mb-3">Trade History</h3>
              <div className="space-y-2">
                {closedPositions
                  .sort((a, b) => (b.closedAt || 0) - (a.closedAt || 0))
                  .slice(0, 5)
                  .map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-card/50 border border-border/50">
                      <div className="flex items-center gap-3">
                        <span className={cn("px-2 py-0.5 rounded text-xs font-bold opacity-60", p.side === "long" ? "bg-positive/20 text-positive" : "bg-negative/20 text-negative")}>
                          {p.side.toUpperCase()}
                        </span>
                        <span className="text-xs text-muted">{p.size.toFixed(4)} ETH @ {p.leverage}x</span>
                      </div>
                      <span className={cn("text-sm font-medium", p.pnl >= 0 ? "text-positive" : "text-negative")}>
                        {p.pnl >= 0 ? "+" : ""}{p.pnl.toFixed(4)} ETH
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Trade Panel */}
        <div className="lg:col-span-3 space-y-4">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold mb-4">Open Position</h3>

            {/* Long/Short Toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setSide("long")}
                className={cn(
                  "flex-1 py-3 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-1.5",
                  side === "long"
                    ? "bg-positive text-white shadow-lg shadow-positive/20"
                    : "bg-positive/10 text-positive border border-positive/20"
                )}
              >
                <TrendingUp size={14} /> Long
              </button>
              <button
                onClick={() => setSide("short")}
                className={cn(
                  "flex-1 py-3 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-1.5",
                  side === "short"
                    ? "bg-negative text-white shadow-lg shadow-negative/20"
                    : "bg-negative/10 text-negative border border-negative/20"
                )}
              >
                <TrendingDown size={14} /> Short
              </button>
            </div>

            <div className="space-y-4">
              {/* Margin Input */}
              <div>
                <label className="text-xs text-muted uppercase tracking-wider mb-1.5 block">Margin (ETH)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  min={0}
                  step={0.01}
                  className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent/50"
                />
                <div className="flex justify-between text-[10px] text-muted mt-1">
                  <span>Balance: {state.wallet.ethBalance.toFixed(4)} ETH</span>
                  {amountNum > state.wallet.ethBalance && (
                    <span className="text-negative font-medium">Insufficient</span>
                  )}
                </div>
              </div>

              {/* Leverage Slider */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-muted uppercase tracking-wider">Leverage</label>
                  <span className="text-sm font-bold text-accent">{leverage}x</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={20}
                  value={leverage}
                  onChange={(e) => setLeverage(Number(e.target.value))}
                  className="w-full accent-accent h-1.5 rounded-full appearance-none bg-border cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:cursor-pointer
                    [&::-webkit-slider-thumb]:shadow-glow"
                />
                <div className="flex justify-between text-[10px] text-muted mt-1">
                  <span>1x</span><span>10x</span><span>20x</span>
                </div>
              </div>

              {/* Trade Summary */}
              <div className="space-y-2 p-3 rounded-lg bg-accent/5 border border-accent/10">
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Entry (Mark)</span>
                  <span className="font-medium">${markPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Notional</span>
                  <span className="font-medium">{notional.toFixed(4)} ETH</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Est. Liquidation</span>
                  <span className="font-medium text-warning">
                    {amountNum > 0 ? `$${liqPrice.toFixed(2)}` : "\u2014"}
                  </span>
                </div>
              </div>

              {/* Duplicate Warning */}
              {hasDupSide && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-warning/10 border border-warning/20">
                  <AlertTriangle size={14} className="text-warning shrink-0" />
                  <span className="text-[11px] text-warning">
                    Already have open {side.toUpperCase()} on this asset.
                  </span>
                </div>
              )}

              {/* Open Button */}
              <button
                onClick={handleOpen}
                disabled={amountNum <= 0 || amountNum > state.wallet.ethBalance || hasDupSide}
                className={cn(
                  "w-full py-3 rounded-lg font-semibold text-sm transition-all",
                  amountNum > 0 && amountNum <= state.wallet.ethBalance && !hasDupSide
                    ? side === "long" ? "bg-positive text-white hover:bg-positive/90" : "bg-negative text-white hover:bg-negative/90"
                    : "bg-muted/20 text-muted cursor-not-allowed"
                )}
              >
                Open {side.toUpperCase()} Position
              </button>
            </div>
          </div>

          {/* Wallet Card */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold mb-3">Wallet</h3>
            <div className="space-y-2">
              <div className="flex justify-between p-2.5 rounded-lg bg-card">
                <span className="text-xs text-muted">ETH Balance</span>
                <span className="text-sm font-bold">{state.wallet.ethBalance.toFixed(4)}</span>
              </div>
              {(state.wallet.skinTokens[assetId] || 0) > 0 && (
                <div className="flex justify-between p-2.5 rounded-lg bg-card">
                  <span className="text-xs text-muted">{asset.symbol} Tokens</span>
                  <span className="text-sm font-bold">{state.wallet.skinTokens[assetId]}</span>
                </div>
              )}
            </div>
            <Link href="/wallet" className="block text-center text-xs text-accent hover:text-accent/80 mt-3 transition-colors">
              Manage Wallet →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
EOF_SRC_APP_TRADE_PERPS__ASSETID__PAGE_TSX

cat > "src/components/AssetIcon.tsx" <<'EOF_SRC_COMPONENTS_ASSETICON_TSX'
// ─── Asset Icon Component ────────────────────────────────────
// Inline SVGs for CS2 skin categories. No network requests.

import React from "react";
import { cn } from "@/lib/utils";

type IconName = "rifle" | "awp" | "knife" | "gloves" | "pistol" | "crosshair" | "default";

interface AssetIconProps {
  /** Asset category string (auto-mapped) or explicit icon name */
  category?: string;
  /** Override icon name directly */
  icon?: IconName;
  /** Size in px (default 20) */
  size?: number;
  /** Additional className */
  className?: string;
}

function mapCategory(cat?: string): IconName {
  if (!cat) return "default";
  const c = cat.toLowerCase();
  if (c.includes("knife") || c.includes("bayonet") || c.includes("karambit") || c.includes("butterfly")) return "knife";
  if (c.includes("awp") || c.includes("sniper")) return "awp";
  if (c.includes("glove")) return "gloves";
  if (c.includes("pistol") || c.includes("deagle") || c.includes("usp") || c.includes("glock")) return "pistol";
  if (c.includes("rifle") || c.includes("ak") || c.includes("m4")) return "rifle";
  if (c.includes("index") || c.includes("cs2") || c.includes("tournament")) return "crosshair";
  return "default";
}

const icons: Record<IconName, (size: number) => React.ReactElement> = {
  rifle: (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 14h15l3-2v-2l-3-2H2v6z" />
      <path d="M5 14v3h2v-3" />
      <circle cx="19" cy="10" r="1" />
    </svg>
  ),
  awp: (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12h19l2-1v-1l-2-1H1v3z" />
      <path d="M4 12v4h1.5v-4" />
      <circle cx="21" cy="10.5" r="1.5" />
      <path d="M21 9v-3" />
    </svg>
  ),
  knife: (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19l2-2L18 5c1-1 3-1 3 1s-1 3-2 3L7 17l-2 2z" />
      <path d="M6 17H4v2" />
    </svg>
  ),
  gloves: (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 20c-2 0-3-1-3-3V9c0-1 1-2 2-2v-2c0-1 1-1.5 1.5-1.5S10 4 10 5v-1c0-1 1-1.5 1.5-1.5S13 3 13 4v-.5c0-1 1-1.5 1.5-1.5S16 2 16 3v8c0 3-2 4-2 4" />
    </svg>
  ),
  pistol: (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10h12l2-2v-2H3v4z" />
      <path d="M7 10v6h3v-6" />
      <path d="M15 8l3-1" />
    </svg>
  ),
  crosshair: (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  default: (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 12h8M12 8v8" />
    </svg>
  ),
};

export function AssetIcon({ category, icon, size = 20, className }: AssetIconProps) {
  const iconName = icon || mapCategory(category);
  const render = icons[iconName] || icons.default;
  return (
    <span className={cn("inline-flex items-center justify-center shrink-0 text-accent", className)}>
      {render(size)}
    </span>
  );
}
EOF_SRC_COMPONENTS_ASSETICON_TSX

cat > "src/app/wallet/page.tsx" <<'EOF_SRC_APP_WALLET_PAGE_TSX'
"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { DepositDialog } from "@/components/DepositDialog";
import { AssetIcon } from "@/components/AssetIcon";
import { cn, formatPercent } from "@/lib/utils";
import { calcUnrealizedPnl } from "@/lib/perpsEngine";
import { Wallet, Plus, TrendingUp, TrendingDown, RotateCcw } from "lucide-react";

export default function WalletPage() {
  const { state, dispatch } = useStore();
  const { toast } = useToast();
  const [depositMode, setDepositMode] = useState<"eth" | "skin" | null>(null);

  // Calculate total portfolio value
  const skinValue = Object.entries(state.wallet.skinTokens).reduce((sum, [assetId, qty]) => {
    const asset = state.assets.find((a) => a.id === assetId);
    return sum + (asset ? asset.currentPrice * qty : 0);
  }, 0);

  const totalPnl = state.positions
    .filter((p) => !p.isOpen && p.isClosedPayoutDone)
    .reduce((sum, p) => sum + p.pnl, 0);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 border border-accent/30">
          <Wallet size={20} className="text-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Wallet</h1>
          <p className="text-sm text-muted">Manage your balances and deposits</p>
        </div>
      </div>

      {/* Portfolio Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="glass-card p-5">
          <div className="text-xs text-muted uppercase tracking-wider mb-1">ETH Balance</div>
          <div className="text-2xl font-bold">{state.wallet.ethBalance.toFixed(4)}</div>
          <div className="text-xs text-muted mt-1">≈ ${(state.wallet.ethBalance * 3200).toFixed(0)} USD</div>
        </div>
        <div className="glass-card p-5">
          <div className="text-xs text-muted uppercase tracking-wider mb-1">Skin Token Value</div>
          <div className="text-2xl font-bold">${skinValue.toFixed(0)}</div>
          <div className="text-xs text-muted mt-1">
            {Object.keys(state.wallet.skinTokens).length} assets
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="text-xs text-muted uppercase tracking-wider mb-1">Total Realized PnL</div>
          <div
            className={cn(
              "text-2xl font-bold",
              totalPnl >= 0 ? "text-positive" : "text-negative"
            )}
          >
            {totalPnl >= 0 ? "+" : ""}
            {totalPnl.toFixed(4)} ETH
          </div>
          <div className="text-xs text-muted mt-1">
            {state.positions.filter((p) => !p.isOpen).length} closed trades
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mb-8">
        <button
          onClick={() => setDepositMode("eth")}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} />
          Deposit ETH
        </button>
        <button
          onClick={() => setDepositMode("skin")}
          className="btn-outline flex items-center gap-2"
        >
          <Plus size={16} />
          Deposit Skin Token
        </button>
        <button
          onClick={() => {
            if (confirm("Reset wallet and all data to initial state?")) {
              dispatch({ type: "RESET_STATE" });
              toast("Demo reset! Reloading...", "info");
              setTimeout(() => window.location.reload(), 500);
            }
          }}
          className="ml-auto flex items-center gap-2 px-3 py-2 text-xs text-muted hover:text-white border border-border rounded-lg hover:border-muted/50 transition-all"
        >
          <RotateCcw size={14} />
          Reset Demo
        </button>
      </div>

      {/* Skin Tokens */}
      <div className="glass-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-semibold">Skin Token Balances</h2>
        </div>
        <div className="divide-y divide-border">
          {state.assets.map((asset) => {
            const qty = state.wallet.skinTokens[asset.id] || 0;
            const value = qty * asset.currentPrice;
            return (
              <div
                key={asset.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-card-hover transition-colors"
              >
                <div className="flex items-center gap-3">
                  <AssetIcon category={asset.category} size={18} />
                  <div>
                    <div className="font-medium text-sm">{asset.name}</div>
                    <div className="text-xs text-muted">{asset.symbol}</div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div
                    className={cn(
                      "flex items-center gap-1 text-xs font-medium",
                      asset.priceChange24h >= 0 ? "text-positive" : "text-negative"
                    )}
                  >
                    {asset.priceChange24h >= 0 ? (
                      <TrendingUp size={12} />
                    ) : (
                      <TrendingDown size={12} />
                    )}
                    {formatPercent(asset.priceChange24h)}
                  </div>
                  <div className="text-right min-w-[100px]">
                    <div className="font-semibold text-sm">{qty} tokens</div>
                    <div className="text-xs text-muted">${value.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Open Positions Summary */}
      {state.positions.filter((p) => p.isOpen).length > 0 && (
        <div className="glass-card overflow-hidden mt-6">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-semibold">Open Positions</h2>
          </div>
          <div className="divide-y divide-border">
            {state.positions
              .filter((p) => p.isOpen)
              .map((p) => {
                const asset = state.assets.find((a) => a.id === p.assetId);
                if (!asset) return null;
                const livePnl = calcUnrealizedPnl(p, asset.currentPrice);
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between px-6 py-4"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-xs font-bold",
                          p.side === "long"
                            ? "bg-positive/20 text-positive"
                            : "bg-negative/20 text-negative"
                        )}
                      >
                        {p.side.toUpperCase()}
                      </span>
                      <div>
                        <div className="font-medium text-sm">{asset.name}</div>
                        <div className="text-xs text-muted">
                          {p.size.toFixed(4)} ETH @ {p.leverage}x
                        </div>
                      </div>
                    </div>
                    <div
                      className={cn(
                        "font-bold text-sm",
                        livePnl >= 0 ? "text-positive" : "text-negative"
                      )}
                    >
                      {livePnl >= 0 ? "+" : ""}
                      {livePnl.toFixed(4)} ETH
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      <DepositDialog
        open={depositMode !== null}
        onClose={() => setDepositMode(null)}
        mode={depositMode || "eth"}
      />
    </div>
  );
}
EOF_SRC_APP_WALLET_PAGE_TSX

cat > "src/components/MarketCard.tsx" <<'EOF_SRC_COMPONENTS_MARKETCARD_TSX'
"use client";

import Link from "next/link";
import { Market } from "@/lib/types";
import { cn, formatCompact, formatPercent, timeRemaining } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { Clock, TrendingUp, TrendingDown, Zap, Users } from "lucide-react";
import { SparklineChart } from "./SparklineChart";
import { AssetIcon } from "./AssetIcon";

interface MarketCardProps {
  market: Market;
}

export function MarketCard({ market }: MarketCardProps) {
  const { state } = useStore();
  const isPerp = market.type === "perp_index";
  const isBinary = market.type === "binary" || market.type === "prediction_winner" || market.type === "prediction_overunder";
  const asset = market.assetId ? state.assets.find((a) => a.id === market.assetId) : null;

  const href = isPerp ? `/trade/perps/${market.assetId}` : `/markets/${market.id}`;

  // Determine icon
  const iconSrc = market.iconPath || (asset?.iconPath) || null;

  return (
    <Link href={href} className="block group">
      <div
        className={cn(
          "glass-card p-5 transition-all duration-300",
          "hover:border-accent/30 hover:shadow-glow hover:bg-card-hover",
          market.status === "resolved" && "opacity-70"
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {iconSrc ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={iconSrc} alt="" className="w-5 h-5 opacity-80" />
              </div>
            ) : isBinary ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Zap size={16} />
              </div>
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                <AssetIcon category={asset?.category} size={16} />
              </div>
            )}
            <div>
              <span
                className={cn(
                  "inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider",
                  market.type === "perp_index"
                    ? "bg-accent/10 text-accent"
                    : market.type === "binary"
                    ? "bg-purple-500/10 text-purple-400"
                    : market.type === "prediction_winner"
                    ? "bg-purple-500/10 text-purple-400"
                    : "bg-warning/10 text-warning"
                )}
              >
                {market.type === "perp_index"
                  ? "PERP"
                  : market.type === "binary"
                  ? "BINARY"
                  : market.type === "prediction_winner"
                  ? "WINNER"
                  : "OVER/UNDER"}
              </span>
            </div>
          </div>
          <StatusBadge status={market.status} />
        </div>

        {/* Title */}
        <h3 className="font-semibold text-sm mb-2 group-hover:text-white transition-colors line-clamp-2">
          {market.title}
        </h3>

        {/* Content */}
        {isBinary ? (
          <div className="space-y-3">
            {market.teamA && market.teamB && (
              <div className="text-xs text-muted mb-1">
                {market.teamA} vs {market.teamB}
              </div>
            )}
            <div className="flex gap-2">
              <div className="flex-1 rounded-lg bg-positive/10 border border-positive/20 p-2.5 text-center">
                <div className="text-[10px] uppercase text-positive/70 mb-0.5">
                  {market.teamA ? market.teamA.split(" ")[0] : "Yes"}
                </div>
                <div className="text-sm font-bold text-positive">{market.odds?.yes.toFixed(2)}x</div>
              </div>
              <div className="flex-1 rounded-lg bg-negative/10 border border-negative/20 p-2.5 text-center">
                <div className="text-[10px] uppercase text-negative/70 mb-0.5">
                  {market.teamB ? market.teamB.split(" ")[0] : "No"}
                </div>
                <div className="text-sm font-bold text-negative">{market.odds?.no.toFixed(2)}x</div>
              </div>
            </div>
          </div>
        ) : asset ? (
          <div className="space-y-2">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-xl font-bold">${asset.currentPrice.toFixed(2)}</div>
                <div
                  className={cn(
                    "text-xs font-medium flex items-center gap-1",
                    asset.priceChange24h >= 0 ? "text-positive" : "text-negative"
                  )}
                >
                  {asset.priceChange24h >= 0 ? (
                    <TrendingUp size={12} />
                  ) : (
                    <TrendingDown size={12} />
                  )}
                  {formatPercent(asset.priceChange24h)}
                </div>
              </div>
              <div className="w-24 h-10">
                <SparklineChart
                  data={asset.priceHistory.slice(-20)}
                  color={asset.priceChange24h >= 0 ? "#22C55E" : "#EF4444"}
                />
              </div>
            </div>
          </div>
        ) : null}

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-1 text-[11px] text-muted">
            <Clock size={11} />
            {market.status === "resolved" ? "Ended" : timeRemaining(market.expiresAt)}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-muted">
            <Users size={11} />
            Vol {formatCompact(market.totalVolume)}
          </div>
        </div>
      </div>
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "text-[10px] px-2 py-0.5 rounded-full font-medium",
        status === "active" && "bg-positive/10 text-positive",
        status === "upcoming" && "bg-warning/10 text-warning",
        status === "resolved" && "bg-muted/20 text-muted"
      )}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
EOF_SRC_COMPONENTS_MARKETCARD_TSX

echo ""
echo "✅ Perps patch applied (7 files)"
echo "   Backups in: $BACKUP"
echo ""
echo "Run: npm run build && npm run dev"
