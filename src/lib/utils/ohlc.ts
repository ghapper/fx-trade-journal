// src/lib/utils/ohlc.ts
import type { OhlcBar, Timeframe } from "@/types";

const TIMEFRAME_MINUTES: Record<Timeframe, number> = {
  "1m": 1,
  "5m": 5,
  "10m": 10,
  "15m": 15,
  "30m": 30,
  "1h": 60,
  "4h": 240,
};

/**
 * Aggregate 1-minute bars into a target timeframe.
 */
export function aggregateBars(
  bars1m: OhlcBar[],
  timeframe: Timeframe
): OhlcBar[] {
  if (timeframe === "1m") return bars1m;
  const tfMinutes = TIMEFRAME_MINUTES[timeframe];
  const tfSeconds = tfMinutes * 60;

  const buckets = new Map<number, OhlcBar>();

  for (const bar of bars1m) {
    const bucketTime = Math.floor(bar.time / tfSeconds) * tfSeconds;
    const existing = buckets.get(bucketTime);
    if (!existing) {
      buckets.set(bucketTime, { ...bar, time: bucketTime });
    } else {
      existing.high = Math.max(existing.high, bar.high);
      existing.low = Math.min(existing.low, bar.low);
      existing.close = bar.close;
      if (bar.volume !== undefined) {
        existing.volume = (existing.volume ?? 0) + bar.volume;
      }
    }
  }

  return Array.from(buckets.values()).sort((a, b) => a.time - b.time);
}

/**
 * Parse CSV string into 1-minute OhlcBar array.
 * Supports flexible column mapping.
 */
export function parseCsv(
  csv: string,
  columnMap: {
    time: string;
    open: string;
    high: string;
    low: string;
    close: string;
    volume?: string;
  }
): { bars: OhlcBar[]; errors: string[] } {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return { bars: [], errors: ["CSVが空です"] };

  const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
  const errors: string[] = [];
  const bars: OhlcBar[] = [];

  const idx = {
    time: headers.indexOf(columnMap.time),
    open: headers.indexOf(columnMap.open),
    high: headers.indexOf(columnMap.high),
    low: headers.indexOf(columnMap.low),
    close: headers.indexOf(columnMap.close),
    volume: columnMap.volume ? headers.indexOf(columnMap.volume) : -1,
  };

  const missing = Object.entries(idx)
    .filter(([k, v]) => k !== "volume" && v === -1)
    .map(([k]) => k);
  if (missing.length > 0) {
    return {
      bars: [],
      errors: [`カラムが見つかりません: ${missing.join(", ")}`],
    };
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(",").map((c) => c.trim().replace(/"/g, ""));

    try {
      const timeRaw = cols[idx.time];
      const timestamp = parseTimestamp(timeRaw);
      if (isNaN(timestamp)) {
        errors.push(`行 ${i + 1}: 日時のパース失敗 "${timeRaw}"`);
        continue;
      }

      const open = parseFloat(cols[idx.open]);
      const high = parseFloat(cols[idx.high]);
      const low = parseFloat(cols[idx.low]);
      const close = parseFloat(cols[idx.close]);

      if ([open, high, low, close].some(isNaN)) {
        errors.push(`行 ${i + 1}: 価格のパース失敗`);
        continue;
      }

      const bar: OhlcBar = { time: timestamp, open, high, low, close };
      if (idx.volume >= 0 && cols[idx.volume]) {
        bar.volume = parseFloat(cols[idx.volume]);
      }
      bars.push(bar);
    } catch {
      errors.push(`行 ${i + 1}: パースエラー`);
    }
  }

  bars.sort((a, b) => a.time - b.time);
  return { bars, errors };
}

function parseTimestamp(raw: string): number {
  // Try various formats
  const formats = [
    // ISO 8601
    () => new Date(raw).getTime() / 1000,
    // YYYY.MM.DD HH:mm
    () => new Date(raw.replace(/\./g, "-")).getTime() / 1000,
    // Unix timestamp (seconds)
    () => {
      const n = Number(raw);
      return n > 1e9 ? n : NaN;
    },
    // Unix timestamp (ms)
    () => {
      const n = Number(raw);
      return n > 1e12 ? n / 1000 : NaN;
    },
  ];
  for (const fn of formats) {
    const ts = fn();
    if (!isNaN(ts) && ts > 0) return Math.floor(ts);
  }
  return NaN;
}

export { TIMEFRAME_MINUTES };
