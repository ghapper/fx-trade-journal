// src/lib/utils/index.ts
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import type { ReconstructedTrade, DailyStats, PairStats } from "@/types";

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function formatDatetime(iso: string, fmt = "MM/dd HH:mm"): string {
  try {
    return format(parseISO(iso), fmt, { locale: ja });
  } catch {
    return iso;
  }
}

export function formatDate(iso: string): string {
  return formatDatetime(iso, "yyyy/MM/dd");
}

export function formatPips(pips: number): string {
  const sign = pips >= 0 ? "+" : "";
  return `${sign}${pips.toFixed(1)}p`;
}

export function pipsColor(pips: number): string {
  if (pips > 0) return "text-profit";
  if (pips < 0) return "text-loss";
  return "text-text-secondary";
}

export function calcDailyStats(trades: ReconstructedTrade[]): DailyStats[] {
  const map = new Map<string, DailyStats>();

  for (const t of trades) {
    const date = t.firstEntryDatetime.slice(0, 10);
    if (!map.has(date)) {
      map.set(date, { date, tradeCount: 0, winCount: 0, lossCount: 0, totalPnlPips: 0 });
    }
    const d = map.get(date)!;
    d.tradeCount++;
    d.totalPnlPips += t.totalPnlPips;
    if (t.isWin) d.winCount++;
    else d.lossCount++;
  }

  return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
}

export function calcPairStats(trades: ReconstructedTrade[]): PairStats[] {
  const map = new Map<string, PairStats>();

  for (const t of trades) {
    if (!map.has(t.pair)) {
      map.set(t.pair, {
        pair: t.pair,
        tradeCount: 0,
        winCount: 0,
        winRate: 0,
        totalPnlPips: 0,
        avgHoldingMinutes: 0,
      });
    }
    const p = map.get(t.pair)!;
    p.tradeCount++;
    p.totalPnlPips += t.totalPnlPips;
    p.avgHoldingMinutes += t.holdingMinutes;
    if (t.isWin) p.winCount++;
  }

  for (const p of Array.from(map.values())) {
    p.winRate = p.tradeCount > 0 ? (p.winCount / p.tradeCount) * 100 : 0;
    p.avgHoldingMinutes = p.tradeCount > 0 ? p.avgHoldingMinutes / p.tradeCount : 0;
  }

  return Array.from(map.values()).sort((a, b) => b.totalPnlPips - a.totalPnlPips);
}

export function calcTagStats(trades: ReconstructedTrade[]): { tag: string; count: number; totalPnlPips: number; winRate: number }[] {
  const map = new Map<string, { count: number; wins: number; pips: number }>();

  for (const t of trades) {
    for (const tag of t.note.tags) {
      if (!map.has(tag)) map.set(tag, { count: 0, wins: 0, pips: 0 });
      const s = map.get(tag)!;
      s.count++;
      s.pips += t.totalPnlPips;
      if (t.isWin) s.wins++;
    }
  }

  return Array.from(map.entries())
    .map(([tag, s]) => ({
      tag,
      count: s.count,
      totalPnlPips: s.pips,
      winRate: s.count > 0 ? (s.wins / s.count) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

export function calcHourStats(trades: ReconstructedTrade[]): { hour: number; count: number; totalPnlPips: number }[] {
  const map = new Map<number, { count: number; pips: number }>();
  for (let h = 0; h < 24; h++) map.set(h, { count: 0, pips: 0 });

  for (const t of trades) {
    const hour = new Date(t.firstEntryDatetime).getHours();
    const s = map.get(hour)!;
    s.count++;
    s.pips += t.totalPnlPips;
  }

  return Array.from(map.entries()).map(([hour, s]) => ({
    hour,
    count: s.count,
    totalPnlPips: s.pips,
  }));
}

export const CURRENCY_PAIRS = [
  "USDJPY", "EURUSD", "EURJPY", "GBPUSD", "GBPJPY",
  "AUDUSD", "AUDJPY", "NZDUSD", "USDCHF", "USDCAD",
  "CADJPY", "CHFJPY", "EURGBP", "EURAUD", "EURCAD",
];

// 資産クラス別シンボルリスト
export const SYMBOL_LIST = {
  forex: [
    "USDJPY", "EURUSD", "EURJPY", "GBPUSD", "GBPJPY",
    "AUDUSD", "AUDJPY", "NZDUSD", "USDCHF", "USDCAD",
    "CADJPY", "CHFJPY", "EURGBP", "EURAUD", "EURCAD",
  ],
  stock: [
    "AAPL", "GOOGL", "MSFT", "AMZN", "NVDA", "TSLA", "META",
    "7203.T", "6758.T", "9984.T", "8306.T", "6861.T",
  ],
  crypto: [
    "BTC/USD", "ETH/USD", "XRP/USD", "SOL/USD", "ADA/USD",
    "DOGE/USD", "MATIC/USD", "AVAX/USD", "DOT/USD", "LINK/USD",
  ],
};

export type AssetClass = "forex" | "stock" | "crypto";

export const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  forex: "FX",
  stock: "株式",
  crypto: "クリプト",
};
