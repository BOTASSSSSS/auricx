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
