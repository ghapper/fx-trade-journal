"use client";
// src/app/import/page.tsx
import { useState, useCallback } from "react";
import { useAppStore } from "@/store";
import { parseCsv } from "@/lib/utils/ohlc";
import { saveOhlcBars } from "@/lib/db";
import type { OhlcBar, Fill, TradeGroup } from "@/types";
import { UploadIcon, CheckCircleIcon, AlertCircleIcon } from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";
import { generateId } from "@/lib/utils";

// ---- OHLC蜿冶ｾｼ ----
const OHLC_COLUMN_PRESETS = [
  {
    label: "MT4/MT5",
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

// ---- 蜿門ｼ募ｱ･豁ｴ蜿冶ｾｼ ----
interface TradeHistoryColMap {
  pair: string;
  direction: string;
  type: string;        // 譁ｰ隕・豎ｺ貂医・蛹ｺ蛻・き繝ｩ繝
  entryValue: string;  // 縲梧眠隕上阪↓隧ｲ蠖薙☆繧句､
  exitValue: string;   // 縲梧ｱｺ貂医阪↓隧ｲ蠖薙☆繧句､
  buyValue: string;    // 縲瑚ｲｷ縺・阪↓隧ｲ蠖薙☆繧句､
  lots: string;
  price: string;
  datetime: string;
}

const DEFAULT_TRADE_COL_MAP: TradeHistoryColMap = {
  pair: "騾夊ｲｨ繝壹い",
  direction: "螢ｲ雋ｷ",
  type: "蛹ｺ蛻・,
  entryValue: "譁ｰ隕・,
  exitValue: "豎ｺ貂・,
  buyValue: "雋ｷ",
  lots: "謨ｰ驥擾ｼ・ot・・,
  price: "邏・ｮ壹Ξ繝ｼ繝・,
  datetime: "邏・ｮ壽律譎・,
};

type TabType = "ohlc" | "trades";

export default function ImportPage() {
  const { saveTrade } = useAppStore();
  const [tab, setTab] = useState<TabType>("trades");

  // OHLC state
  const [ohlcCsvText, setOhlcCsvText] = useState("");
  const [ohlcPair, setOhlcPair] = useState("USDJPY");
  const [colPreset, setColPreset] = useState(0);
  const [colMap, setColMap] = useState(OHLC_COLUMN_PRESETS[0].map);
  const [ohlcPreview, setOhlcPreview] = useState<OhlcBar[]>([]);
  const [ohlcErrors, setOhlcErrors] = useState<string[]>([]);
  const [ohlcParsed, setOhlcParsed] = useState(false);
  const [ohlcSaving, setOhlcSaving] = useState(false);

  // Trade history state
  const [tradeCsvText, setTradeCsvText] = useState("");
  const [tradeColMap, setTradeColMap] = useState<TradeHistoryColMap>(DEFAULT_TRADE_COL_MAP);
  const [tradePreview, setTradePreview] = useState<string[][]>([]);
  const [tradeHeaders, setTradeHeaders] = useState<string[]>([]);
  const [tradeSaving, setTradeSaving] = useState(false);
  const [tradeErrors, setTradeErrors] = useState<string[]>([]);

  // ---- OHLC handlers ----
  const handleOhlcFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setOhlcCsvText(e.target?.result as string);
      setOhlcParsed(false);
      setOhlcPreview([]);
      setOhlcErrors([]);
    };
    reader.readAsText(file, "UTF-8");
  }, []);

  const handleOhlcParse = () => {
    const { bars, errors } = parseCsv(ohlcCsvText, colMap);
    setOhlcPreview(bars.slice(0, 20));
    setOhlcErrors(errors.slice(0, 10));
    setOhlcParsed(true);
    toast(bars.length > 0 ? `${bars.length}莉ｶ隱ｭ縺ｿ霎ｼ縺ｿ縺ｾ縺励◆` : "繝・・繧ｿ縺瑚ｪｭ縺ｿ霎ｼ繧√∪縺帙ｓ縺ｧ縺励◆");
  };

  const handleOhlcSave = async () => {
    setOhlcSaving(true);
    try {
      const { bars, errors } = parseCsv(ohlcCsvText, colMap);
      if (bars.length === 0) { toast.error("菫晏ｭ倥〒縺阪ｋ繝・・繧ｿ縺後≠繧翫∪縺帙ｓ"); return; }
      await saveOhlcBars(ohlcPair, "1m", bars);
      toast.success(`${bars.length}莉ｶ繧剃ｿ晏ｭ倥＠縺ｾ縺励◆ (${ohlcPair})`);
    } catch { toast.error("菫晏ｭ倥↓螟ｱ謨励＠縺ｾ縺励◆"); }
    finally { setOhlcSaving(false); }
  };

  // ---- Trade history handlers ----
  const handleTradeFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setTradeCsvText(text);
      const lines = text.trim().split("\n");
      if (lines.length > 0) {
        const delimiter = lines[0].includes("\t") ? "\t" : ",";
        const headers = lines[0].split(delimiter).map((h) => h.trim().replace(/"/g, ""));
        setTradeHeaders(headers);
        // 繝励Ξ繝薙Η繝ｼ・亥・鬆ｭ5陦鯉ｼ・        const preview = lines.slice(1, 6).map((line) =>
          line.split(delimiter).map((c) => c.trim().replace(/"/g, ""))
        );
        setTradePreview(preview);
      }
      setTradeErrors([]);
    };
    reader.readAsText(file, "UTF-8");
  }, []);

  const handleTradeImport = async () => {
    if (!tradeCsvText) return;
    setTradeSaving(true);
    const errors: string[] = [];

    try {
      const lines = tradeCsvText.trim().split("\n");
      const delimiter = lines[0].includes("\t") ? "\t" : ",";
      const headers = lines[0].split(delimiter).map((h) => h.trim().replace(/"/g, ""));

      const getIdx = (colName: string) => headers.indexOf(colName);

      const pairIdx = getIdx(tradeColMap.pair);
      const dirIdx = getIdx(tradeColMap.direction);
      const typeIdx = getIdx(tradeColMap.type);
      const lotsIdx = getIdx(tradeColMap.lots);
      const priceIdx = getIdx(tradeColMap.price);
      const datetimeIdx = getIdx(tradeColMap.datetime);

      if ([pairIdx, dirIdx, typeIdx, lotsIdx, priceIdx, datetimeIdx].includes(-1)) {
        const missing = [
          pairIdx === -1 ? tradeColMap.pair : null,
          dirIdx === -1 ? tradeColMap.direction : null,
          typeIdx === -1 ? tradeColMap.type : null,
          lotsIdx === -1 ? tradeColMap.lots : null,
          priceIdx === -1 ? tradeColMap.price : null,
          datetimeIdx === -1 ? tradeColMap.datetime : null,
        ].filter(Boolean);
        toast.error(`繧ｫ繝ｩ繝縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ: ${missing.join(", ")}`);
        setTradeSaving(false);
        return;
      }

      // 陦後ｒ繧ｰ繝ｫ繝ｼ繝怜喧・亥酔縺俶ｳｨ譁・分蜿ｷ or 騾｣邯壹☆繧区眠隕・豎ｺ貂医〒繧ｰ繝ｫ繝ｼ繝怜喧・・      const fills: Fill[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(delimiter).map((c) => c.trim().replace(/"/g, ""));

        const rawType = cols[typeIdx] ?? "";
        const isEntry = rawType.includes(tradeColMap.entryValue);
        const isExit = rawType.includes(tradeColMap.exitValue);
        if (!isEntry && !isExit) continue;

        const rawDir = cols[dirIdx] ?? "";
        const isBuy = rawDir.includes(tradeColMap.buyValue);
        const direction = isBuy ? "BUY" : "SELL";

        const pair = (cols[pairIdx] ?? "").replace(/\//g, "").toUpperCase();
        const lots = parseFloat(cols[lotsIdx] ?? "0");
        const price = parseFloat(cols[priceIdx] ?? "0");
        const datetime = cols[datetimeIdx] ?? "";

        if (!pair || isNaN(lots) || isNaN(price) || !datetime) {
          errors.push(`陦・${i + 1}: 繝・・繧ｿ荳肴ｭ｣`);
          continue;
        }

        fills.push({
          id: generateId(),
          tradeGroupId: "",
          type: isEntry ? "ENTRY" : "EXIT",
          pair,
          direction,
          price,
          lots,
          datetime: datetime.includes("T") ? datetime : datetime.replace(" ", "T") + (datetime.length === 16 ? ":00" : ""),
          createdAt: new Date().toISOString(),
        });
      }

      if (fills.length === 0) {
        toast.error("蜿悶ｊ霎ｼ繧√ｋ繝・・繧ｿ縺後≠繧翫∪縺帙ｓ縺ｧ縺励◆");
        setTradeErrors(errors);
        setTradeSaving(false);
        return;
      }

      // 繝壹い繝ｻ譁ｹ蜷代＃縺ｨ縺ｫ繧ｰ繝ｫ繝ｼ繝怜喧縺励※FIFO縺ｧ繝槭ャ繝√Φ繧ｰ
      const groups = new Map<string, Fill[]>();
      for (const fill of fills) {
        const key = `${fill.pair}_${fill.direction}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(fill);
      }

      let savedCount = 0;
      for (const [, groupFills] of groups) {
        // 繧ｨ繝ｳ繝医Μ繝ｼ縺ｨ繧ｨ繧ｰ繧ｸ繝・ヨ繧呈凾邉ｻ蛻鈴・↓繧ｽ繝ｼ繝・        groupFills.sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());

        // 繧ｨ繝ｳ繝医Μ繝ｼ縺斐→縺ｫ繝医Ξ繝ｼ繝峨げ繝ｫ繝ｼ繝励ｒ菴懈・
        const entryFills = groupFills.filter((f) => f.type === "ENTRY");
        const exitFills = groupFills.filter((f) => f.type === "EXIT");

        // 繧ｷ繝ｳ繝励Ν縺ｫ1繧ｨ繝ｳ繝医Μ繝ｼ1繧ｨ繧ｰ繧ｸ繝・ヨ縺ｧ繧ｰ繝ｫ繝ｼ繝怜喧
        const used = new Set<string>();
        for (const entry of entryFills) {
          const id = generateId();
          entry.tradeGroupId = id;

          // 蟇ｾ蠢懊☆繧九お繧ｰ繧ｸ繝・ヨ繧呈爾縺呻ｼ域悴菴ｿ逕ｨ縺ｮ譛蛻昴・繧ｨ繧ｰ繧ｸ繝・ヨ・・          const matchExit = exitFills.find(
            (ex) => !used.has(ex.id) &&
            new Date(ex.datetime) > new Date(entry.datetime)
          );

          const tgFills: Fill[] = [{ ...entry, tradeGroupId: id }];
          if (matchExit) {
            used.add(matchExit.id);
            tgFills.push({ ...matchExit, tradeGroupId: id });
          }

          const tg: TradeGroup = {
            id,
            pair: entry.pair,
            direction: entry.direction,
            createdAt: entry.datetime,
            note: {
              entryReason: "",
              exitReason: "",
              marketPremise: "",
              improvements: "",
              memo: "CSV繧､繝ｳ繝昴・繝・,
              tags: ["繧､繝ｳ繝昴・繝・],
              confidence: 3,
            },
            fills: tgFills,
          };

          await saveTrade(tg);
          savedCount++;
        }
      }

      toast.success(`${savedCount}莉ｶ縺ｮ繝医Ξ繝ｼ繝峨ｒ蜿悶ｊ霎ｼ縺ｿ縺ｾ縺励◆`);
      if (errors.length > 0) setTradeErrors(errors.slice(0, 5));
    } catch (e) {
      toast.error("蜿悶ｊ霎ｼ縺ｿ縺ｫ螟ｱ謨励＠縺ｾ縺励◆");
      console.error(e);
    } finally {
      setTradeSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
      <h1 className="font-bold text-sm uppercase tracking-wider">繝・・繧ｿ蜿冶ｾｼ</h1>

      {/* Tab */}
      <div className="grid grid-cols-2 gap-1 bg-bg-tertiary rounded p-1">
        <button
          onClick={() => setTab("trades")}
          className={clsx("py-1.5 rounded text-xs font-bold transition-colors",
            tab === "trades" ? "bg-accent-orange text-black" : "text-text-secondary")}
        >
          蜿門ｼ募ｱ･豁ｴCSV
        </button>
        <button
          onClick={() => setTab("ohlc")}
          className={clsx("py-1.5 rounded text-xs font-bold transition-colors",
            tab === "ohlc" ? "bg-accent-orange text-black" : "text-text-secondary")}
        >
          OHLC繝√Ε繝ｼ繝・SV
        </button>
      </div>

      {/* ---- 蜿門ｼ募ｱ･豁ｴ繧ｿ繝・---- */}
      {tab === "trades" && (
        <div className="space-y-4">
          {/* Drop zone */}
          <div
            className="card border-dashed border-border-active p-8 text-center cursor-pointer hover:bg-bg-tertiary/50 transition-colors"
            onClick={() => document.getElementById("trade-csv-input")?.click()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleTradeFile(f); }}
            onDragOver={(e) => e.preventDefault()}
          >
            <UploadIcon size={24} className="mx-auto mb-2 text-text-muted" />
            <p className="text-sm text-text-secondary">蜿門ｼ募ｱ･豁ｴCSV繧偵ラ繝ｭ繝・・縲√∪縺溘・繧ｯ繝ｪ繝・け縺励※驕ｸ謚・/p>
            <input id="trade-csv-input" type="file" accept=".csv,.txt" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleTradeFile(f); }} />
          </div>

          {tradeCsvText && (
            <p className="text-xs text-profit flex items-center gap-1">
              <CheckCircleIcon size={12} />
              繝輔ぃ繧､繝ｫ隱ｭ霎ｼ貂・({tradeCsvText.split("\n").length}陦・
            </p>
          )}

          {/* Column mapping */}
          {tradeHeaders.length > 0 && (
            <div className="card p-3 space-y-3">
              <p className="text-xs font-bold">繧ｫ繝ｩ繝繝槭ャ繝斐Φ繧ｰ險ｭ螳・/p>
              <p className="text-xs text-text-muted">讀懷・縺輔ｌ縺溘・繝・ム繝ｼ: {tradeHeaders.join(", ")}</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "騾夊ｲｨ繝壹い", key: "pair" },
                  { label: "螢ｲ雋ｷ譁ｹ蜷・, key: "direction" },
                  { label: "蛹ｺ蛻・ｼ域眠隕・豎ｺ貂茨ｼ・, key: "type" },
                  { label: "繝ｭ繝・ヨ謨ｰ", key: "lots" },
                  { label: "邏・ｮ壹Ξ繝ｼ繝・, key: "price" },
                  { label: "邏・ｮ壽律譎・, key: "datetime" },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label className="label">{label}</label>
                    <select
                      className="input-field text-xs"
                      value={(tradeColMap as unknown as Record<string, string>)[key]}
                      onChange={(e) => setTradeColMap({ ...tradeColMap, [key]: e.target.value })}
                    >
                      {tradeHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="label">譁ｰ隕上ｒ陦ｨ縺吝､</label>
                  <input className="input-field text-xs" value={tradeColMap.entryValue}
                    onChange={(e) => setTradeColMap({ ...tradeColMap, entryValue: e.target.value })} />
                </div>
                <div>
                  <label className="label">豎ｺ貂医ｒ陦ｨ縺吝､</label>
                  <input className="input-field text-xs" value={tradeColMap.exitValue}
                    onChange={(e) => setTradeColMap({ ...tradeColMap, exitValue: e.target.value })} />
                </div>
                <div>
                  <label className="label">雋ｷ縺・ｒ陦ｨ縺吝､</label>
                  <input className="input-field text-xs" value={tradeColMap.buyValue}
                    onChange={(e) => setTradeColMap({ ...tradeColMap, buyValue: e.target.value })} />
                </div>
              </div>
            </div>
          )}

          {/* Preview */}
          {tradePreview.length > 0 && (
            <div className="overflow-x-auto">
              <p className="text-xs text-text-muted mb-1">繝励Ξ繝薙Η繝ｼ・亥・鬆ｭ5陦鯉ｼ・/p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border-subtle">
                    {tradeHeaders.map((h) => (
                      <th key={h} className="text-left py-1 pr-3 text-text-secondary">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tradePreview.map((row, i) => (
                    <tr key={i} className="border-b border-border-subtle/50">
                      {row.map((cell, j) => (
                        <td key={j} className="py-1 pr-3 text-white">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tradeErrors.length > 0 && (
            <div className="space-y-1">
              {tradeErrors.map((e, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-loss">
                  <AlertCircleIcon size={12} />{e}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleTradeImport}
            disabled={!tradeCsvText || tradeSaving}
            className="btn-primary w-full py-3"
          >
            {tradeSaving ? "蜿悶ｊ霎ｼ縺ｿ荳ｭ..." : "繝医Ξ繝ｼ繝牙ｱ･豁ｴ繧貞叙繧願ｾｼ繧"}
          </button>

          <div className="card p-3 text-xs text-text-muted space-y-1">
            <p className="font-bold text-text-secondary">蟇ｾ蠢懷ｽ｢蠑・/p>
            <p>繝ｻ繧ｿ繝門玄蛻・ｊ or 繧ｫ繝ｳ繝槫玄蛻・ｊCSV</p>
            <p>繝ｻ1陦檎岼縺ｯ繝倥ャ繝繝ｼ陦・/p>
            <p>繝ｻ譁ｰ隕・豎ｺ貂医・蛹ｺ蛻・′蠢・ｦ・/p>
            <p>繝ｻ蜿悶ｊ霎ｼ縺ｿ蠕後∝推繝医Ξ繝ｼ繝峨↓譬ｹ諡縺ｪ縺ｩ繧定ｿｽ險倥〒縺阪∪縺・/p>
          </div>
        </div>
      )}

      {/* ---- OHLC繧ｿ繝・---- */}
      {tab === "ohlc" && (
        <div className="space-y-4">
          <div>
            <label className="label">騾夊ｲｨ繝壹い</label>
            <input className="input-field w-40" value={ohlcPair}
              onChange={(e) => setOhlcPair(e.target.value.toUpperCase())} placeholder="USDJPY" />
          </div>

          <div
            className="card border-dashed border-border-active p-8 text-center cursor-pointer hover:bg-bg-tertiary/50 transition-colors"
            onClick={() => document.getElementById("ohlc-csv-input")?.click()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleOhlcFile(f); }}
            onDragOver={(e) => e.preventDefault()}
          >
            <UploadIcon size={24} className="mx-auto mb-2 text-text-muted" />
            <p className="text-sm text-text-secondary">1蛻・ｶｳOHLC繧偵ラ繝ｭ繝・・縲√∪縺溘・繧ｯ繝ｪ繝・け縺励※驕ｸ謚・/p>
            <input id="ohlc-csv-input" type="file" accept=".csv,.txt" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleOhlcFile(f); }} />
          </div>

          {ohlcCsvText && (
            <p className="text-xs text-profit flex items-center gap-1">
              <CheckCircleIcon size={12} />繝輔ぃ繧､繝ｫ隱ｭ霎ｼ貂・            </p>
          )}

          <div className="card p-3">
            <p className="text-xs text-text-muted mb-2">繝励Μ繧ｻ繝・ヨ</p>
            <div className="flex gap-2 flex-wrap mb-3">
              {OHLC_COLUMN_PRESETS.map((p, i) => (
                <button key={i} onClick={() => { setColPreset(i); setColMap(p.map); }}
                  className={clsx("text-xs px-3 py-1.5 rounded border transition-colors",
                    colPreset === i ? "bg-accent-orange/20 border-accent-orange text-accent-orange"
                      : "bg-bg-tertiary border-border-default text-text-secondary")}>
                  {p.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(["time", "open", "high", "low", "close", "volume"] as const).map((col) => {
                const colMapAny = colMap as Record<string, string | undefined>;
                return (
                  <div key={col}>
                    <label className="label">{col}</label>
                    <input className="input-field text-xs" value={colMapAny[col] ?? ""}
                      onChange={(e) => {
                        const next = { ...colMapAny, [col]: e.target.value || undefined };
                        setColMap(next as typeof colMap);
                      }} />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={handleOhlcParse} disabled={!ohlcCsvText} className="btn-secondary flex-1">繝励Ξ繝薙Η繝ｼ</button>
            <button onClick={handleOhlcSave} disabled={!ohlcCsvText || ohlcSaving} className="btn-primary flex-1">
              {ohlcSaving ? "菫晏ｭ倅ｸｭ..." : "菫晏ｭ・}
            </button>
          </div>

          {ohlcErrors.map((e, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-loss">
              <AlertCircleIcon size={12} />{e}
            </div>
          ))}

          {ohlcParsed && ohlcPreview.length > 0 && (
            <div className="overflow-x-auto">
              <p className="text-xs text-text-muted mb-2">繝励Ξ繝薙Η繝ｼ (蜈磯ｭ20陦・</p>
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
                  {ohlcPreview.map((bar, i) => (
                    <tr key={i} className="border-b border-border-subtle/50">
                      <td className="py-1 pr-3 text-text-secondary">
                        {new Date(bar.time * 1000).toISOString().slice(0, 16).replace("T", " ")}
                      </td>
                      <td className="text-right pr-3 text-white">{bar.open}</td>
                      <td className="text-right pr-3 text-white">{bar.high}</td>
                      <td className="text-right pr-3 text-white">{bar.low}</td>
                      <td className="text-right text-white">{bar.close}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

