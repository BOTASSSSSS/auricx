"use client";

import { useEffect, useRef, useCallback } from "react";
import { useStore } from "@/lib/store";

export function usePriceSimulation() {
  const { state, dispatch } = useStore();
  const assetsRef = useRef(state.assets);
  assetsRef.current = state.assets;

  const tick = useCallback(() => {
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

  useEffect(() => {
    const id = setInterval(tick, 1500);
    return () => clearInterval(id);
  }, [tick]);
}
