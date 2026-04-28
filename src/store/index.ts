// src/store/index.ts
import { create } from "zustand";
import type { TradeGroup, ReconstructedTrade, AppSettings } from "@/types";
import * as db from "@/lib/db";
import { reconstructAllTrades } from "@/lib/fifo";

interface AppState {
  tradeGroups: TradeGroup[];
  reconstructedTrades: ReconstructedTrade[];
  settings: AppSettings | null;
  isLoading: boolean;

  loadAll: () => Promise<void>;
  saveTrade: (tg: TradeGroup) => Promise<void>;
  deleteTrade: (id: string) => Promise<void>;
  loadSettings: () => Promise<void>;
  saveSettings: (s: AppSettings) => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  tradeGroups: [],
  reconstructedTrades: [],
  settings: null,
  isLoading: false,

  loadAll: async () => {
    set({ isLoading: true });
    try {
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
}));
