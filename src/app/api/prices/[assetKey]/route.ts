import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "@/lib/priceFeed";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assetKey: string }> }
) {
  const { assetKey } = await params;

  try {
    const provider = getProvider();
    const pricePoint = await provider.getPrice(assetKey);
    const history = await provider.getHistory(assetKey, 100);

    return NextResponse.json({
      assetKey,
      price: pricePoint.price,
      ts: pricePoint.ts,
      source: pricePoint.source,
      history: history.map((p) => ({ price: p.price, ts: p.ts })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
