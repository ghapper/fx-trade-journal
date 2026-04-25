"use client";
// src/hooks/useSampleData.ts
import { useState } from "react";
import { useAppStore } from "@/store";
import { SAMPLE_TRADES } from "@/lib/utils/sampleData";
import toast from "react-hot-toast";

export function useSampleData() {
  const { saveTrade, tradeGroups } = useAppStore();
  const [loading, setLoading] = useState(false);

  const hasSample = tradeGroups.some((tg) =>
    SAMPLE_TRADES.some((s) => s.id === tg.id)
  );

  const loadSample = async () => {
    if (hasSample) return;
    setLoading(true);
    try {
      for (const tg of SAMPLE_TRADES) {
        await saveTrade(tg);
      }
      toast.success("サンプルデータを読み込みました");
    } catch {
      toast.error("サンプルデータの読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return { loadSample, loading, hasSample };
}
