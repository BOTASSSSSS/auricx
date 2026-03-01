import { Market, Asset, Wallet, LeaderboardEntry } from "./types";

const now = Date.now();
const hours = (h: number) => h * 60 * 60 * 1000;

function generateSparkline(base: number, points = 50, volatility = 0.02): number[] {
  const data: number[] = [base];
  for (let i = 1; i < points; i++) {
    const change = (Math.random() - 0.48) * volatility * base;
    data.push(Math.max(base * 0.7, data[i - 1] + change));
  }
  return data.map((v) => parseFloat(v.toFixed(2)));
}

// ─── Assets ─────────────────────────────────────────────────
export const INITIAL_ASSETS: Asset[] = [
  {
    id: "ak47-redline",
    name: "AK-47 Redline",
    symbol: "AK-RL",
    category: "Rifle",
    currentPrice: 34.50,
    priceChange24h: 2.9,
    priceHistory: generateSparkline(34.5),
    imageEmoji: "🔴",
    iconPath: "/icons/weapons/rifle.svg",
    skinportName: "AK-47 | Redline (Field-Tested)",
  },
  {
    id: "awp-asiimov",
    name: "AWP Asiimov",
    symbol: "AWP-AS",
    category: "Rifle",
    currentPrice: 72.80,
    priceChange24h: -1.4,
    priceHistory: generateSparkline(72.8),
    imageEmoji: "🟠",
    iconPath: "/icons/weapons/awp.svg",
    skinportName: "AWP | Asiimov (Field-Tested)",
  },
  {
    id: "m9-doppler",
    name: "M9 Bayonet Doppler",
    symbol: "M9-DP",
    category: "Knife",
    currentPrice: 520.00,
    priceChange24h: 4.2,
    priceHistory: generateSparkline(520, 50, 0.015),
    imageEmoji: "🔪",
    iconPath: "/icons/weapons/knife.svg",
    skinportName: "★ M9 Bayonet | Doppler (Factory New)",
  },
  {
    id: "vice-gloves",
    name: "Sport Gloves Vice",
    symbol: "GL-VC",
    category: "Gloves",
    currentPrice: 890.00,
    priceChange24h: -0.8,
    priceHistory: generateSparkline(890, 50, 0.012),
    imageEmoji: "🧤",
    iconPath: "/icons/weapons/gloves.svg",
    skinportName: "★ Sport Gloves | Vice (Minimal Wear)",
  },
  {
    id: "butterfly-fade",
    name: "Butterfly Knife Fade",
    symbol: "BF-FD",
    category: "Knife",
    currentPrice: 1250.00,
    priceChange24h: 1.7,
    priceHistory: generateSparkline(1250, 50, 0.018),
    imageEmoji: "🦋",
    iconPath: "/icons/weapons/knife.svg",
    skinportName: "★ Butterfly Knife | Fade (Factory New)",
  },
  {
    id: "m4a1-printstream",
    name: "M4A1-S Printstream",
    symbol: "M4-PS",
    category: "Rifle",
    currentPrice: 105.00,
    priceChange24h: 5.1,
    priceHistory: generateSparkline(105, 50, 0.025),
    imageEmoji: "🖨️",
    iconPath: "/icons/weapons/rifle.svg",
    skinportName: "M4A1-S | Printstream (Field-Tested)",
  },
];

