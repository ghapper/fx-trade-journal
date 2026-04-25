// src/lib/db/index.ts
import { openDB, DBSchema, IDBPDatabase } from "idb";
import type { TradeGroup, OhlcBar, AppSettings } from "@/types";

const DB_NAME = "fx-trade-journal";
const DB_VERSION = 1;

interface FxDB extends DBSchema {
  tradeGroups: {
    key: string;
    value: TradeGroup;
    indexes: { "by-pair": string; "by-date": string };
  };
  ohlcData: {
    key: [string, string, number]; // [pair, timeframe, time]
    value: { pair: string; timeframe: string } & OhlcBar;
    indexes: { "by-pair-tf": [string, string] };
  };
  settings: {
    key: string;
    value: { key: string; value: unknown };
  };
}

let dbInstance: IDBPDatabase<FxDB> | null = null;

async function getDB(): Promise<IDBPDatabase<FxDB>> {
  if (dbInstance) return dbInstance;
  dbInstance = await openDB<FxDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // tradeGroups store
      const tgStore = db.createObjectStore("tradeGroups", { keyPath: "id" });
      tgStore.createIndex("by-pair", "pair");
      tgStore.createIndex("by-date", "createdAt");

      // ohlcData store
      const ohlcStore = db.createObjectStore("ohlcData", {
        keyPath: ["pair", "timeframe", "time"],
      });
      ohlcStore.createIndex("by-pair-tf", ["pair", "timeframe"]);

      // settings store
      db.createObjectStore("settings", { keyPath: "key" });
    },
  });
  return dbInstance;
}

// ---- TradeGroup CRUD ----

export async function getAllTradeGroups(): Promise<TradeGroup[]> {
  const db = await getDB();
  const all = await db.getAll("tradeGroups");
  return all.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getTradeGroup(id: string): Promise<TradeGroup | undefined> {
  const db = await getDB();
  return db.get("tradeGroups", id);
}

export async function saveTradeGroup(tg: TradeGroup): Promise<void> {
  const db = await getDB();
  await db.put("tradeGroups", tg);
}

export async function deleteTradeGroup(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("tradeGroups", id);
}

// ---- OHLC ----

export async function saveOhlcBars(
  pair: string,
  timeframe: string,
  bars: OhlcBar[]
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("ohlcData", "readwrite");
  await Promise.all(
    bars.map((bar) =>
      tx.store.put({ pair, timeframe, ...bar })
    )
  );
  await tx.done;
}

export async function getOhlcBars(
  pair: string,
  timeframe: string
): Promise<OhlcBar[]> {
  const db = await getDB();
  const records = await db.getAllFromIndex(
    "ohlcData",
    "by-pair-tf",
    [pair, timeframe]
  );
  return records
    .map(({ pair: _p, timeframe: _tf, ...bar }) => bar as OhlcBar)
    .sort((a, b) => a.time - b.time);
}

export async function getAvailablePairsInOhlc(): Promise<string[]> {
  const db = await getDB();
  const all = await db.getAll("ohlcData");
  const pairs = new Set(all.map((r) => r.pair));
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
  const db = await getDB();
  const rec = await db.get("settings", "appSettings");
  return (rec?.value as AppSettings) ?? DEFAULT_SETTINGS;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDB();
  await db.put("settings", { key: "appSettings", value: settings });
}

// ---- Export / Import ----

export async function exportAllData(): Promise<string> {
  const db = await getDB();
  const tradeGroups = await db.getAll("tradeGroups");
  const settings = await db.getAll("settings");
  return JSON.stringify({ tradeGroups, settings }, null, 2);
}

export async function importAllData(jsonStr: string): Promise<void> {
  const data = JSON.parse(jsonStr);
  const db = await getDB();
  const tx = db.transaction(["tradeGroups", "settings"], "readwrite");
  if (data.tradeGroups) {
    for (const tg of data.tradeGroups) {
      await tx.objectStore("tradeGroups").put(tg);
    }
  }
  if (data.settings) {
    for (const s of data.settings) {
      await tx.objectStore("settings").put(s);
    }
  }
  await tx.done;
}
