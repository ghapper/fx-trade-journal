// src/lib/utils/sampleData.ts
import type { TradeGroup } from "@/types";
import { generateId } from "@/lib/utils";

export const SAMPLE_TRADES: TradeGroup[] = [
  {
    id: generateId(),
    pair: "USDJPY",
    direction: "BUY",
    createdAt: "2024-01-15T09:00:00.000Z",
    note: {
      entryReason: "東京時間仲値、押し目買い、MA反発",
      exitReason: "TP到達、高値圏でモメンタム鈍化",
      marketPremise: "上昇トレンド、ドル高継続中",
      improvements: "エントリーを少し早めに入れすぎた。次回はもう少し確認してから入る",
      memo: "",
      tags: ["東京時間", "仲値", "押し目"],
      confidence: 4,
      tpPrice: 155.680,
      slPrice: 155.200,
    },
    fills: [
      {
        id: generateId(),
        tradeGroupId: "",
        type: "ENTRY",
        pair: "USDJPY",
        direction: "BUY",
        price: 155.320,
        lots: 0.1,
        datetime: "2024-01-15T09:05:00.000Z",
        createdAt: "2024-01-15T09:05:00.000Z",
      },
      {
        id: generateId(),
        tradeGroupId: "",
        type: "EXIT",
        pair: "USDJPY",
        direction: "BUY",
        price: 155.680,
        lots: 0.1,
        datetime: "2024-01-15T09:45:00.000Z",
        createdAt: "2024-01-15T09:45:00.000Z",
      },
    ],
  },
  {
    id: generateId(),
    pair: "USDJPY",
    direction: "SELL",
    createdAt: "2024-01-15T10:30:00.000Z",
    note: {
      entryReason: "高値圏での戻り売り、レジスタンス反発",
      exitReason: "SL到達",
      marketPremise: "短期的に買われすぎ感あり",
      improvements: "トレンドに逆らった売りは慎重に。ロットを下げるべきだった",
      memo: "ロンドン時間前で流動性が低かった",
      tags: ["戻り売り", "逆張り"],
      confidence: 2,
    },
    fills: [
      {
        id: generateId(),
        tradeGroupId: "",
        type: "ENTRY",
        pair: "USDJPY",
        direction: "SELL",
        price: 155.750,
        lots: 0.1,
        datetime: "2024-01-15T10:35:00.000Z",
        createdAt: "2024-01-15T10:35:00.000Z",
      },
      {
        id: generateId(),
        tradeGroupId: "",
        type: "EXIT",
        pair: "USDJPY",
        direction: "SELL",
        price: 155.850,
        lots: 0.1,
        datetime: "2024-01-15T10:55:00.000Z",
        createdAt: "2024-01-15T10:55:00.000Z",
      },
    ],
  },
  {
    id: generateId(),
    pair: "EURUSD",
    direction: "BUY",
    createdAt: "2024-01-16T14:00:00.000Z",
    note: {
      entryReason: "ロンドン時間ブレイクアウト、節目上抜け",
      exitReason: "高値到達、利確",
      marketPremise: "ユーロ強め、ドル弱",
      improvements: "",
      memo: "ロンドンフィックス前後は動きが読みやすい",
      tags: ["ロンドン時間", "ブレイク"],
      confidence: 5,
      tpPrice: 1.0950,
      slPrice: 1.0880,
    },
    fills: [
      {
        id: generateId(),
        tradeGroupId: "",
        type: "ENTRY",
        pair: "EURUSD",
        direction: "BUY",
        price: 1.0900,
        lots: 0.2,
        datetime: "2024-01-16T14:10:00.000Z",
        createdAt: "2024-01-16T14:10:00.000Z",
      },
      {
        id: generateId(),
        tradeGroupId: "",
        type: "EXIT",
        pair: "EURUSD",
        direction: "BUY",
        price: 1.0920,
        lots: 0.1,
        datetime: "2024-01-16T14:45:00.000Z",
        createdAt: "2024-01-16T14:45:00.000Z",
      },
      {
        id: generateId(),
        tradeGroupId: "",
        type: "EXIT",
        pair: "EURUSD",
        direction: "BUY",
        price: 1.0948,
        lots: 0.1,
        datetime: "2024-01-16T15:20:00.000Z",
        createdAt: "2024-01-16T15:20:00.000Z",
      },
    ],
  },
];

// Fix tradeGroupIds in fills
SAMPLE_TRADES.forEach((tg) => {
  tg.fills.forEach((f) => {
    f.tradeGroupId = tg.id;
  });
});
