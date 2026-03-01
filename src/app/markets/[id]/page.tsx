"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { usePriceFeed } from "@/lib/usePriceFeed";
import { cn, formatCompact, timeRemaining } from "@/lib/utils";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  Users,
  Check,
  AlertTriangle,
  Wallet,
  ChevronDown,
} from "lucide-react";

const DEMO = true;

export default function MarketDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { state, placeBet, resolveMarket } = useStore();
  const { toast } = useToast();
  const [choice, setChoice] = useState<"yes" | "no">("yes");
  const [amount, setAmount] = useState("");
  const [showWallet, setShowWallet] = useState(false);

  usePriceFeed();

  const market = state.markets.find((m) => m.id === id);
  if (!market) {
    return (
      <div className="text-center py-20">
        <p className="text-muted mb-4">Market not found</p>
        <Link href="/" className="btn-outline text-sm">Back to Markets</Link>
      </div>
    );
  }

  const odds = market.odds || { yes: 1.5, no: 1.5 };
  const selectedOdds = choice === "yes" ? odds.yes : odds.no;
  const amountNum = parseFloat(amount) || 0;
  const estPayout = amountNum * selectedOdds;

  const handlePlaceBet = () => {
    const result = placeBet(market.id, choice, amountNum, selectedOdds);
    if (result.ok) {
      toast(`Bet placed: ${choice.toUpperCase()} for ${amountNum.toFixed(4)} ETH`, "success");
      setAmount("");
    } else {
      toast(result.error || "Failed to place bet", "error");
    }
  };

  const handleResolve = (outcome: "yes" | "no") => {
    resolveMarket(market.id, outcome);
    toast(`Market resolved: ${outcome.toUpperCase()} wins!`, "success");
  };

  const myBets = state.bets.filter((b) => b.marketId === market.id);

  return (
    <div>
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Markets
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Market Info */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={cn(
                  "inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider",
                  market.type === "prediction_winner"
                    ? "bg-purple-500/10 text-purple-400"
                    : "bg-warning/10 text-warning"
                )}
              >
                {market.type === "prediction_winner" ? "WINNER" : "OVER/UNDER"}
              </span>
              <span
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full font-medium",
                  market.status === "active" && "bg-positive/10 text-positive",
                  market.status === "upcoming" && "bg-warning/10 text-warning",
                  market.status === "resolved" && "bg-muted/20 text-muted"
                )}
              >
                {market.status.charAt(0).toUpperCase() + market.status.slice(1)}
              </span>
            </div>
            <h1 className="text-xl font-bold mb-2">{market.title}</h1>
            <p className="text-sm text-muted mb-4">{market.description}</p>

            <div className="flex items-center gap-6 text-xs text-muted">
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {market.status === "resolved" ? "Ended" : timeRemaining(market.expiresAt)}
              </span>
              <span className="flex items-center gap-1">
                <Users size={12} />
                Vol {formatCompact(market.totalVolume)}
              </span>
            </div>

            {market.status === "resolved" && market.outcome && (
              <div className="mt-4 p-3 rounded-lg bg-positive/10 border border-positive/20 flex items-center gap-2">
                <Check size={16} className="text-positive" />
                <span className="text-sm font-medium text-positive">
                  Resolved: {market.outcome === "yes" ? "YES" : "NO"} won
                </span>
              </div>
            )}
          </div>

          {/* Odds Visual */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold mb-4">Current Odds</h3>
            {market.teamA && market.teamB && (
              <div className="text-xs text-muted mb-3">{market.teamA} vs {market.teamB}</div>
            )}
            <div className="flex gap-3">
              <div className="flex-1 bg-positive/5 border border-positive/20 rounded-xl p-4 text-center">
                <div className="text-xs text-positive/70 mb-1">
                  {market.teamA || "YES"}
                </div>
                <div className="text-2xl font-bold text-positive">{odds.yes.toFixed(2)}x</div>
                <div className="text-xs text-muted mt-1">
                  {((1 / odds.yes) * 100).toFixed(0)}% implied
                </div>
              </div>
              <div className="flex-1 bg-negative/5 border border-negative/20 rounded-xl p-4 text-center">
                <div className="text-xs text-negative/70 mb-1">
                  {market.teamB || "NO"}
                </div>
                <div className="text-2xl font-bold text-negative">{odds.no.toFixed(2)}x</div>
                <div className="text-xs text-muted mt-1">
                  {((1 / odds.no) * 100).toFixed(0)}% implied
                </div>
              </div>
            </div>
          </div>

          {/* My Bets */}
          {myBets.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold mb-3">My Bets</h3>
              <div className="space-y-2">
                {myBets.map((bet) => (
                  <div
                    key={bet.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-card border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-xs font-semibold",
                          bet.choice === "yes"
                            ? "bg-positive/20 text-positive"
                            : "bg-negative/20 text-negative"
                        )}
                      >
                        {bet.choice.toUpperCase()}
                      </span>
                      <span className="text-sm">{bet.amount.toFixed(4)} ETH</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        Payout: {bet.payout.toFixed(4)} ETH
                      </div>
                      {bet.resolved && (
                        <span className={cn("text-xs", bet.won ? "text-positive" : "text-negative")}>
                          {bet.won ? "Won ✓" : "Lost ✗"}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Trade Panel + Wallet */}
        <div className="space-y-4">
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold mb-4">Trade</h3>

            {market.status !== "active" ? (
              <div className="p-4 rounded-lg bg-muted/10 text-center">
                <AlertTriangle size={20} className="mx-auto text-muted mb-2" />
                <p className="text-sm text-muted">
                  {market.status === "resolved"
                    ? "This market has been resolved"
                    : "This market hasn\u2019t started yet"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Yes/No Toggle */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setChoice("yes")}
                    className={cn(
                      "flex-1 py-3 rounded-lg font-semibold text-sm transition-all",
                      choice === "yes"
                        ? "bg-positive text-white shadow-lg shadow-positive/20"
                        : "bg-positive/10 text-positive border border-positive/20"
                    )}
                  >
                    YES — {odds.yes.toFixed(2)}x
                  </button>
                  <button
                    onClick={() => setChoice("no")}
                    className={cn(
                      "flex-1 py-3 rounded-lg font-semibold text-sm transition-all",
                      choice === "no"
                        ? "bg-negative text-white shadow-lg shadow-negative/20"
                        : "bg-negative/10 text-negative border border-negative/20"
                    )}
                  >
                    NO — {odds.no.toFixed(2)}x
                  </button>
                </div>

                {/* Amount */}
                <div>
                  <label className="text-xs text-muted uppercase tracking-wider mb-1.5 block">
                    Amount (ETH)
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    min={0}
                    step={0.01}
                    className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent/50"
                  />
                  <div className="flex gap-2 mt-2">
                    {[0.1, 0.25, 0.5, 1].map((v) => (
                      <button
                        key={v}
                        onClick={() => setAmount(v.toString())}
                        className="flex-1 text-xs py-1 rounded bg-card border border-border text-muted hover:text-white hover:border-accent/30 transition-all"
                      >
                        {v} ETH
                      </button>
                    ))}
                  </div>
                </div>

                {/* Estimate */}
                <div className="p-3 rounded-lg bg-accent/5 border border-accent/10">
                  <div className="flex justify-between text-xs text-muted mb-1">
                    <span>Est. Payout</span>
                    <span className="text-white font-medium">{estPayout.toFixed(4)} ETH</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted">
                    <span>Profit if Win</span>
                    <span className="text-positive font-medium">
                      +{(estPayout - amountNum).toFixed(4)} ETH
                    </span>
                  </div>
                </div>

                <button
                  onClick={handlePlaceBet}
                  disabled={amountNum <= 0 || amountNum > state.wallet.ethBalance}
                  className={cn(
                    "w-full py-3 rounded-lg font-semibold text-sm transition-all",
                    amountNum > 0 && amountNum <= state.wallet.ethBalance
                      ? choice === "yes"
                        ? "bg-positive text-white hover:bg-positive/90"
                        : "bg-negative text-white hover:bg-negative/90"
                      : "bg-muted/20 text-muted cursor-not-allowed"
                  )}
                >
                  Place Bet — {choice.toUpperCase()}
                </button>

                {amountNum > state.wallet.ethBalance && (
                  <p className="text-xs text-negative text-center">Insufficient balance</p>
                )}
              </div>
            )}

            {/* Demo Resolve */}
            {DEMO && market.status === "active" && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-[10px] text-muted uppercase tracking-wider mb-2">Demo Controls</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleResolve("yes")}
                    className="flex-1 text-xs py-2 rounded bg-positive/10 text-positive border border-positive/20 hover:bg-positive/20 transition-all"
                  >
                    Resolve YES
                  </button>
                  <button
                    onClick={() => handleResolve("no")}
                    className="flex-1 text-xs py-2 rounded bg-negative/10 text-negative border border-negative/20 hover:bg-negative/20 transition-all"
                  >
                    Resolve NO
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Wallet Summary */}
          <div className="glass-card p-6">
            <button
              onClick={() => setShowWallet(!showWallet)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Wallet size={16} className="text-accent" />
                <span className="text-sm font-semibold">Balance Overview</span>
              </div>
              <ChevronDown
                size={16}
                className={cn("text-muted transition-transform", showWallet && "rotate-180")}
              />
            </button>
            {showWallet && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between p-2.5 rounded-lg bg-card">
                  <span className="text-sm text-muted">ETH</span>
                  <span className="text-sm font-medium">{state.wallet.ethBalance.toFixed(4)}</span>
                </div>
                {Object.entries(state.wallet.skinTokens)
                  .filter(([, v]) => v > 0)
                  .slice(0, 4)
                  .map(([assetId, qty]) => {
                    const a = state.assets.find((x) => x.id === assetId);
                    return (
                      <div key={assetId} className="flex justify-between p-2.5 rounded-lg bg-card">
                        <span className="text-sm text-muted">
                          {a?.imageEmoji} {a?.symbol || assetId}
                        </span>
                        <span className="text-sm font-medium">{qty}</span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
