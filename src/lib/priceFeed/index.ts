// ─── Price Feed Index ────────────────────────────────────────
// Use getProvider() to get the active price feed

export type { PricePoint, PriceFeedProvider } from "./types";
export { ASSET_SKINPORT_MAP, SKINPORT_TO_ASSET } from "./types";
export { MockPriceFeed } from "./mockFeed";

// NOTE: SkinportPriceFeed is server-only; import it directly in API routes
// import { SkinportPriceFeed } from "@/lib/priceFeed/skinportFeed";

import { PriceFeedProvider } from "./types";
import { MockPriceFeed } from "./mockFeed";

/** Get the active provider (safe for both client and server) */
export function getProvider(): PriceFeedProvider {
  // On client side, always return mock (actual prices come via API fetch)
  if (typeof window !== "undefined") return MockPriceFeed;

  const env = process.env.NEXT_PUBLIC_PRICE_PROVIDER || "mock";
  if (env === "skinport") {
    // Dynamic import would be async, so for server sync use we lazy-require
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { SkinportPriceFeed } = require("./skinportFeed");
    return SkinportPriceFeed as PriceFeedProvider;
  }
  return MockPriceFeed;
}
