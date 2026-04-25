# FX Trade Journal

FXトレードの記録・振り返りに特化したWebアプリケーションです。

## 特徴

- **トレード記録**: エントリー/エグジット価格・日時・根拠を素早く記録
- **チャート表示**: Lightweight Chartsによる高速なOHLCチャート
- **FIFO再構築**: 約定履歴からFIFOロジックでトレード単位を自動生成
- **分析**: 日別・ペア別・タグ別・時間帯別の統計
- **PWA対応**: スマートフォンにインストール可能
- **完全ローカル動作**: IndexedDB保存、ネット不要

---

## セットアップ

```bash
# 1. 依存パッケージのインストール
npm install

# 2. 開発サーバー起動
npm run dev

# 3. ブラウザで開く
http://localhost:3000
```

### 本番ビルド
```bash
npm run build
npm start
```

---

## CSV仕様 (OHLC取込)

### 対応フォーマット

| 項目 | 仕様 |
|------|------|
| 区切り | カンマ (,) |
| 文字コード | UTF-8, Shift-JIS |
| 1行目 | ヘッダー行 (必須) |
| 時間足 | **1分足** (アプリ内で集約) |

### 時刻フォーマット (自動判定)

- ISO 8601: `2024-01-15T09:00:00`
- `2024-01-15 09:00:00`
- `2024.01.15 09:00`
- Unix秒: `1705312800`
- Unixミリ秒: `1705312800000`

### MT4/MT5 標準CSV例

```
Date,Open,High,Low,Close,Volume
2024-01-15 09:00:00,155.320,155.345,155.310,155.335,1250
2024-01-15 09:01:00,155.335,155.360,155.330,155.355,980
```

### TradingView CSV例

```
time,open,high,low,close,Volume
2024-01-15T09:00:00,155.320,155.345,155.310,155.335,1250
```

サンプルCSV: `public/sample_USDJPY_1m.csv`

---

## データ構造

### Fill (約定履歴)

```typescript
interface Fill {
  id: string;
  tradeGroupId: string;   // 同一トレードのグループID
  type: "ENTRY" | "EXIT";
  pair: string;           // 通貨ペア (例: "USDJPY")
  direction: "BUY" | "SELL";
  price: number;
  lots: number;
  datetime: string;       // ISO 8601
  createdAt: string;
}
```

### TradeGroup (トレードグループ)

```typescript
interface TradeGroup {
  id: string;
  pair: string;
  direction: "BUY" | "SELL";
  createdAt: string;
  note: TradeNote;
  fills: Fill[];
}
```

### ReconstructedTrade (FIFO再構築後)

```typescript
interface ReconstructedTrade {
  id: string;
  pair: string;
  direction: "BUY" | "SELL";
  legs: ReconstructedLeg[];  // FIFOマッチング結果
  totalLots: number;
  avgEntryPrice: number;
  avgExitPrice: number;
  firstEntryDatetime: string;
  lastExitDatetime: string;
  holdingMinutes: number;
  totalPnlPips: number;
  isWin: boolean;
  note: TradeNote;
  fills: Fill[];
}
```

---

## FIFO処理仕様

### ルール

1. **エントリーキュー**: エントリーFillは発生時刻順にキューへ積む
2. **エグジット消化**: エグジットFillは最も古いエントリーから順に消化
3. **またがり許容**: 1つのエグジットが複数エントリーにまたがれる
4. **複数エグジット**: 1つのエントリーに複数エグジットが対応できる
5. **片方向前提**: 両建てなし

### 例

```
エントリー A: 0.1lot @ 155.00
エントリー B: 0.1lot @ 155.20
エグジット X: 0.15lot @ 155.50

→ Leg 1: A (0.1lot) → X (155.00 → 155.50) = +50pip * 0.1
→ Leg 2: B (0.05lot) → X (155.20 → 155.50) = +30pip * 0.05
```

### pip計算

- JPYペア (例: USDJPY): 1pip = 0.01 → × 100
- その他 (例: EURUSD): 1pip = 0.0001 → × 10000

---

## 画面構成

| 画面 | パス | 説明 |
|------|------|------|
| ホーム | `/` | 今日の概要・直近トレード・7日間チャート |
| トレード一覧 | `/trades` | 検索・フィルタ・一覧表示 |
| トレード詳細 | `/trades/[id]` | チャート表示・詳細情報・編集 |
| クイック入力 | `/quick-input` | スマホ最適化入力フォーム |
| OHLC取込 | `/import` | CSVアップロード・プレビュー |
| 分析 | `/analysis` | 各種統計グラフ |
| 設定 | `/settings` | プリセット編集・データ管理 |

---

## データ永続化

### 現在: IndexedDB

| ストア | 内容 |
|--------|------|
| `tradeGroups` | 全トレードグループ |
| `ohlcData` | OHLC価格データ |
| `settings` | アプリ設定 |

### 将来: Supabase移行

データアクセス層は `src/lib/db/index.ts` に集約されています。
各関数 (`getAllTradeGroups`, `saveTradeGroup` など) のインターフェースを変えずに
実装を Supabase API に差し替えることで移行可能です。

---

## エクスポート/インポート

設定画面からJSONファイルとしてバックアップ・リストアできます。

```json
{
  "tradeGroups": [...],
  "settings": [...]
}
```

---

## 技術スタック

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Lightweight Charts** (TradingView製チャートライブラリ)
- **Zustand** (状態管理)
- **idb** (IndexedDB ラッパー)
- **date-fns** (日時処理)
