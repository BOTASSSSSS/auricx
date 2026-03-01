// ─── Price Feed Interface ────────────────────────────────────
// Unified interface for all price data sources

export interface PricePoint {
  price: number;
  ts: number;       // unix ms
  source: "mock" | "skinport" | "cache";
}

export interface PriceFeedProvider {
  /** Get current price for an asset key */
  getPrice(assetKey: string): Promise<PricePoint>;
  /** Get price history for charts */
  getHistory(assetKey: string, points?: number): Promise<PricePoint[]>;
  /** Provider name */
  readonly name: string;
}

// ─── Asset key → Skinport market_hash_name mapping ──────────
export const ASSET_SKINPORT_MAP: Record<string, string> = {
  "ak47-redline":     "AK-47 | Redline (Field-Tested)",
  "awp-asiimov":      "AWP | Asiimov (Field-Tested)",
  "m9-doppler":       "★ M9 Bayonet | Doppler (Factory New)",
  "vice-gloves":      "★ Sport Gloves | Vice (Minimal Wear)",
  "butterfly-fade":   "★ Butterfly Knife | Fade (Factory New)",
  "m4a1-printstream": "M4A1-S | Printstream (Field-Tested)",
};

// Reverse map for lookups
export const SKINPORT_TO_ASSET: Record<string, string> = Object.fromEntries(
  Object.entries(ASSET_SKINPORT_MAP).map(([k, v]) => [v, k])
);
