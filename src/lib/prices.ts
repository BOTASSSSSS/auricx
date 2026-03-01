// ─── Price Layer ─────────────────────────────────────────────
// Provides consistent Index and Mark prices for the perps system.
// Index = raw asset price from the store (updated by price feed).
// Mark  = Index + small deterministic spread (simulates exchange mark price).

import { Asset } from "./types";
import { safeNum } from "./utils";

/**
 * Get the index price for an asset (the "spot" price).
 */
export function getIndexPrice(asset: Asset): number {
  return safeNum(asset.currentPrice);
}

/**
 * Deterministic spread based on assetId hash.
 * Returns a value in [-0.0015, +0.0015] range (±0.15% max).
 */
function spreadForAsset(assetId: string, ts: number): number {
  let h = 0;
  for (let i = 0; i < assetId.length; i++) {
    h = (Math.imul(31, h) + assetId.charCodeAt(i)) | 0;
  }
  // Use timestamp to make it slowly oscillate (period ~30s)
  const phase = Math.sin((ts / 30000) + (h & 0xffff));
  return phase * 0.0015;
}

/**
 * Get the mark price for an asset.
 * Mark = Index * (1 + spread).
 * This is used for PnL calculation and liquidation checks.
 */
export function getMarkPrice(asset: Asset): number {
  const index = getIndexPrice(asset);
  if (index <= 0) return 0;
  const spread = spreadForAsset(asset.id, Date.now());
  return safeNum(index * (1 + spread));
}

/**
 * Get both prices at once (avoids double computation).
 */
export function getPrices(asset: Asset): { index: number; mark: number } {
  const index = getIndexPrice(asset);
  if (index <= 0) return { index: 0, mark: 0 };
  const spread = spreadForAsset(asset.id, Date.now());
  return {
    index: safeNum(index),
    mark: safeNum(index * (1 + spread)),
  };
}
