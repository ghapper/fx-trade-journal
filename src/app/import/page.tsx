"use client";
// src/app/import/page.tsx
import { useState, useCallback } from "react";
import { useAppStore } from "@/store";
import { parseCsv } from "@/lib/utils/ohlc";
import type { OhlcBar, CsvColumnMap } from "@/types";
import { UploadIcon, CheckCircleIcon, AlertCircleIcon } from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";

const COLUMN_PRESETS = [
  {
    label: "MT4/MT5 標準",
    map: { time: "Date", open: "Open", high: "High", low: "Low", close: "Close", volume: "Volume" },
  },
  {
    label: "TradingView",
    map: { time: "time", open: "open", high: "high", low: "low", close: "close", volume: "Volume" },
  },
  {
    label: "カスタム",
    map: { time: "time", open: "open", high: "high", low: "low", close: "close" },
  },
];

export default function ImportPage() {
  const { saveOhlc } = useAppStore();
  const [csvText, setCsvText] = useState("");
  const [pair, setPair] = useState("USDJPY");
  const [colPreset, setColPreset] = useState(0);
  const [colMap, setColMap] = useState<CsvColumnMap>(COLUMN_PRESETS[0].map);
  const [preview, setPreview] = useState<OhlcBar[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [parsed, setParsed] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvText(text);
      setParsed(false);
      setPreview([]);
      setErrors([]);
    };
    reader.readAsText(file, "UTF-8");
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleParse = () => {
    if (!csvText) return;
    const { bars, errors: errs } = parseCsv(csvText, colMap);
    setPreview(bars.slice(0, 20));
    setErrors(errs.slice(0, 10));
    setParsed(true);
    toast(
      bars.length > 0
        ? `${bars.length}件のOHLCデータを読み込みました`
        : "データが読み込めませんでした"
    );
  };

  const handleSave = async () => {
    if (!csvText) return;
    setSaving(true);
    try {
      const { bars, errors: errs } = parseCsv(csvText, colMap);
      if (bars.length === 0) {
        toast.error("保存できるデータがありません");
        return;
      }
      await saveOhlc(pair, bars);
      toast.success(`${bars.length}件を保存しました (${pair})`);
    } catch (e) {
      toast.error("保存に失敗しました");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = (idx: number) => {
    setColPreset(idx);
    setColMap(COLUMN_PRESETS[idx].map);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
      <h1 className="font-bold text-sm text-text-secondary uppercase tracking-wider">
        OHLC データ取込
      </h1>

      {/* Pair */}
      <div>
        <label className="label">通貨ペア</label>
        <input
          className="input-field w-40"
          value={pair}
          onChange={(e) => setPair(e.target.value.toUpperCase())}
          placeholder="USDJPY"
        />
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="card border-dashed border-border-active p-8 text-center cursor-pointer hover:bg-bg-tertiary/50 transition-colors"
        onClick={() => document.getElementById("csv-input")?.click()}
      >
        <UploadIcon size={24} className="mx-auto mb-2 text-text-muted" />
        <p className="text-sm text-text-secondary">
          CSVをドロップ、またはクリックして選択
        </p>
        <p className="text-xs text-text-muted mt-1">1分足OHLC CSV</p>
        <input
          id="csv-input"
          type="file"
          accept=".csv,.txt"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>

      {csvText && (
        <p className="text-xs text-profit flex items-center gap-1">
          <CheckCircleIcon size={12} />
          ファイル読込済 ({csvText.split("\n").length}行)
        </p>
      )}

      {/* Column mapping preset */}
      <div>
        <label className="label">カラムマッピング プリセット</label>
        <div className="flex gap-2 flex-wrap">
          {COLUMN_PRESETS.map((p, i) => (
            <button
              key={i}
              onClick={() => applyPreset(i)}
              className={clsx(
                "text-xs px-3 py-1.5 rounded border transition-colors",
                colPreset === i
                  ? "bg-accent-blue/20 border-accent-blue/30 text-accent-blue"
                  : "bg-bg-tertiary border-border-default text-text-secondary"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Column map fields */}
      <div className="card p-3">
        <p className="text-xs text-text-muted mb-2">カラム名 (CSVヘッダーと一致させる)</p>
        <div className="grid grid-cols-3 gap-2">
          {(["time", "open", "high", "low", "close", "volume"] as const).map((col) => (
            <div key={col}>
              <label className="label">{col}</label>
              <input
                className="input-field text-xs"
                value={(colMap as Record<string, string | undefined>)[col] ?? ""}
                onChange={(e) =>
                  setColMap({ ...colMap, [col]: e.target.value || undefined })
                }
              />
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleParse}
          disabled={!csvText}
          className="btn-secondary flex-1"
        >
          プレビュー
        </button>
        <button
          onClick={handleSave}
          disabled={!csvText || saving}
          className="btn-primary flex-1"
        >
          {saving ? "保存中..." : "保存"}
        </button>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="space-y-1">
          {errors.map((e, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-loss">
              <AlertCircleIcon size={12} />
              {e}
            </div>
          ))}
        </div>
      )}

      {/* Preview table */}
      {parsed && preview.length > 0 && (
        <div>
          <p className="text-xs text-text-muted mb-2">プレビュー (先頭20行)</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-text-muted border-b border-border-subtle">
                  <th className="text-left py-1 pr-3">Time</th>
                  <th className="text-right pr-3">Open</th>
                  <th className="text-right pr-3">High</th>
                  <th className="text-right pr-3">Low</th>
                  <th className="text-right">Close</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((bar, i) => (
                  <tr key={i} className="border-b border-border-subtle/50">
                    <td className="py-1 pr-3 text-text-secondary">
                      {new Date(bar.time * 1000).toISOString().slice(0, 16).replace("T", " ")}
                    </td>
                    <td className="text-right pr-3">{bar.open}</td>
                    <td className="text-right pr-3">{bar.high}</td>
                    <td className="text-right pr-3">{bar.low}</td>
                    <td className="text-right">{bar.close}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CSV spec info */}
      <div className="card p-3 text-xs text-text-muted space-y-1">
        <p className="font-bold text-text-secondary">対応CSV形式</p>
        <p>・1行目はヘッダー行</p>
        <p>・時刻: ISO8601 / YYYY.MM.DD HH:mm / Unixタイムスタンプ(秒/ミリ秒)</p>
        <p>・区切り: カンマ</p>
        <p>・文字コード: UTF-8 または Shift-JIS</p>
        <p>・1分足データを読み込み、表示時に集約します</p>
      </div>
    </div>
  );
}
