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
