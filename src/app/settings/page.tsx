"use client";
// src/app/settings/page.tsx
import { useState, useEffect } from "react";
import { useAppStore } from "@/store";
import type { AppSettings } from "@/types";
import { exportAllData, importAllData } from "@/lib/db";
import { XIcon, PlusIcon, DownloadIcon, UploadIcon } from "lucide-react";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const { settings, saveSettings, loadSettings } = useAppStore();
  const [form, setForm] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  if (!form) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSettings(form);
      toast.success("設定を保存しました");
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const json = await exportAllData();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fx-journal-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("エクスポートしました");
    } catch {
      toast.error("エクスポートに失敗しました");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      await importAllData(text);
      await loadSettings();
      toast.success("インポートしました");
    } catch {
      toast.error("インポートに失敗しました");
    }
    e.target.value = "";
  };

  const removeItem = (field: keyof AppSettings, item: string) => {
    const arr = form[field] as string[];
    setForm({ ...form, [field]: arr.filter((x) => x !== item) });
  };

  const addItem = (field: keyof AppSettings, item: string) => {
    if (!item.trim()) return;
    const arr = form[field] as string[];
    if (arr.includes(item.trim())) return;
    setForm({ ...form, [field]: [...arr, item.trim()] });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-6">
      <h1 className="text-xs text-text-secondary uppercase tracking-wider">設定</h1>

      {/* Default pair & lots */}
      <div className="card p-4 space-y-3">
        <h2 className="text-sm font-bold">デフォルト値</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">デフォルト通貨ペア</label>
            <input
              className="input-field"
              value={form.defaultPair}
              onChange={(e) => setForm({ ...form, defaultPair: e.target.value.toUpperCase() })}
            />
          </div>
          <div>
            <label className="label">デフォルトロット</label>
            <input
              type="number"
              step="0.01"
              className="input-field"
              value={form.defaultLots}
              onChange={(e) => setForm({ ...form, defaultLots: Number(e.target.value) })}
            />
          </div>
        </div>
      </div>

      {/* Tag presets */}
      <PresetEditor
        title="タグプリセット"
        items={form.tagPresets}
        onRemove={(item) => removeItem("tagPresets", item)}
        onAdd={(item) => addItem("tagPresets", item)}
      />

      {/* Entry reason presets */}
      <PresetEditor
        title="エントリー根拠プリセット"
        items={form.entryReasonPresets}
        onRemove={(item) => removeItem("entryReasonPresets", item)}
        onAdd={(item) => addItem("entryReasonPresets", item)}
      />

      {/* Exit reason presets */}
      <PresetEditor
        title="決済根拠プリセット"
        items={form.exitReasonPresets}
        onRemove={(item) => removeItem("exitReasonPresets", item)}
        onAdd={(item) => addItem("exitReasonPresets", item)}
      />

      {/* Market premise presets */}
      <PresetEditor
        title="相場前提プリセット"
        items={form.marketPremisePresets}
        onRemove={(item) => removeItem("marketPremisePresets", item)}
        onAdd={(item) => addItem("marketPremisePresets", item)}
      />

      {/* Chart Colors */}
      <div className="card p-4 space-y-3">
        <h2 className="text-sm font-bold">チャートカラー</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">陽線（上昇）</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                className="w-10 h-8 rounded cursor-pointer bg-transparent border border-border-default"
                value={form.chartColors?.upColor ?? "#00ff41"}
                onChange={(e) => setForm({ ...form, chartColors: { ...(form.chartColors ?? {}), upColor: e.target.value, borderUpColor: e.target.value, wickUpColor: e.target.value } as typeof form.chartColors })}
              />
              <span className="text-xs text-text-secondary">{form.chartColors?.upColor ?? "#00ff41"}</span>
            </div>
          </div>
          <div>
            <label className="label">陰線（下落）</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                className="w-10 h-8 rounded cursor-pointer bg-transparent border border-border-default"
                value={form.chartColors?.downColor ?? "#ff3030"}
                onChange={(e) => setForm({ ...form, chartColors: { ...(form.chartColors ?? {}), downColor: e.target.value, borderDownColor: e.target.value, wickDownColor: e.target.value } as typeof form.chartColors })}
              />
              <span className="text-xs text-text-secondary">{form.chartColors?.downColor ?? "#ff3030"}</span>
            </div>
          </div>
          <div>
            <label className="label">チャート背景</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                className="w-10 h-8 rounded cursor-pointer bg-transparent border border-border-default"
                value={form.chartColors?.background ?? "#000000"}
                onChange={(e) => setForm({ ...form, chartColors: { ...(form.chartColors ?? {}), background: e.target.value } as typeof form.chartColors })}
              />
              <span className="text-xs text-text-secondary">{form.chartColors?.background ?? "#000000"}</span>
            </div>
          </div>
          <div>
            <label className="label">プリセット</label>
            <div className="flex gap-1 flex-wrap">
              {[
                { label: "Bloomberg", up: "#00ff41", down: "#ff3030", bg: "#000000" },
                { label: "TradingView", up: "#26a69a", down: "#ef5350", bg: "#131722" },
                { label: "白背景", up: "#26a69a", down: "#ef5350", bg: "#ffffff" },
              ].map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => setForm({
                    ...form,
                    chartColors: {
                      upColor: preset.up, downColor: preset.down,
                      borderUpColor: preset.up, borderDownColor: preset.down,
                      wickUpColor: preset.up, wickDownColor: preset.down,
                      background: preset.bg,
                    }
                  })}
                  className="text-xs px-2 py-1 rounded border border-border-default text-text-secondary hover:text-text-primary hover:border-border-active transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="btn-primary w-full py-3">
        {saving ? "保存中..." : "設定を保存"}
      </button>

      {/* Data management */}
      <div className="card p-4 space-y-3">
        <h2 className="text-sm font-bold">データ管理</h2>
        <button onClick={handleExport} className="btn-secondary w-full flex items-center justify-center gap-2">
          <DownloadIcon size={16} />
          データをエクスポート
        </button>
        <label className="btn-secondary w-full flex items-center justify-center gap-2 cursor-pointer">
          <UploadIcon size={16} />
          データをインポート
          <input type="file" accept=".json" className="hidden" onChange={handleImport} />
        </label>
        <p className="text-xs text-text-muted">
          インポートは既存データとマージされます。重複するIDは上書きされます。
        </p>
      </div>
    </div>
  );
}

function PresetEditor({
  title,
  items,
  onRemove,
  onAdd,
}: {
  title: string;
  items: string[];
  onRemove: (item: string) => void;
  onAdd: (item: string) => void;
}) {
  const [input, setInput] = useState("");
  return (
    <div className="card p-4 space-y-2">
      <h2 className="text-sm font-bold">{title}</h2>
      <div className="flex gap-1 flex-wrap">
        {items.map((item) => (
          <button
            key={item}
            onClick={() => onRemove(item)}
            className="tag flex items-center gap-1 hover:border-loss/50 hover:text-loss"
          >
            {item} <XIcon size={10} />
          </button>
        ))}
      </div>
      <div className="flex gap-1">
        <input
          className="input-field flex-1"
          placeholder="新しい項目"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAdd(input);
              setInput("");
            }
          }}
        />
        <button
          onClick={() => { onAdd(input); setInput(""); }}
          className="btn-secondary px-3 flex items-center gap-1"
        >
          <PlusIcon size={14} />
        </button>
      </div>
    </div>
  );
}
