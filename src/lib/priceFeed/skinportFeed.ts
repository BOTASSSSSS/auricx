// ─── Skinport Price Feed (SERVER-SIDE ONLY) ──────────────────
// Uses Skinport Items API with app_id/app_secret auth
// Docs: https://docs.skinport.com/#items
//
// This module runs ONLY on the server (API routes).
// Client fetches via /api/prices/[assetKey] or /api/skinport/prices

import { PriceFeedProvider, PricePoint, ASSET_SKINPORT_MAP } from "./types";

// ─── In-memory cache (15s TTL) ──────────────────────────────
interface CacheEntry {
  data: Record<string, number>; // market_hash_name → price
  ts: number;
}

let cache: CacheEntry | null = null;
const CACHE_TTL = 15_000; // 15 seconds

// Price history kept in server memory (resets on restart)
const historyMap: Map<string, PricePoint[]> = new Map();

async function fetchSkinportPrices(): Promise<Record<string, number>> {
  // Return cache if fresh
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return cache.data;
  }

  const appId = process.env.SKINPORT_APP_ID;
  const appSecret = process.env.SKINPORT_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error("SKINPORT_APP_ID and SKINPORT_APP_SECRET are required");
  }

  // Skinport Items endpoint — returns all items with prices
  // Auth: Basic auth with app_id:app_secret
  const credentials = Buffer.from(`${appId}:${appSecret}`).toString("base64");

  const res = await fetch("https://api.skinport.com/v1/items?app_id=730&currency=USD", {
    headers: {
      Authorization: `Basic ${credentials}`,
      Accept: "application/json",
    },
    next: { revalidate: 15 }, // Next.js fetch cache
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Skinport API ${res.status}: ${text}`);
  }

  const items: Array<{
    market_hash_name: string;
    suggested_price: number;
    min_price: number | null;
    max_price: number | null;
  }> = await res.json();

  // Build price map
  const priceMap: Record<string, number> = {};
  for (const item of items) {
    // Use suggested_price, fall back to min_price
    const price = item.suggested_price || item.min_price || 0;
    if (price > 0) {
      priceMap[item.market_hash_name] = price;
    }
  }

  cache = { data: priceMap, ts: Date.now() };
  return priceMap;
}

function pushHistory(assetKey: string, point: PricePoint) {
  const arr = historyMap.get(assetKey) || [];
  arr.push(point);
  if (arr.length > 200) arr.splice(0, arr.length - 200);
  historyMap.set(assetKey, arr);
}

export const SkinportPriceFeed: PriceFeedProvider = {
  name: "skinport",

  async getPrice(assetKey: string): Promise<PricePoint> {
    const hashName = ASSET_SKINPORT_MAP[assetKey];
    if (!hashName) {
      throw new Error(`No Skinport mapping for asset: ${assetKey}`);
    }

    const prices = await fetchSkinportPrices();
    const price = prices[hashName];

    if (!price || price <= 0) {
      throw new Error(`No price found for ${hashName}`);
    }

    const point: PricePoint = { price, ts: Date.now(), source: "skinport" };
    pushHistory(assetKey, point);
    return point;
  },

  async getHistory(assetKey: string, points = 60): Promise<PricePoint[]> {
    const arr = historyMap.get(assetKey) || [];
    // If we don't have enough history, fetch current price to seed
    if (arr.length === 0) {
      try {
        await this.getPrice(assetKey);
      } catch {
        // ignore
      }
    }
    return (historyMap.get(assetKey) || []).slice(-points);
  },
};

// ─── Bulk fetch helper for API routes ────────────────────────
export async function getSkinportBulkPrices(): Promise<Record<string, number>> {
  return fetchSkinportPrices();
}
