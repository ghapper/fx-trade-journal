// src/store/index.ts
import { create } from "zustand";
import type { TradeGroup, ReconstructedTrade, OhlcBar, AppSettings, Timeframe } from "@/types";
import * as db from "@/lib/db";
import { reconstructAllTrades } from "@/lib/fifo";
import { aggregateBars } from "@/lib/utils/ohlc";

interface AppState {
  tradeGroups: TradeGroup[];
  reconstructedTrades: ReconstructedTrade[];
  settings: AppSettings | null;
  ohlcCache: Map<string, OhlcBar[]>;
  isLoading: boolean;

  loadAll: () => Promise<void>;
  saveTrade: (tg: TradeGroup) => Promise<void>;
  deleteTrade: (id: string) => Promise<void>;
  loadSettings: () => Promise<void>;
  saveSettings: (s: AppSettings) => Promise<void>;
  saveOhlc: (pair: string, bars: OhlcBar[]) => Promise<void>;
  getOhlcForPair: (pair: string, tf: Timeframe) => OhlcBar[];
  loadOhlcFromStorage: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  tradeGroups: [],
  reconstructedTrades: [],
  settings: null,
  ohlcCache: new Map(),
  isLoading: false,

  loadAll: async () => {
    set({ isLoading: true });
    try {
      // OHLCをLocalStorageから復元
      get().loadOhlcFromStorage();

      const [groups, settings] = await Promise.all([
        db.getAllTradeGroups(),
        db.getSettings(),
      ]);
      const reconstructed = reconstructAllTrades(groups);
      set({ tradeGroups: groups, reconstructedTrades: reconstructed, settings });
    } finally {
      set({ isLoading: false });
    }
  },

  loadOhlcFromStorage: () => {
    try {
      const cache = new Map<string, OhlcBar[]>();
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("ohlc_")) {
          const cacheKey = key.replace("ohlc_", "");
          const stored = localStorage.getItem(key);
          if (stored) {
            cache.set(cacheKey, JSON.parse(stored));
          }
        }
      }
      if (cache.size > 0) {
        set({ ohlcCache: cache });
      }
    } catch (e) {
      console.error("Failed to load OHLC from storage:", e);
    }
  },

  saveTrade: async (tg) => {
    await db.saveTradeGroup(tg);
    const groups = await db.getAllTradeGroups();
    const reconstructed = reconstructAllTrades(groups);
    set({ tradeGroups: groups, reconstructedTrades: reconstructed });
  },

  deleteTrade: async (id) => {
    await db.deleteTradeGroup(id);
    const groups = await db.getAllTradeGroups();
    const reconstructed = reconstructAllTrades(groups);
    set({ tradeGroups: groups, reconstructedTrades: reconstructed });
  },

  loadSettings: async () => {
    const settings = await db.getSettings();
    set({ settings });
  },

  saveSettings: async (s) => {
    await db.saveSettings(s);
    set({ settings: s });
  },

  saveOhlc: async (pair, bars) => {
    await db.saveOhlcBars(pair, "1m", bars);
    const cache = new Map(get().ohlcCache);
    cache.set(`${pair}_1m`, bars);
    set({ ohlcCache: cache });
  },

  getOhlcForPair: (pair, tf) => {
    const cache = get().ohlcCache;
    const bars1m = cache.get(`${pair}_1m`) ?? [];
    return aggregateBars(bars1m, tf);
  },
}));
