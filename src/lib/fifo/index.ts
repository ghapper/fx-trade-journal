// src/lib/fifo/index.ts
import type {
  Fill,
  TradeGroup,
  ReconstructedTrade,
  ReconstructedLeg,
} from "@/types";

interface EntryQueue {
  fillId: string;
  price: number;
  lots: number;
  datetime: string;
  remaining: number;
}

/**
 * Reconstruct trades from fills using FIFO matching.
 * Rules:
 * - Entries are queued in chronological order
 * - Exits consume the oldest entries first
 * - One exit can span multiple entries
 * - One entry can have multiple exits
 */
export function reconstructTrades(tradeGroup: TradeGroup): ReconstructedTrade {
  const fills = [...tradeGroup.fills].sort(
    (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
  );

  const entryQueue: EntryQueue[] = [];
  const legs: ReconstructedLeg[] = [];

  for (const fill of fills) {
    if (fill.type === "ENTRY") {
      entryQueue.push({
        fillId: fill.id,
        price: fill.price,
        lots: fill.lots,
        datetime: fill.datetime,
        remaining: fill.lots,
      });
    } else {
      // EXIT: consume from queue FIFO
      let toConsume = fill.lots;

      while (toConsume > 0 && entryQueue.length > 0) {
        const oldest = entryQueue[0];
        const consumed = Math.min(oldest.remaining, toConsume);

        const pnlPips = calcPips(
          tradeGroup.pair,
          tradeGroup.direction,
          oldest.price,
          fill.price
        );

        legs.push({
          entryFillId: oldest.fillId,
          exitFillId: fill.id,
          entryPrice: oldest.price,
          exitPrice: fill.price,
          lots: consumed,
          entryDatetime: oldest.datetime,
          exitDatetime: fill.datetime,
          pnlPips: pnlPips * consumed,
        });

        oldest.remaining -= consumed;
        toConsume -= consumed;

        if (oldest.remaining <= 0) {
          entryQueue.shift();
        }
      }
    }
  }

  // Compute aggregate stats
  const totalLots = legs.reduce((s, l) => s + l.lots, 0) || 1;
  const totalPnlPips = legs.reduce((s, l) => s + l.pnlPips, 0);

  const entryFills = fills.filter((f) => f.type === "ENTRY");
  const exitFills = fills.filter((f) => f.type === "EXIT");

  const avgEntryPrice =
    entryFills.reduce((s, f) => s + f.price * f.lots, 0) /
    (entryFills.reduce((s, f) => s + f.lots, 0) || 1);

  const avgExitPrice =
    exitFills.length > 0
      ? exitFills.reduce((s, f) => s + f.price * f.lots, 0) /
        (exitFills.reduce((s, f) => s + f.lots, 0) || 1)
      : 0;

  const firstEntry = entryFills[0]?.datetime ?? tradeGroup.createdAt;
  const lastExit = exitFills[exitFills.length - 1]?.datetime ?? firstEntry;

  const holdingMinutes = Math.round(
    (new Date(lastExit).getTime() - new Date(firstEntry).getTime()) / 60000
  );

  return {
    id: tradeGroup.id,
    pair: tradeGroup.pair,
    direction: tradeGroup.direction,
    legs,
    totalLots,
    avgEntryPrice,
    avgExitPrice,
    firstEntryDatetime: firstEntry,
    lastExitDatetime: lastExit,
    holdingMinutes,
    totalPnlPips,
    isWin: totalPnlPips > 0,
    note: tradeGroup.note,
    fills,
  };
}

export function reconstructAllTrades(
  tradeGroups: TradeGroup[]
): ReconstructedTrade[] {
  return tradeGroups.map(reconstructTrades);
}

/** Calculate pips based on pair and direction */
function calcPips(
  pair: string,
  direction: "BUY" | "SELL",
  entryPrice: number,
  exitPrice: number
): number {
  const multiplier = getMultiplier(pair);
  const raw = direction === "BUY" ? exitPrice - entryPrice : entryPrice - exitPrice;
  return parseFloat((raw * multiplier).toFixed(1));
}

function getMultiplier(pair: string): number {
  const upper = pair.toUpperCase();
  // JPY pairs: 1 pip = 0.01
  if (upper.includes("JPY")) return 100;
  // Most other pairs: 1 pip = 0.0001
  return 10000;
}

export function formatHoldingTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h${m}m`;
}
