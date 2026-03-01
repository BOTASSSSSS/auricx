"use client";

import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Trophy } from "lucide-react";

export default function LeaderboardPage() {
  const { state } = useStore();
  const entries = state.leaderboard;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 border border-accent/30">
          <Trophy size={20} className="text-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Leaderboard</h1>
          <p className="text-sm text-muted">Top traders by PnL performance</p>
        </div>
      </div>

      {/* Top 3 Podium */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {entries.slice(0, 3).map((entry, i) => (
          <div
            key={entry.user}
            className={cn(
              "glass-card p-5 text-center relative overflow-hidden",
              i === 0 && "border-accent/30 shadow-glow"
            )}
          >
            {i === 0 && (
              <div className="absolute inset-0 bg-gradient-to-b from-accent/5 to-transparent pointer-events-none" />
            )}
            <div className="relative">
              <div
                className={cn(
                  "w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center font-bold text-lg",
                  i === 0
                    ? "bg-gradient-to-br from-yellow-400 to-amber-600 text-bg"
                    : i === 1
                    ? "bg-gradient-to-br from-gray-300 to-gray-500 text-bg"
                    : "bg-gradient-to-br from-orange-400 to-orange-700 text-bg"
                )}
              >
                {i + 1}
              </div>
              <div className="font-bold text-sm mb-1">{entry.user}</div>
              <div className="text-xl font-bold text-positive mb-1">
                +${entry.pnl.toLocaleString()}
              </div>
              <div className="text-xs text-muted">
                {entry.winRate}% win rate • {entry.trades} trades
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Full Table */}
      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs text-muted uppercase tracking-wider font-medium px-6 py-3">
                Rank
              </th>
              <th className="text-left text-xs text-muted uppercase tracking-wider font-medium px-6 py-3">
                Trader
              </th>
              <th className="text-right text-xs text-muted uppercase tracking-wider font-medium px-6 py-3">
                PnL
              </th>
              <th className="text-right text-xs text-muted uppercase tracking-wider font-medium px-6 py-3 hidden sm:table-cell">
                Win Rate
              </th>
              <th className="text-right text-xs text-muted uppercase tracking-wider font-medium px-6 py-3 hidden md:table-cell">
                Volume
              </th>
              <th className="text-right text-xs text-muted uppercase tracking-wider font-medium px-6 py-3 hidden md:table-cell">
                Trades
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {entries.map((entry) => (
              <tr
                key={entry.user}
                className="hover:bg-card-hover transition-colors"
              >
                <td className="px-6 py-4">
                  <span
                    className={cn(
                      "inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold",
                      entry.rank === 1
                        ? "bg-yellow-500/20 text-yellow-400"
                        : entry.rank === 2
                        ? "bg-gray-400/20 text-gray-300"
                        : entry.rank === 3
                        ? "bg-orange-500/20 text-orange-400"
                        : "bg-card text-muted"
                    )}
                  >
                    {entry.rank}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent/30 to-cyan-600/30 flex items-center justify-center text-xs font-bold">
                      {entry.user.slice(0, 2)}
                    </div>
                    <span className="font-medium text-sm">{entry.user}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <span
                    className={cn(
                      "font-bold text-sm",
                      entry.pnl >= 0 ? "text-positive" : "text-negative"
                    )}
                  >
                    {entry.pnl >= 0 ? "+" : ""}$
                    {entry.pnl.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </td>
                <td className="px-6 py-4 text-right hidden sm:table-cell">
                  <span
                    className={cn(
                      "text-sm",
                      entry.winRate >= 50 ? "text-positive" : "text-negative"
                    )}
                  >
                    {entry.winRate}%
                  </span>
                </td>
                <td className="px-6 py-4 text-right hidden md:table-cell">
                  <span className="text-sm text-muted">
                    ${entry.volume.toLocaleString()}
                  </span>
                </td>
                <td className="px-6 py-4 text-right hidden md:table-cell">
                  <span className="text-sm text-muted">{entry.trades}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
