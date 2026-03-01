"use client";

import { useEffect, useRef, useCallback } from "react";
import { useStore } from "@/lib/store";

const PROVIDER = process.env.NEXT_PUBLIC_PRICE_PROVIDER || "mock";
const TICK_MS = PROVIDER === "skinport" ? 5000 : 1500; // slower for live API

/**
 * Unified price simulation hook.
 * - In "mock" mode: uses local random walk (fast, no network)
 * - In "skinport" mode: polls /api/prices/[assetKey] every 5s
 */
export function usePriceFeed() {
  const { state, dispatch } = useStore();
  const assetsRef = useRef(state.assets);
  assetsRef.current = state.assets;

  const tickMock = useCallback(() => {
    assetsRef.current.forEach((asset) => {
      const volatility = 0.003 + Math.random() * 0.005;
      const drift = (Math.random() - 0.48) * volatility;
      const newPrice = Math.max(
        asset.currentPrice * 0.5,
        asset.currentPrice * (1 + drift)
      );
      dispatch({
        type: "UPDATE_ASSET_PRICE",
        assetId: asset.id,
        price: parseFloat(newPrice.toFixed(2)),
      });
    });
  }, [dispatch]);

  const tickApi = useCallback(async () => {
    for (const asset of assetsRef.current) {
      try {
        const res = await fetch(`/api/prices/${asset.id}`);
        if (!res.ok) continue;
        const data = await res.json();
        if (data.price && isFinite(data.price)) {
          dispatch({
            type: "UPDATE_ASSET_PRICE",
            assetId: asset.id,
            price: data.price,
          });
        }
      } catch {
        // API failed — keep existing price, no crash
      }
    }
  }, [dispatch]);

  useEffect(() => {
    const tick = PROVIDER === "skinport" ? tickApi : tickMock;
    // Immediate first tick for API mode
    if (PROVIDER === "skinport") {
      tickApi();
    }
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [tickMock, tickApi]);
}
