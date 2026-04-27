// src/lib/db/index.ts
import { supabase } from "@/lib/supabase";
import type { TradeGroup, OhlcBar, AppSettings } from "@/types";

// ---- TradeGroup CRUD ----

export async function getAllTradeGroups(): Promise<TradeGroup[]> {
  const { data, error } = await supabase
    .from("trade_groups")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToTradeGroup);
}

export async function getTradeGroup(id: string): Promise<TradeGroup | undefined> {
  const { data, error } = await supabase
    .from("trade_groups")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return undefined;
  return rowToTradeGroup(data);
}

export async function saveTradeGroup(tg: TradeGroup): Promise<void> {
  const { error } = await supabase.from("trade_groups").upsert({
    id: tg.id,
    pair: tg.pair,
    direction: tg.direction,
    created_at: tg.createdAt,
    note: tg.note,
    fills: tg.fills,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function deleteTradeGroup(id: string): Promise<void> {
  const { error } = await supabase.from("trade_groups").delete().eq("id", id);
  if (error) throw error;
}

function rowToTradeGroup(row: Record<string, unknown>): TradeGroup {
  return {
    id: row.id as string,
    pair: row.pair as string,
    direction: row.direction as "BUY" | "SELL",
    createdAt: row.created_at as string,
    note: row.note as TradeGroup["note"],
    fills: row.fills as TradeGroup["fills"],
  };
}

// ---- OHLC (LocalStorageに保存) ----
const ohlcMemory = new Map<string, OhlcBar[]>();

export async function saveOhlcBars(
  pair: string,
  timeframe: string,
  bars: OhlcBar[]
): Promise<void> {
  ohlcMemory.set(`${pair}_${timeframe}`, bars);
  try {
    localStorage.setItem(`ohlc_${pair}_${timeframe}`, JSON.stringify(bars));
  } catch {}
}

export async function getOhlcBars(
  pair: string,
  timeframe: string
): Promise<OhlcBar[]> {
  const key = `${pair}_${timeframe}`;
  if (ohlcMemory.has(key)) return ohlcMemory.get(key)!;
  try {
    const stored = localStorage.getItem(`ohlc_${key}`);
    if (stored) {
      const bars = JSON.parse(stored);
      ohlcMemory.set(key, bars);
      return bars;
    }
  } catch {}
  return [];
}

export async function getAvailablePairsInOhlc(): Promise<string[]> {
  return Array.from(ohlcMemory.keys()).map((k) => k.split("_")[0]);
}

// ---- Settings ----

const DEFAULT_SETTINGS: AppSettings = {
  defaultPair: "USDJPY",
  defaultLots: 0.1,
  tagPresets: ["東京時間", "ロンドン時間", "NY時間", "高ボラ", "押し目", "戻り売り", "ブレイク", "仲値", "指標"],
  entryReasonPresets: [
    "押し目買い", "戻り売り", "ブレイクアウト", "反発", "仲値",
    "指標後", "レンジブレイク", "節目反発", "MA反発",
  ],
  exitReasonPresets: [
    "TP到達", "SL到達", "時間切れ", "逆行", "トレンド転換",
    "高値/安値到達", "節目到達", "トレイリング", "手動決済",
  ],
  marketPremisePresets: [
    "上昇トレンド", "下降トレンド", "レンジ", "ドル高", "ドル安",
    "リスクオン", "リスクオフ", "指標待ち", "方向感なし",
  ],
};

export async function getSettings(): Promise<AppSettings> {
  const { data } = await supabase
    .from("settings")
    .select("*")
    .eq("key", "appSettings")
    .maybeSingle();
  return (data?.value as AppSettings) ?? DEFAULT_SETTINGS;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const { error } = await supabase.from("settings").upsert({
    key: "appSettings",
    value: settings,
  });
  if (error) throw error;
}

export async function exportAllData(): Promise<string> {
  const tradeGroups = await getAllTradeGroups();
  const settings = await getSettings();
  return JSON.stringify({ tradeGroups, settings }, null, 2);
}

export async function importAllData(jsonStr: string): Promise<void> {
  const data = JSON.parse(jsonStr);
  if (data.tradeGroups) {
    for (const tg of data.tradeGroups) {
      await saveTradeGroup(tg);
    }
  }
  if (data.settings) {
    await saveSettings(data.settings);
  }
}
