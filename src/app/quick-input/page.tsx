"use client";
// src/app/quick-input/page.tsx
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store";
import type { Direction, Fill, TradeGroup } from "@/types";
import { generateId } from "@/lib/utils";
import clsx from "clsx";
import toast from "react-hot-toast";
import { XIcon, PlusIcon } from "lucide-react";

type AssetClass = "forex" | "stock" | "crypto";

const SYMBOLS: Record<AssetClass, string[]> = {
  forex: [
    "USDJPY", "EURUSD", "EURJPY", "GBPUSD", "GBPJPY",
    "AUDUSD", "AUDJPY", "NZDUSD", "USDCHF", "USDCAD",
    "CADJPY", "CHFJPY",
  ],
  stock: [
    "AAPL", "NVDA", "TSLA", "GOOGL", "MSFT", "AMZN", "META",
    "7203.T", "6758.T", "9984.T", "8306.T", "6861.T", "7974.T",
    "SPY", "QQQ", "VIX",
  ],
  crypto: [
    "BTC/USD", "ETH/USD", "XRP/USD", "SOL/USD", "ADA/USD",
    "DOGE/USD", "MATIC/USD", "AVAX/USD", "BNB/USD", "LINK/USD",
  ],
};

const ASSET_LABELS: Record<AssetClass, string> = {
  forex: "FX",
  stock: "株式",
  crypto: "クリプト",
};

const QUICK_REASONS = [
  "押し目買い", "戻り売り", "ブレイクアウト", "反発",
  "仲値", "指標後", "節目反発", "MA反発", "高ボラ",
];
const QUICK_TAGS = [
  "東京時間", "ロンドン時間", "NY時間", "高ボラ",
  "押し目", "戻り売り", "ブレイク", "仲値", "指標",
];
const QUICK_MARKET = [
  "上昇トレンド", "下降トレンド", "レンジ", "ドル高", "ドル安",
  "リスクオン", "リスクオフ",
];

function nowLocal() {
  const d = new Date();
  d.setSeconds(0, 0);
  return d.toISOString().slice(0, 16);
}

