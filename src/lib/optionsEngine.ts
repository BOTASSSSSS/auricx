// ─── Binary Options Engine (pure logic, no React) ───────────

import { Bet, Market } from "./types";
import { generateId, safeNum } from "./utils";

export interface PlaceBetInput {
  marketId: string;
  choice: "yes" | "no";
  amount: number;
  odds: number;
}

export interface PlaceBetResult {
  ok: boolean;
  error?: string;
  bet?: Bet;
}

export function validatePlaceBet(
  input: PlaceBetInput,
  walletBalance: number,
  market: Market | undefined
): PlaceBetResult {
  const { marketId, choice, amount, odds } = input;

  if (!market) return { ok: false, error: "Market not found" };
  if (market.status !== "active") return { ok: false, error: "Market is not active" };
  if (!isFinite(amount) || amount <= 0) return { ok: false, error: "Amount must be > 0" };
  if (!isFinite(odds) || odds <= 1) return { ok: false, error: "Invalid odds" };
  if (amount > walletBalance) return { ok: false, error: "Insufficient balance" };

  const payout = safeNum(amount * odds);

  const bet: Bet = {
    id: `bet-${generateId()}`,
    marketId,
    choice,
    amount,
    odds,
    payout,
    resolved: false,
    placedAt: Date.now(),
  };

  return { ok: true, bet };
}

export interface ResolveMarketResult {
  ok: boolean;
  error?: string;
  resolvedBets: Bet[];
  totalPayout: number;
}

export function resolveMarketCalc(
  marketId: string,
  outcome: "yes" | "no",
  bets: Bet[]
): ResolveMarketResult {
  let totalPayout = 0;

  const resolvedBets = bets.map((b) => {
    if (b.marketId !== marketId || b.resolved) return b;
    const won = b.choice === outcome;
    if (won) totalPayout += b.payout;
    return { ...b, resolved: true, won };
  });

  return { ok: true, resolvedBets, totalPayout: safeNum(totalPayout) };
}
