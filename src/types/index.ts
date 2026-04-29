// src/types/index.ts

export type Direction = "BUY" | "SELL";
export type FillType = "ENTRY" | "EXIT";
export type Timeframe = "1m" | "5m" | "10m" | "15m" | "30m" | "1h" | "4h";

export interface Fill {
  id: string;
  tradeGroupId: string;   // groups fills that belong to the same trade session
  type: FillType;
  pair: string;
  direction: Direction;
  price: number;
  lots: number;
  datetime: string;       // ISO 8601
  createdAt: string;
}

export interface TradeNote {
  entryReason: string;    // エントリー根拠
  exitReason: string;     // 決済根拠
  marketPremise: string;  // 相場前提
  improvements: string;   // 改善点
  memo: string;           // 任意メモ
  tags: string[];
  confidence: number;     // 1-5
  tpPrice?: number;       // 利確予定
  slPrice?: number;       // 損切予定
  screenshotUrl?: string;
}

export interface TradeGroup {
  id: string;
  pair: string;
  direction: Direction;
  createdAt: string;
  note: TradeNote;
  fills: Fill[];
}

// FIFO reconstructed trade unit (one entry matched to its exits)
export interface ReconstructedLeg {
  entryFillId: string;
  exitFillId: string;
  entryPrice: number;
  exitPrice: number;
  lots: number;
  entryDatetime: string;
  exitDatetime: string;
  pnlPips: number;
  pnlJpy?: number;
}

export interface ReconstructedTrade {
  id: string;             // tradeGroupId
  pair: string;
  direction: Direction;
  legs: ReconstructedLeg[];
  totalLots: number;
  avgEntryPrice: number;
  avgExitPrice: number;
  firstEntryDatetime: string;
  lastExitDatetime: string;
  holdingMinutes: number;
  totalPnlPips: number;
  totalPnlJpy?: number;
  isWin: boolean;
  note: TradeNote;
  fills: Fill[];
}

export interface OhlcBar {
  time: number;   // Unix timestamp (seconds)
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface CsvColumnMap {
  [key: string]: string | undefined;
  time: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume?: string;
}

export interface ChartColors {
  upColor: string;
  downColor: string;
  borderUpColor: string;
  borderDownColor: string;
  wickUpColor: string;
  wickDownColor: string;
  background: string;
}

export interface AppSettings {
  defaultPair: string;
  defaultLots: number;
  tagPresets: string[];
  entryReasonPresets: string[];
  exitReasonPresets: string[];
  marketPremisePresets: string[];
  chartColors: ChartColors;
}

export interface DailyStats {
  date: string;
  tradeCount: number;
  winCount: number;
  lossCount: number;
  totalPnlPips: number;
}

export interface PairStats {
  pair: string;
  tradeCount: number;
  winCount: number;
  winRate: number;
  totalPnlPips: number;
  avgHoldingMinutes: number;
}
