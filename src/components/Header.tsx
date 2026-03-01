"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { Wallet, Trophy, TrendingUp, Home } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Markets", icon: Home },
  { href: "/trade/perps/ak47-redline", label: "Trade", icon: TrendingUp },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
];

export function Header() {
  const pathname = usePathname();
  const { state } = useStore();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 border border-accent/30 group-hover:shadow-glow transition-shadow">
            <span className="text-accent font-bold text-sm font-sora">AX</span>
          </div>
          <span className="font-sora font-bold text-lg tracking-tight hidden sm:block">
            AURIC<span className="text-accent">X</span>
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname.startsWith(href.split("/").slice(0, 2).join("/"));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "text-accent bg-accent/10"
                    : "text-muted hover:text-white hover:bg-white/5"
                )}
              >
                <Icon size={16} />
                <span className="hidden md:inline">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Wallet Badge */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border text-sm">
            <div className="w-2 h-2 rounded-full bg-positive animate-pulse" />
            <span className="text-muted">ETH</span>
            <span className="font-semibold">{state.wallet.ethBalance.toFixed(2)}</span>
          </div>
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-accent to-cyan-400 flex items-center justify-center text-bg font-bold text-xs">
            G
          </div>
        </div>
      </div>
    </header>
  );
}
