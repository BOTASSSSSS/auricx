// ─── Mock Price Feed ─────────────────────────────────────────
// Seeded random walk so each asset gets consistent behavior

import { PriceFeedProvider, PricePoint } from "./types";

// Simple seeded PRNG (mulberry32)
function seededRng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

// Base prices for known assets (fallback for unknown)
const BASE_PRICES: Record<string, number> = {
  "ak47-redline": 34.5,
  "awp-asiimov": 72.8,
  "m9-doppler": 520,
  "vice-gloves": 890,
  "butterfly-fade": 1250,
  "m4a1-printstream": 105,
};

// In-memory price state per asset
const priceState: Map<string, { current: number; history: PricePoint[] }> = new Map();

function getOrInit(assetKey: string): { current: number; history: PricePoint[] } {
  if (priceState.has(assetKey)) return priceState.get(assetKey)!;

  const base = BASE_PRICES[assetKey] || 50 + Math.abs(hashString(assetKey) % 500);
  const rng = seededRng(hashString(assetKey));
  const now = Date.now();
  const history: PricePoint[] = [];
  let price = base;

  // Generate 60 historical points (1.5s apart = ~90s of history)
  for (let i = 59; i >= 0; i--) {
    const volatility = 0.003 + rng() * 0.005;
    const drift = (rng() - 0.48) * volatility;
    price = Math.max(base * 0.5, price * (1 + drift));
    price = parseFloat(price.toFixed(2));
    history.push({ price, ts: now - i * 1500, source: "mock" });
  }

  const state = { current: price, history };
  priceState.set(assetKey, state);
  return state;
}

export const MockPriceFeed: PriceFeedProvider = {
  name: "mock",

  async getPrice(assetKey: string): Promise<PricePoint> {
    const state = getOrInit(assetKey);
    // Advance price with random walk
    const volatility = 0.003 + Math.random() * 0.005;
    const drift = (Math.random() - 0.48) * volatility;
    const base = BASE_PRICES[assetKey] || 50;
    state.current = Math.max(base * 0.5, state.current * (1 + drift));
    state.current = parseFloat(state.current.toFixed(2));

    const point: PricePoint = { price: state.current, ts: Date.now(), source: "mock" };
    state.history.push(point);
    if (state.history.length > 200) state.history = state.history.slice(-200);

    return point;
  },

  async getHistory(assetKey: string, points = 60): Promise<PricePoint[]> {
    const state = getOrInit(assetKey);
    return state.history.slice(-points);
  },
};
