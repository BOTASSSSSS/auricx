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
