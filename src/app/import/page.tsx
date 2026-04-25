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
    label: "MT4/MT5 讓呎ｺ・,
    map: { time: "Date", open: "Open", high: "High", low: "Low", close: "Close", volume: "Volume" },
  },
  {
    label: "TradingView",
    map: { time: "time", open: "open", high: "high", low: "low", close: "close", volume: "Volume" },
  },
  {
    label: "繧ｫ繧ｹ繧ｿ繝",
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
        ? `${bars.length}莉ｶ縺ｮOHLC繝・・繧ｿ繧定ｪｭ縺ｿ霎ｼ縺ｿ縺ｾ縺励◆`
        : "繝・・繧ｿ縺瑚ｪｭ縺ｿ霎ｼ繧√∪縺帙ｓ縺ｧ縺励◆"
    );
  };

  const handleSave = async () => {
    if (!csvText) return;
    setSaving(true);
    try {
      const { bars, errors: errs } = parseCsv(csvText, colMap);
      if (bars.length === 0) {
        toast.error("菫晏ｭ倥〒縺阪ｋ繝・・繧ｿ縺後≠繧翫∪縺帙ｓ");
        return;
      }
      await saveOhlc(pair, bars);
      toast.success(`${bars.length}莉ｶ繧剃ｿ晏ｭ倥＠縺ｾ縺励◆ (${pair})`);
    } catch (e) {
      toast.error("菫晏ｭ倥↓螟ｱ謨励＠縺ｾ縺励◆");
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
        OHLC 繝・・繧ｿ蜿冶ｾｼ
      </h1>

      {/* Pair */}
      <div>
        <label className="label">騾夊ｲｨ繝壹い</label>
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
          CSV繧偵ラ繝ｭ繝・・縲√∪縺溘・繧ｯ繝ｪ繝・け縺励※驕ｸ謚・        </p>
        <p className="text-xs text-text-muted mt-1">1蛻・ｶｳOHLC CSV</p>
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
          繝輔ぃ繧､繝ｫ隱ｭ霎ｼ貂・({csvText.split("\n").length}陦・
        </p>
      )}

      {/* Column mapping preset */}
      <div>
        <label className="label">繧ｫ繝ｩ繝繝槭ャ繝斐Φ繧ｰ 繝励Μ繧ｻ繝・ヨ</label>
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
        <p className="text-xs text-text-muted mb-2">繧ｫ繝ｩ繝蜷・(CSV繝倥ャ繝繝ｼ縺ｨ荳閾ｴ縺輔○繧・</p>
        <div className="grid grid-cols-3 gap-2">
          {(["time", "open", "high", "low", "close", "volume"] as const).map((col) => {
            const colMapAny = colMap as Record<string, string | undefined>;
            return (
              <div key={col}>
                <label className="label">{col}</label>
                <input
                  className="input-field text-xs"
                  value={colMapAny[col] ?? ""}
                  onChange={(e) => {
                    const next = { ...colMapAny, [col]: e.target.value || undefined };
                    setColMap(next as typeof colMap);
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleParse}
          disabled={!csvText}
          className="btn-secondary flex-1"
        >
          繝励Ξ繝薙Η繝ｼ
        </button>
        <button
          onClick={handleSave}
          disabled={!csvText || saving}
          className="btn-primary flex-1"
        >
          {saving ? "菫晏ｭ倅ｸｭ..." : "菫晏ｭ・}
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
          <p className="text-xs text-text-muted mb-2">繝励Ξ繝薙Η繝ｼ (蜈磯ｭ20陦・</p>
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
        <p className="font-bold text-text-secondary">蟇ｾ蠢廚SV蠖｢蠑・/p>
        <p>繝ｻ1陦檎岼縺ｯ繝倥ャ繝繝ｼ陦・/p>
        <p>繝ｻ譎ょ綾: ISO8601 / YYYY.MM.DD HH:mm / Unix繧ｿ繧､繝繧ｹ繧ｿ繝ｳ繝・遘・繝溘Μ遘・</p>
        <p>繝ｻ蛹ｺ蛻・ｊ: 繧ｫ繝ｳ繝・/p>
        <p>繝ｻ譁・ｭ励さ繝ｼ繝・ UTF-8 縺ｾ縺溘・ Shift-JIS</p>
        <p>繝ｻ1蛻・ｶｳ繝・・繧ｿ繧定ｪｭ縺ｿ霎ｼ縺ｿ縲∬｡ｨ遉ｺ譎ゅ↓髮・ｴ・＠縺ｾ縺・/p>
      </div>
    </div>
  );
}

