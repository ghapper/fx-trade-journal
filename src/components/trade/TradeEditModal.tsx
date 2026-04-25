"use client";
// src/components/trade/TradeEditModal.tsx
import { useState } from "react";
import { useAppStore } from "@/store";
import type { TradeGroup, Fill, Direction } from "@/types";
import { generateId, CURRENCY_PAIRS } from "@/lib/utils";
import { XIcon, PlusIcon, Trash2Icon } from "lucide-react";
import clsx from "clsx";
import toast from "react-hot-toast";

interface Props {
  tradeGroup?: TradeGroup;
  onClose: () => void;
  defaultPair?: string;
}

const EMPTY_NOTE = {
  entryReason: "",
  exitReason: "",
  marketPremise: "",
  improvements: "",
  memo: "",
  tags: [] as string[],
  confidence: 3,
  tpPrice: undefined as number | undefined,
  slPrice: undefined as number | undefined,
  screenshotUrl: undefined as string | undefined,
};

export function TradeEditModal({ tradeGroup, onClose, defaultPair = "USDJPY" }: Props) {
  const { saveTrade, settings } = useAppStore();

  const [pair, setPair] = useState(tradeGroup?.pair ?? defaultPair);
  const [direction, setDirection] = useState<Direction>(tradeGroup?.direction ?? "BUY");
  const [note, setNote] = useState(tradeGroup?.note ?? EMPTY_NOTE);
  const [fills, setFills] = useState<Fill[]>(
    tradeGroup?.fills ?? [
      {
        id: generateId(),
        tradeGroupId: "",
        type: "ENTRY",
        pair: defaultPair,
        direction: "BUY",
        price: 0,
        lots: 0.1,
        datetime: new Date().toISOString().slice(0, 16),
        createdAt: new Date().toISOString(),
      },
    ]
  );
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);

  const addFill = (type: "ENTRY" | "EXIT") => {
    const lastFill = fills[fills.length - 1];
    setFills([
      ...fills,
      {
        id: generateId(),
        tradeGroupId: "",
        type,
        pair,
        direction,
        price: lastFill?.price ?? 0,
        lots: lastFill?.lots ?? 0.1,
        datetime: new Date().toISOString().slice(0, 16),
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  const updateFill = (id: string, field: keyof Fill, value: unknown) => {
    setFills(fills.map((f) => (f.id === id ? { ...f, [field]: value } : f)));
  };

  const removeFill = (id: string) => {
    if (fills.length <= 1) return;
    setFills(fills.filter((f) => f.id !== id));
  };

  const addTag = (tag: string) => {
    if (!tag.trim() || note.tags.includes(tag.trim())) return;
    setNote({ ...note, tags: [...note.tags, tag.trim()] });
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setNote({ ...note, tags: note.tags.filter((t) => t !== tag) });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const id = tradeGroup?.id ?? generateId();
      const now = new Date().toISOString();
      const tg: TradeGroup = {
        id,
        pair,
        direction,
        createdAt: tradeGroup?.createdAt ?? now,
        note,
        fills: fills.map((f) => ({
          ...f,
          pair,
          direction,
          tradeGroupId: id,
          price: Number(f.price),
          lots: Number(f.lots),
          datetime:
            typeof f.datetime === "string" && f.datetime.length === 16
              ? f.datetime + ":00"
              : f.datetime,
        })),
      };
      await saveTrade(tg);
      toast.success("保存しました");
      onClose();
    } catch (e) {
      toast.error("保存に失敗しました");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const entryReasonPresets = settings?.entryReasonPresets ?? [];
  const exitReasonPresets = settings?.exitReasonPresets ?? [];
  const marketPremisePresets = settings?.marketPremisePresets ?? [];
  const tagPresets = settings?.tagPresets ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-auto bg-bg-secondary border border-border-default rounded-t-xl md:rounded-xl p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-sm">
            {tradeGroup ? "トレード編集" : "新規トレード"}
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <XIcon size={18} />
          </button>
        </div>

        {/* Pair & direction */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">通貨ペア</label>
            <select className="input-field" value={pair} onChange={(e) => setPair(e.target.value)}>
              {CURRENCY_PAIRS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">売買</label>
            <div className="grid grid-cols-2 gap-1">
              {(["BUY", "SELL"] as Direction[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDirection(d)}
                  className={clsx(
                    "py-2 rounded text-sm font-bold transition-colors",
                    direction === d
                      ? d === "BUY"
                        ? "bg-accent-blue text-white"
                        : "bg-loss text-white"
                      : "bg-bg-tertiary text-text-secondary border border-border-default"
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Fills */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">約定履歴</label>
            <div className="flex gap-1">
              <button onClick={() => addFill("ENTRY")} className="flex items-center gap-0.5 text-xs text-accent-blue hover:underline">
                <PlusIcon size={12} /> エントリー追加
              </button>
              <span className="text-text-muted text-xs">|</span>
              <button onClick={() => addFill("EXIT")} className="flex items-center gap-0.5 text-xs text-loss hover:underline">
                <PlusIcon size={12} /> エグジット追加
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {fills.map((fill) => (
              <div key={fill.id} className="card p-2 space-y-2">
                <div className="flex items-center gap-2">
                  <select
                    className="input-field w-28"
                    value={fill.type}
                    onChange={(e) => updateFill(fill.id, "type", e.target.value)}
                  >
                    <option value="ENTRY">ENTRY</option>
                    <option value="EXIT">EXIT</option>
                  </select>
                  <button
                    onClick={() => removeFill(fill.id)}
                    disabled={fills.length <= 1}
                    className="ml-auto text-text-muted hover:text-loss disabled:opacity-30"
                  >
                    <Trash2Icon size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="label">日時</label>
                    <input
                      type="datetime-local"
                      className="input-field text-xs"
                      value={fill.datetime.slice(0, 16)}
                      onChange={(e) => updateFill(fill.id, "datetime", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">価格</label>
                    <input
                      type="number"
                      step="0.001"
                      className="input-field"
                      value={fill.price || ""}
                      onChange={(e) => updateFill(fill.id, "price", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">ロット</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input-field"
                      value={fill.lots || ""}
                      onChange={(e) => updateFill(fill.id, "lots", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TP/SL */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">利確予定</label>
            <input
              type="number"
              step="0.001"
              className="input-field"
              value={note.tpPrice ?? ""}
              onChange={(e) =>
                setNote({ ...note, tpPrice: e.target.value ? Number(e.target.value) : undefined })
              }
              placeholder="オプション"
            />
          </div>
          <div>
            <label className="label">損切予定</label>
            <input
              type="number"
              step="0.001"
              className="input-field"
              value={note.slPrice ?? ""}
              onChange={(e) =>
                setNote({ ...note, slPrice: e.target.value ? Number(e.target.value) : undefined })
              }
              placeholder="オプション"
            />
          </div>
        </div>

        {/* Market premise */}
        <PresetTextArea
          label="相場前提"
          value={note.marketPremise}
          onChange={(v) => setNote({ ...note, marketPremise: v })}
          presets={marketPremisePresets}
        />

        {/* Entry reason */}
        <PresetTextArea
          label="エントリー根拠"
          value={note.entryReason}
          onChange={(v) => setNote({ ...note, entryReason: v })}
          presets={entryReasonPresets}
        />

        {/* Exit reason */}
        <PresetTextArea
          label="決済根拠"
          value={note.exitReason}
          onChange={(v) => setNote({ ...note, exitReason: v })}
          presets={exitReasonPresets}
        />

        {/* Improvements */}
        <div>
          <label className="label">改善点</label>
          <textarea
            className="input-field h-16 resize-none"
            value={note.improvements}
            onChange={(e) => setNote({ ...note, improvements: e.target.value })}
            placeholder="次回への改善点"
          />
        </div>

        {/* Memo */}
        <div>
          <label className="label">メモ</label>
          <textarea
            className="input-field h-16 resize-none"
            value={note.memo}
            onChange={(e) => setNote({ ...note, memo: e.target.value })}
          />
        </div>

        {/* Tags */}
        <div>
          <label className="label">タグ</label>
          <div className="flex gap-1 flex-wrap mb-2">
            {note.tags.map((tag) => (
              <button
                key={tag}
                onClick={() => removeTag(tag)}
                className="tag flex items-center gap-1 hover:border-loss/50 hover:text-loss"
              >
                {tag} <XIcon size={10} />
              </button>
            ))}
          </div>
          <div className="flex gap-1 flex-wrap mb-1">
            {tagPresets
              .filter((t) => !note.tags.includes(t))
              .map((t) => (
                <button
                  key={t}
                  onClick={() => addTag(t)}
                  className="text-xs px-2 py-0.5 rounded border border-dashed border-border-default text-text-muted hover:text-text-primary hover:border-border-active"
                >
                  +{t}
                </button>
              ))}
          </div>
          <div className="flex gap-1">
            <input
              className="input-field flex-1"
              placeholder="カスタムタグ"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag(tagInput);
                }
              }}
            />
            <button
              onClick={() => addTag(tagInput)}
              className="btn-secondary px-3"
            >
              追加
            </button>
          </div>
        </div>

        {/* Confidence */}
        <div>
          <label className="label">自信度</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setNote({ ...note, confidence: n })}
                className={clsx(
                  "text-lg transition-opacity",
                  n <= note.confidence ? "opacity-100" : "opacity-30"
                )}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        {/* Screenshot URL */}
        <div>
          <label className="label">スクリーンショットURL (オプション)</label>
          <input
            className="input-field"
            placeholder="https://..."
            value={note.screenshotUrl ?? ""}
            onChange={(e) =>
              setNote({ ...note, screenshotUrl: e.target.value || undefined })
            }
          />
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary w-full py-3 text-base"
        >
          {saving ? "保存中..." : "保存"}
        </button>
      </div>
    </div>
  );
}

function PresetTextArea({
  label,
  value,
  onChange,
  presets,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  presets: string[];
}) {
  const append = (preset: string) => {
    onChange(value ? `${value}、${preset}` : preset);
  };

  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex gap-1 flex-wrap mb-1">
        {presets.map((p) => (
          <button
            key={p}
            onClick={() => append(p)}
            className="text-xs px-2 py-0.5 rounded bg-bg-tertiary border border-border-default text-text-secondary hover:text-text-primary hover:border-border-active transition-colors"
          >
            {p}
          </button>
        ))}
      </div>
      <textarea
        className="input-field h-16 resize-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={label}
      />
    </div>
  );
}