export default function QuickInputPage() {
  const router = useRouter();
  const { saveTrade, settings } = useAppStore();

  const [assetClass, setAssetClass] = useState<AssetClass>("forex");
  const [pair, setPair] = useState(settings?.defaultPair ?? "USDJPY");
  const [customSymbol, setCustomSymbol] = useState("");
  const [direction, setDirection] = useState<Direction>("BUY");
  const [entryPrice, setEntryPrice] = useState("");
  const [entryDatetime, setEntryDatetime] = useState(nowLocal());
  const [lots, setLots] = useState(String(settings?.defaultLots ?? 0.1));
  const [exitPrice, setExitPrice] = useState("");
  const [exitDatetime, setExitDatetime] = useState(nowLocal());
  const [hasExit, setHasExit] = useState(false);
  const [entryReason, setEntryReason] = useState("");
  const [exitReason, setExitReason] = useState("");
  const [marketPremise, setMarketPremise] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [confidence, setConfidence] = useState(3);
  const [saving, setSaving] = useState(false);

  const activePair = customSymbol || pair;

  const handleAssetClassChange = (ac: AssetClass) => {
    setAssetClass(ac);
    setPair(SYMBOLS[ac][0]);
    setCustomSymbol("");
  };

  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const appendReason = (setter: React.Dispatch<React.SetStateAction<string>>, val: string) => {
    setter((prev) => (prev ? `${prev}、${val}` : val));
  };

  const handleSave = async () => {
    if (!entryPrice) {
      toast.error("エントリー価格を入力してください");
      return;
    }
    setSaving(true);
    try {
      const id = generateId();
      const now = new Date().toISOString();

      const fills: Fill[] = [
        {
          id: generateId(),
          tradeGroupId: id,
          type: "ENTRY",
          pair: activePair,
          direction,
          price: Number(entryPrice),
          lots: Number(lots),
          datetime: entryDatetime + ":00",
          createdAt: now,
        },
      ];

      if (hasExit && exitPrice) {
        fills.push({
          id: generateId(),
          tradeGroupId: id,
          type: "EXIT",
          pair: activePair,
          direction,
          price: Number(exitPrice),
          lots: Number(lots),
          datetime: exitDatetime + ":00",
          createdAt: now,
        });
      }

      const tg: TradeGroup = {
        id,
        pair: activePair,
        direction,
        createdAt: now,
        note: {
          entryReason,
          exitReason,
          marketPremise,
          improvements: "",
          memo: "",
          tags,
          confidence,
          tpPrice: undefined,
          slPrice: undefined,
        },
        fills,
      };

      await saveTrade(tg);
      toast.success("保存しました！");
      router.push(`/trades/${id}`);
    } catch (e) {
      toast.error("保存に失敗しました");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-8">
      <h1 className="font-bold text-sm uppercase tracking-wider">クイック入力</h1>

      {/* Asset class tabs */}
      <div className="grid grid-cols-3 gap-1 bg-bg-tertiary rounded p-1">
        {(["forex", "stock", "crypto"] as AssetClass[]).map((ac) => (
          <button
            key={ac}
            onClick={() => handleAssetClassChange(ac)}
            className={clsx(
              "py-1.5 rounded text-xs font-bold transition-colors",
              assetClass === ac
                ? "bg-accent-orange text-black"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            {ASSET_LABELS[ac]}
          </button>
        ))}
      </div>

      {/* Symbol selection */}
      <div className="space-y-2">
        <label className="label">銘柄</label>
        <div className="flex gap-1 flex-wrap">
          {SYMBOLS[assetClass].map((s) => (
            <button
              key={s}
              onClick={() => { setPair(s); setCustomSymbol(""); }}
              className={clsx(
                "text-xs px-2 py-1 rounded border transition-colors",
                activePair === s && !customSymbol
                  ? "bg-accent-orange/20 border-accent-orange text-accent-orange"
                  : "border-border-default text-text-secondary hover:text-text-primary"
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <input
          className="input-field text-sm"
          placeholder="カスタム銘柄（例: 9984.T, BTC/USD）"
          value={customSymbol}
          onChange={(e) => setCustomSymbol(e.target.value.toUpperCase())}
        />
      </div>

      {/* Direction */}
      <div>
        <label className="label">方向</label>
        <div className="grid grid-cols-2 gap-1">
          {(["BUY", "SELL"] as Direction[]).map((d) => (
            <button
              key={d}
              onClick={() => setDirection(d)}
              className={clsx(
                "py-2.5 rounded text-sm font-bold transition-colors",
                direction === d
                  ? d === "BUY"
                    ? "bg-profit text-black"
                    : "bg-loss text-white"
                  : "bg-bg-tertiary text-text-secondary border border-border-default"
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Entry */}
      <div className="card p-3 space-y-2">
        <p className="text-xs text-profit font-bold uppercase">Entry</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">日時</label>
            <input
              type="datetime-local"
              className="input-field text-xs"
              value={entryDatetime}
              onChange={(e) => setEntryDatetime(e.target.value)}
            />
          </div>
          <div>
            <label className="label">ロット/数量</label>
            <input
              type="number"
              step="0.01"
              className="input-field"
              value={lots}
              onChange={(e) => setLots(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="label">エントリー価格</label>
          <input
            type="number"
            step="0.001"
            className="input-field text-base"
            placeholder={assetClass === "crypto" ? "例: 65000" : assetClass === "stock" ? "例: 185.50" : "例: 155.320"}
            value={entryPrice}
            onChange={(e) => setEntryPrice(e.target.value)}
          />
        </div>
      </div>

      {/* Exit toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setHasExit(!hasExit)}
          className={clsx(
            "flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors",
            hasExit
              ? "bg-loss/20 border border-loss/30 text-loss"
              : "bg-bg-tertiary border border-border-default text-text-secondary"
          )}
        >
          {hasExit ? <XIcon size={12} /> : <PlusIcon size={12} />}
          {hasExit ? "エグジットを削除" : "エグジットを追加"}
        </button>
        {!hasExit && <span className="text-xs text-text-muted">後から追加可能</span>}
      </div>

      {/* Exit */}
      {hasExit && (
        <div className="card p-3 space-y-2">
          <p className="text-xs text-loss font-bold uppercase">Exit</p>
          <div>
            <label className="label">エグジット日時</label>
            <input
              type="datetime-local"
              className="input-field text-xs"
              value={exitDatetime}
              onChange={(e) => setExitDatetime(e.target.value)}
            />
          </div>
          <div>
            <label className="label">エグジット価格</label>
            <input
              type="number"
              step="0.001"
              className="input-field text-base"
              value={exitPrice}
              onChange={(e) => setExitPrice(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Market premise */}
      <div>
        <label className="label">相場前提</label>
        <div className="flex gap-1 flex-wrap mb-1">
          {QUICK_MARKET.map((m) => (
            <button key={m} onClick={() => appendReason(setMarketPremise, m)}
              className="text-xs px-2 py-1 rounded bg-bg-tertiary border border-border-default text-text-secondary hover:text-text-primary active:bg-bg-hover transition-colors">
              {m}
            </button>
          ))}
        </div>
        <input
          className="input-field"
          value={marketPremise}
          onChange={(e) => setMarketPremise(e.target.value)}
          placeholder="相場の大局観"
        />
      </div>

      {/* Entry reason */}
      <div>
        <label className="label">エントリー根拠</label>
        <div className="flex gap-1 flex-wrap mb-1">
          {QUICK_REASONS.map((r) => (
            <button key={r} onClick={() => appendReason(setEntryReason, r)}
              className="text-xs px-2 py-1 rounded bg-bg-tertiary border border-border-default text-text-secondary hover:text-text-primary active:bg-bg-hover transition-colors">
              {r}
            </button>
          ))}
        </div>
        <textarea
          className="input-field h-16 resize-none"
          value={entryReason}
          onChange={(e) => setEntryReason(e.target.value)}
          placeholder="エントリー根拠"
        />
      </div>

      {/* Exit reason */}
      {hasExit && (
        <div>
          <label className="label">決済根拠</label>
          <div className="flex gap-1 flex-wrap mb-1">
            {["TP到達", "SL到達", "時間切れ", "逆行", "トレンド転換", "手動決済"].map((r) => (
              <button key={r} onClick={() => appendReason(setExitReason, r)}
                className="text-xs px-2 py-1 rounded bg-bg-tertiary border border-border-default text-text-secondary hover:text-text-primary active:bg-bg-hover transition-colors">
                {r}
              </button>
            ))}
          </div>
          <input
            className="input-field"
            value={exitReason}
            onChange={(e) => setExitReason(e.target.value)}
            placeholder="決済根拠"
          />
        </div>
      )}

      {/* Tags */}
      <div>
        <label className="label">タグ</label>
        <div className="flex gap-1 flex-wrap">
          {QUICK_TAGS.map((tag) => (
            <button key={tag} onClick={() => toggleTag(tag)}
              className={clsx(
                "text-xs px-2 py-1 rounded border transition-colors",
                tags.includes(tag)
                  ? "bg-accent-orange/20 border-accent-orange text-accent-orange"
                  : "bg-bg-tertiary border-border-default text-text-secondary"
              )}>
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Confidence */}
      <div>
        <label className="label">自信度</label>
        <div className="flex gap-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setConfidence(n)}
              className={clsx("text-2xl transition-opacity text-accent-orange",
                n <= confidence ? "opacity-100" : "opacity-25")}>
              ★
            </button>
          ))}
        </div>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-primary w-full py-4 text-base font-bold"
      >
        {saving ? "保存中..." : `${activePair} ${direction} を保存する`}
      </button>
    </div>
  );
}
