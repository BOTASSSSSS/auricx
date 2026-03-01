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
