import { NextResponse } from "next/server";
import { ASSET_SKINPORT_MAP } from "@/lib/priceFeed";

export const dynamic = "force-dynamic";

export async function GET() {
  const appId = process.env.SKINPORT_APP_ID;
  const appSecret = process.env.SKINPORT_APP_SECRET;

  if (!appId || !appSecret) {
    return NextResponse.json(
      { error: "Skinport credentials not configured. Set SKINPORT_APP_ID and SKINPORT_APP_SECRET in .env.local" },
      { status: 503 }
    );
  }

  try {
    const credentials = Buffer.from(`${appId}:${appSecret}`).toString("base64");

    const res = await fetch("https://api.skinport.com/v1/items?app_id=730&currency=USD", {
      headers: {
        Authorization: `Basic ${credentials}`,
        Accept: "application/json",
      },
      next: { revalidate: 15 },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Skinport API error: ${res.status}`, detail: text },
        { status: res.status }
      );
    }

    const items: Array<{
      market_hash_name: string;
      suggested_price: number;
      min_price: number | null;
    }> = await res.json();

    // Filter to only our mapped assets
    const relevant = new Set(Object.values(ASSET_SKINPORT_MAP));
    const prices: Record<string, { price: number; market_hash_name: string }> = {};

    for (const item of items) {
      if (relevant.has(item.market_hash_name)) {
        const price = item.suggested_price || item.min_price || 0;
        // Find our asset key
        const assetKey = Object.entries(ASSET_SKINPORT_MAP).find(
          ([, v]) => v === item.market_hash_name
        )?.[0];
        if (assetKey && price > 0) {
          prices[assetKey] = { price, market_hash_name: item.market_hash_name };
        }
      }
    }

    return NextResponse.json({
      provider: "skinport",
      ts: Date.now(),
      prices,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Fetch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
