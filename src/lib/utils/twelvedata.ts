// src/lib/utils/twelvedata.ts
import type { OhlcBar } from "@/types";

const API_KEY = process.env.NEXT_PUBLIC_TWELVEDATA_API_KEY;
const BASE_URL = "https://api.twelvedata.com";

export type AssetClass = "forex" | "stock" | "crypto";

const TF_MAP: Record<string, string> = {
  "1m": "1min",
  "5m": "5min",
  "10m": "10min",
  "15m": "15min",
  "30m": "30min",
  "1h": "1h",
  "4h": "4h",
};

export function detectAssetClass(symbol: string): AssetClass {
  const upper = symbol.toUpperCase();
  if (upper.includes("BTC") || upper.includes("ETH") || upper.includes("XRP") ||
      upper.includes("SOL") || upper.includes("ADA") || upper.includes("/USD") ||
      upper.includes("/USDT")) return "crypto";
  if (/^[A-Z]{6}$/.test(upper) || upper.includes("JPY") || upper.includes("EUR") ||
      upper.includes("GBP") || upper.includes("AUD") || upper.includes("NZD")) return "forex";
  return "stock";
}

function formatSymbol(symbol: string, assetClass: AssetClass): string {
  const upper = symbol.toUpperCase();
  if (assetClass === "forex" && upper.length === 6 && !upper.includes("/")) {
    return `${upper.slice(0, 3)}/${upper.slice(3)}`;
  }
  return upper;
}

export interface FetchOhlcOptions {
  symbol: string;
  timeframe?: string;
  outputSize?: number;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
}

export async function fetchOhlcFromTwelveData(
  options: FetchOhlcOptions
): Promise<{ bars: OhlcBar[]; error?: string }> {
  const { symbol, timeframe = "1m", outputSize = 500, startDate, endDate } = options;

  if (!API_KEY) return { bars: [], error: "APIキーが設定されていません" };

  const assetClass = detectAssetClass(symbol);
  const formattedSymbol = formatSymbol(symbol, assetClass);
  const interval = TF_MAP[timeframe] ?? "1min";

  const params: Record<string, string> = {
    symbol: formattedSymbol,
    interval,
    outputsize: String(outputSize),
    apikey: API_KEY,
    format: "JSON",
  };

  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;

  try {
    const res = await fetch(`${BASE_URL}/time_series?${new URLSearchParams(params)}`);
    const data = await res.json();

    if (data.status === "error") return { bars: [], error: data.message ?? "APIエラー" };
    if (!data.values || !Array.isArray(data.values)) return { bars: [], error: "データが取得できませんでした" };

    const bars: OhlcBar[] = data.values
      .map((v: Record<string, string>) => ({
        time: Math.floor(new Date(v.datetime).getTime() / 1000),
        open: parseFloat(v.open),
        high: parseFloat(v.high),
        low: parseFloat(v.low),
        close: parseFloat(v.close),
        volume: v.volume ? parseFloat(v.volume) : undefined,
      }))
      .filter((b: OhlcBar) => !isNaN(b.open))
      .sort((a: OhlcBar, b: OhlcBar) => a.time - b.time);

    return { bars };
  } catch {
    return { bars: [], error: "ネットワークエラー" };
  }
}

// トレード日時の前後3日分を取得する日付範囲を計算
export function getDateRangeForTrade(tradeDatetime: string): { startDate: string; endDate: string } {
  const tradeDate = new Date(tradeDatetime);
  const start = new Date(tradeDate);
  start.setDate(start.getDate() - 3);
  const end = new Date(tradeDate);
  end.setDate(end.getDate() + 3);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}
