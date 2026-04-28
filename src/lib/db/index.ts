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
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("trade_groups").upsert({
    id: tg.id,
    pair: tg.pair,
    direction: tg.direction,
    created_at: tg.createdAt,
    note: tg.note,
    fills: tg.fills,
    updated_at: new Date().toISOString(),
    user_id: user?.id,
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

// ---- OHLC (Supabaseに保存・トレードIDで紐付け) ----

export async function saveOhlcBars(
  pair: string,
  timeframe: string,
  bars: OhlcBar[],
  tradeId?: string
): Promise<void> {
  if (bars.length === 0) return;
  const rows = bars.map((b) => ({
    pair,
    timeframe,
    time: b.time,
    open: b.open,
    high: b.high,
    low: b.low,
    close: b.close,
    volume: b.volume ?? null,
    trade_id: tradeId ?? null,
  }));
  const { error } = await supabase
    .from("ohlc_data")
    .upsert(rows, { onConflict: "pair,timeframe,time" });
  if (error) console.error("OHLC save error:", error);
}

export async function getOhlcBarsByTradeId(tradeId: string): Promise<OhlcBar[]> {
  const { data, error } = await supabase
    .from("ohlc_data")
    .select("time,open,high,low,close,volume")
    .eq("trade_id", tradeId)
    .eq("timeframe", "1m")
    .order("time", { ascending: true });
  if (error) return [];
  return (data ?? []).map((r) => ({
    time: r.time,
    open: r.open,
    high: r.high,
    low: r.low,
    close: r.close,
    volume: r.volume ?? undefined,
  }));
}

export async function hasOhlcDataForTrade(tradeId: string): Promise<boolean> {
  const { count } = await supabase
    .from("ohlc_data")
    .select("*", { count: "exact", head: true })
    .eq("trade_id", tradeId)
    .eq("timeframe", "1m");
  return (count ?? 0) > 0;
}

export async function getOhlcBars(
  pair: string,
  timeframe: string,
  startTime?: number,
  endTime?: number
): Promise<OhlcBar[]> {
  let query = supabase
    .from("ohlc_data")
    .select("time,open,high,low,close,volume")
    .eq("pair", pair)
    .eq("timeframe", timeframe)
    .order("time", { ascending: true });
  if (startTime) query = query.gte("time", startTime);
  if (endTime) query = query.lte("time", endTime);
  const { data, error } = await query;
  if (error) return [];
  return (data ?? []).map((r) => ({
    time: r.time, open: r.open, high: r.high, low: r.low, close: r.close,
    volume: r.volume ?? undefined,
  }));
}

export async function hasOhlcData(
  pair: string,
  timeframe: string,
  startTime: number,
  endTime: number
): Promise<boolean> {
  const { count } = await supabase
    .from("ohlc_data")
    .select("*", { count: "exact", head: true })
    .eq("pair", pair).eq("timeframe", timeframe)
    .gte("time", startTime).lte("time", endTime);
  return (count ?? 0) > 0;
}

export async function getAvailablePairsInOhlc(): Promise<string[]> {
  const { data } = await supabase.from("ohlc_data").select("pair").limit(100);
  const pairs = new Set((data ?? []).map((r) => r.pair));
  return Array.from(pairs);
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
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("settings").upsert({
    key: "appSettings",
    value: settings,
    user_id: user?.id,
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
