// ─── Market Types ───────────────────────────────────────────
export type MarketType = "prediction_winner" | "prediction_overunder" | "perp_index" | "binary";
export type MarketStatus = "active" | "upcoming" | "resolved";

export interface Market {
  id: string;
  type: MarketType;
  title: string;
  description: string;
  status: MarketStatus;
  createdAt: number;
  expiresAt: number;
  // Prediction / Binary
  odds?: { yes: number; no: number };
  outcome?: "yes" | "no" | null;
  // Binary-specific
  teamA?: string;
  teamB?: string;
  // Perp-specific
  assetId?: string;
  // Shared
  totalVolume: number;
  imageUrl?: string;
  iconPath?: string; // e.g. "/icons/teams/navi.svg"
}

// ─── Asset / Perp Index Types ───────────────────────────────
export interface Asset {
  id: string;
  name: string;
  symbol: string;
  category: string;
  currentPrice: number;
  priceChange24h: number;
  priceHistory: number[];
  imageEmoji: string;
  iconPath?: string; // e.g. "/icons/weapons/rifle.svg"
  skinportName?: string; // Skinport market_hash_name for live pricing
}

// ─── Trading Types ──────────────────────────────────────────
export type Side = "long" | "short";

export interface Position {
  id: string;
  assetId: string;
  side: Side;
  size: number;
  leverage: number;
  entryPrice: number;
  isOpen: boolean;
  isClosedPayoutDone: boolean;
  pnl: number;
  openedAt: number;
  closedAt?: number;
}

export interface Bet {
  id: string;
  marketId: string;
  choice: "yes" | "no";
  amount: number;
  odds: number;
  payout: number;
  resolved: boolean;
  won?: boolean;
  placedAt: number;
}

// ─── Wallet Types ───────────────────────────────────────────
export interface Wallet {
  ethBalance: number;
  skinTokens: Record<string, number>;
}

// ─── Leaderboard Types ──────────────────────────────────────
export interface LeaderboardEntry {
  rank: number;
  user: string;
  pnl: number;
  winRate: number;
  volume: number;
  trades: number;
}

// ─── App State ──────────────────────────────────────────────
export interface AppState {
  markets: Market[];
  assets: Asset[];
  positions: Position[];
  bets: Bet[];
  wallet: Wallet;
  leaderboard: LeaderboardEntry[];
}

// ─── Team presets ───────────────────────────────────────────
export const CS2_TEAMS = [
  { id: "navi", name: "NAVI", logo: "/icons/teams/navi.svg" },
  { id: "furia", name: "FURIA", logo: "/icons/teams/furia.svg" },
  { id: "g2", name: "G2 Esports", logo: "/icons/teams/g2.svg" },
  { id: "vitality", name: "Vitality", logo: "/icons/teams/vitality.svg" },
  { id: "faze", name: "FaZe Clan", logo: "/icons/teams/faze.svg" },
  { id: "liquid", name: "Team Liquid", logo: "/icons/teams/liquid.svg" },
  { id: "mouz", name: "MOUZ", logo: "/icons/teams/mouz.svg" },
  { id: "heroic", name: "Heroic", logo: "/icons/teams/heroic.svg" },
  { id: "falcons", name: "Falcons", logo: "/icons/teams/falcons.svg" },
  { id: "spirit", name: "Team Spirit", logo: "/icons/teams/spirit.svg" },
] as const;

// ─── Category → icon mapping ────────────────────────────────
export function getCategoryIcon(category: string): string {
  switch (category.toLowerCase()) {
    case "rifle": return "/icons/weapons/rifle.svg";
    case "awp":
    case "sniper": return "/icons/weapons/awp.svg";
    case "knife": return "/icons/weapons/knife.svg";
    case "gloves": return "/icons/weapons/gloves.svg";
    default: return "/icons/weapons/default.svg";
  }
}
