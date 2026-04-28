// src/lib/utils/twelvedata.ts

import type { OhlcBar } from "@/types";

const API_KEY = process.env.NEXT_PUBLIC_TWELVEDATA_API_KEY;
const BASE_URL = "https://api.twelvedata.com";

// 資産クラス
export type AssetClass = "forex" | "stock" | "crypto";

// 時間足のマッピング
const TF_MAP: Record<string, string> = {
  "1m": "1min",
  "5m": "5min",
  "10m": "10min",
  "15m": "15min",
  "30m": "30min",
  "1h": "1h",
  "4h": "4h",
};

// シンボルを資産クラスから判定
export function detectAssetClass(symbol: string): AssetClass {
  const upper = symbol.toUpperCase();
  // クリプト: BTC/USD, ETH/USD など
  if (upper.includes("BTC") || upper.includes("ETH") || upper.includes("XRP") ||
      upper.includes("SOL") || upper.includes("ADA") || upper.includes("/USD") ||
      upper.includes("/USDT")) {
    return "crypto";
  }
  // FX: USDJPY, EURUSD など (6文字の通貨ペア)
  if (/^[A-Z]{6}$/.test(upper) || upper.includes("JPY") || upper.includes("EUR") ||
      upper.includes("GBP") || upper.includes("AUD") || upper.includes("NZD")) {
    return "forex";
  }
  // それ以外は株式
  return "stock";
}

// シンボルをTwelve Data形式に変換
function formatSymbol(symbol: string, assetClass: AssetClass): string {
  const upper = symbol.toUpperCase();
  if (assetClass === "forex") {
    // USDJPY → USD/JPY
    if (upper.length === 6 && !upper.includes("/")) {
      return `${upper.slice(0, 3)}/${upper.slice(3)}`;
    }
  }
  return upper;
}

export interface FetchOhlcOptions {
  symbol: string;
  timeframe?: string; // "1m", "5m" など
  outputSize?: number; // 取得本数（最大5000）
}

export async function fetchOhlcFromTwelveData(
  options: FetchOhlcOptions
): Promise<{ bars: OhlcBar[]; error?: string }> {
  const { symbol, timeframe = "5m", outputSize = 500 } = options;

  if (!API_KEY) {
    return { bars: [], error: "APIキーが設定されていません" };
  }

  const assetClass = detectAssetClass(symbol);
  const formattedSymbol = formatSymbol(symbol, assetClass);
  const interval = TF_MAP[timeframe] ?? "5min";

  const params = new URLSearchParams({
    symbol: formattedSymbol,
    interval,
    outputsize: String(outputSize),
    apikey: API_KEY,
    format: "JSON",
  });

  try {
    const res = await fetch(`${BASE_URL}/time_series?${params}`);
    const data = await res.json();

    if (data.status === "error") {
      return { bars: [], error: data.message ?? "APIエラー" };
    }

    if (!data.values || !Array.isArray(data.values)) {
      return { bars: [], error: "データが取得できませんでした" };
    }

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
  } catch (e) {
    return { bars: [], error: "ネットワークエラー" };
  }
}

// キャッシュの有効期限チェック（1時間）
export function isOhlcCacheValid(pair: string): boolean {
  try {
    const key = `ohlc_cache_time_${pair}`;
    const stored = localStorage.getItem(key);
    if (!stored) return false;
    const savedAt = parseInt(stored);
    const oneHour = 60 * 60 * 1000;
    return Date.now() - savedAt < oneHour;
  } catch {
    return false;
  }
}

export function markOhlcCacheTime(pair: string): void {
  try {
    localStorage.setItem(`ohlc_cache_time_${pair}`, String(Date.now()));
  } catch {}
}