// ─── Markets ────────────────────────────────────────────────
export const INITIAL_MARKETS: Market[] = [
  // Binary / Winner markets
  {
    id: "mkt-1",
    type: "binary",
    title: "NAVI vs FURIA — IEM Katowice Semi",
    description: "Who wins the semifinal? YES = NAVI, NO = FURIA.",
    status: "active",
    createdAt: now - hours(12),
    expiresAt: now + hours(48),
    odds: { yes: 2.12, no: 1.65 },
    outcome: null,
    teamA: "NAVI",
    teamB: "FURIA",
    iconPath: "/icons/teams/navi.svg",
    totalVolume: 15420,
  },
  {
    id: "mkt-2",
    type: "binary",
    title: "G2 vs Vitality — Grand Final",
    description: "Who takes the IEM Katowice 2026 trophy? YES = G2, NO = Vitality.",
    status: "active",
    createdAt: now - hours(6),
    expiresAt: now + hours(72),
    odds: { yes: 1.85, no: 2.05 },
    outcome: null,
    teamA: "G2 Esports",
    teamB: "Vitality",
    iconPath: "/icons/teams/g2.svg",
    totalVolume: 28300,
  },
  {
    id: "mkt-3",
    type: "binary",
    title: "NAVI vs FURIA — Over 2.5 Maps?",
    description: "Will the series go to 3 maps? YES = Over, NO = Under.",
    status: "upcoming",
    createdAt: now,
    expiresAt: now + hours(96),
    odds: { yes: 1.90, no: 1.90 },
    outcome: null,
    totalVolume: 4200,
  },
  {
    id: "mkt-4",
    type: "binary",
    title: "FaZe vs Liquid — Quarter Final",
    description: "Quarter final prediction. YES = FaZe, NO = Liquid.",
    status: "resolved",
    createdAt: now - hours(120),
    expiresAt: now - hours(24),
    odds: { yes: 1.72, no: 2.30 },
    outcome: "yes",
    teamA: "FaZe Clan",
    teamB: "Team Liquid",
    iconPath: "/icons/teams/faze.svg",
    totalVolume: 32100,
  },
  {
    id: "mkt-b1",
    type: "binary",
    title: "AK-47 Redline > $40 by end of week?",
    description: "Will AK-47 Redline price exceed $40 USD this week?",
    status: "active",
    createdAt: now - hours(24),
    expiresAt: now + hours(120),
    odds: { yes: 2.50, no: 1.55 },
    outcome: null,
    iconPath: "/icons/weapons/rifle.svg",
    totalVolume: 8700,
  },
  // Perp index markets
  {
    id: "mkt-5",
    type: "perp_index",
    title: "AK-47 Redline Index",
    description: "Perpetual index tracking AK-47 Redline skin market price.",
    status: "active",
    createdAt: now - hours(240),
    expiresAt: now + hours(8760),
    assetId: "ak47-redline",
    iconPath: "/icons/weapons/rifle.svg",
    totalVolume: 89500,
  },
  {
    id: "mkt-6",
    type: "perp_index",
    title: "AWP Asiimov Index",
    description: "Perpetual index tracking AWP Asiimov skin market price.",
    status: "active",
    createdAt: now - hours(200),
    expiresAt: now + hours(8760),
    assetId: "awp-asiimov",
    iconPath: "/icons/weapons/awp.svg",
    totalVolume: 64200,
  },
  {
    id: "mkt-7",
    type: "perp_index",
    title: "M9 Bayonet Doppler Index",
    description: "Perpetual index tracking M9 Bayonet Doppler skin price.",
    status: "active",
    createdAt: now - hours(180),
    expiresAt: now + hours(8760),
    assetId: "m9-doppler",
    iconPath: "/icons/weapons/knife.svg",
    totalVolume: 142000,
  },
  {
    id: "mkt-8",
    type: "perp_index",
    title: "Butterfly Knife Fade Index",
    description: "Perpetual index tracking Butterfly Knife Fade skin price.",
    status: "active",
    createdAt: now - hours(160),
    expiresAt: now + hours(8760),
    assetId: "butterfly-fade",
    iconPath: "/icons/weapons/knife.svg",
    totalVolume: 210000,
  },
];

// ─── Wallet ─────────────────────────────────────────────────
export const INITIAL_WALLET: Wallet = {
  ethBalance: 5.0,
  skinTokens: {
    "ak47-redline": 12,
    "m9-doppler": 2,
    "vice-gloves": 1,
    "awp-asiimov": 5,
  },
};

// ─── Leaderboard ────────────────────────────────────────────
export const INITIAL_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, user: "0xDegen_Alpha", pnl: 12450.80, winRate: 72.3, volume: 89200, trades: 156 },
  { rank: 2, user: "SkinFlipKing", pnl: 8920.50, winRate: 68.1, volume: 67400, trades: 203 },
  { rank: 3, user: "NaViHopium", pnl: 6340.20, winRate: 61.5, volume: 54300, trades: 98 },
  { rank: 4, user: "AWPer_Hand", pnl: 4210.00, winRate: 58.9, volume: 41200, trades: 134 },
  { rank: 5, user: "KnifeBaron", pnl: 3890.40, winRate: 55.2, volume: 38900, trades: 87 },
  { rank: 6, user: "GloveMaster", pnl: 2150.90, winRate: 52.8, volume: 29100, trades: 112 },
  { rank: 7, user: "RedlineRunner", pnl: 1820.30, winRate: 50.1, volume: 22400, trades: 76 },
  { rank: 8, user: "FadeChaser", pnl: 980.60, winRate: 48.7, volume: 18300, trades: 64 },
  { rank: 9, user: "DopplerDave", pnl: 420.10, winRate: 46.3, volume: 14200, trades: 52 },
  { rank: 10, user: "SilverSurfer", pnl: -180.40, winRate: 42.1, volume: 11500, trades: 41 },
];
