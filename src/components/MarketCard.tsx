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
