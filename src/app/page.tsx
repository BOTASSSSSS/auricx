"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { usePriceFeed } from "@/lib/usePriceFeed";
import { MarketCard } from "@/components/MarketCard";
import { CreateMarketDialog } from "@/components/CreateMarketDialog";
import { MarketStatus } from "@/lib/types";
import { Plus, Crosshair, TrendingUp } from "lucide-react";

const TABS: { value: MarketStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "upcoming", label: "Upcoming" },
  { value: "resolved", label: "Resolved" },
];

export default function HomePage() {
  const { state } = useStore();
  const [tab, setTab] = useState<MarketStatus>("active");
  const [createOpen, setCreateOpen] = useState(false);

  usePriceFeed();

  const filtered = state.markets.filter((m) => m.status === tab);

  return (
    <div>
      {/* Hero */}
      <section className="relative mb-10 py-12 text-center">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-accent/5 rounded-full blur-[120px]" />
        </div>
        <div className="flex items-center justify-center gap-2 mb-4">
          <Crosshair size={20} className="text-accent" />
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            CS2 Trading Platform
          </span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold mb-4 leading-tight">
          Predict the Next
          <br />
          <span className="text-gradient">CS2 Champion</span>
        </h1>
        <p className="text-muted text-sm sm:text-base max-w-xl mx-auto mb-6">
          Trade CS2 skin perpetuals and prediction markets. Long or short skin indexes,
          bet on tournament outcomes — all powered by AURICX.
        </p>
        <div className="flex items-center justify-center gap-3">
          <a href="#markets" className="btn-primary inline-flex items-center gap-2">
            <TrendingUp size={16} />
            Trade Now
          </a>
          <button onClick={() => setCreateOpen(true)} className="btn-outline inline-flex items-center gap-2">
            <Plus size={16} />
            Create Market
          </button>
        </div>
      </section>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total Markets", value: state.markets.length.toString() },
          {
            label: "Total Volume",
            value: `$${(state.markets.reduce((s, m) => s + m.totalVolume, 0) / 1000).toFixed(0)}K`,
          },
          { label: "Active Traders", value: state.leaderboard.length.toString() },
        ].map(({ label, value }) => (
          <div key={label} className="glass-card p-4 text-center">
            <div className="text-xl sm:text-2xl font-bold text-accent">{value}</div>
            <div className="text-xs text-muted mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div id="markets" className="flex items-center justify-between mb-6">
        <div className="flex gap-1 bg-card rounded-lg p-1 border border-border">
          {TABS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                tab === value
                  ? "bg-accent/15 text-accent"
                  : "text-muted hover:text-white"
              }`}
            >
              {label}
              <span className="ml-1.5 text-xs opacity-60">
                ({state.markets.filter((m) => m.status === value).length})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Market Grid */}
      {filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-muted">No {tab} markets found.</p>
          <button onClick={() => setCreateOpen(true)} className="btn-outline mt-4 text-sm">
            Create One
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      )}

      <CreateMarketDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
