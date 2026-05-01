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

// ---- OHLC取込 ----
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
    label: "カスタム",
    map: { time: "time", open: "open", high: "high", low: "low", close: "close" },
  },
];

// ---- 取引履歴取込 ----
interface TradeHistoryColMap {
  pair: string;
  direction: string;
  type: string;        // 新規/決済の区分カラム
  entryValue: string;  // 「新規」に該当する値
  exitValue: string;   // 「決済」に該当する値
  buyValue: string;    // 「買い」に該当する値
  lots: string;
  price: string;
  datetime: string;
}

const DEFAULT_TRADE_COL_MAP: TradeHistoryColMap = {
  pair: "通貨ペア",
  direction: "売買",
  type: "区分",
  entryValue: "新規",
  exitValue: "決済",
  buyValue: "買",
  lots: "数量（Lot）",
  price: "約定レート",
  datetime: "約定日時",
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
    toast(bars.length > 0 ? `${bars.length}件読み込みました` : "データが読み込めませんでした");
  };

  const handleOhlcSave = async () => {
    setOhlcSaving(true);
    try {
      const { bars, errors } = parseCsv(ohlcCsvText, colMap);
      if (bars.length === 0) { toast.error("保存できるデータがありません"); return; }
      await saveOhlcBars(ohlcPair, "1m", bars);
      toast.success(`${bars.length}件を保存しました (${ohlcPair})`);
    } catch { toast.error("保存に失敗しました"); }
    finally { setOhlcSaving(false); }
  };

  // ---- Trade history handlers ----
  const handleTradeFile = useCallback((file: File) => {
    // まずShift-JISで試み、文字化けしていたらUTF-8で再試行
    const tryRead = (encoding: string) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        // 文字化けチェック（置換文字が多い場合はUTF-8で再試行）
        const corruptCount = (text.match(/�/g) ?? []).length;
        if (corruptCount > 5 && encoding === "UTF-8") {
          tryRead("Shift-JIS");
          return;
        }
        setTradeCsvText(text);
        const lines = text.trim().split("\n");
        if (lines.length > 0) {
          const delimiter = lines[0].includes("\t") ? "\t" : ",";
          const headers = lines[0].split(delimiter).map((h) => h.trim().replace(/"/g, "").replace(/\r/g, ""));
          setTradeHeaders(headers);
          const preview = lines.slice(1, 6).map((line) =>
            line.split(delimiter).map((c) => c.trim().replace(/"/g, "").replace(/\r/g, ""))
          );
          setTradePreview(preview);
        }
        setTradeErrors([]);
      };
      reader.readAsText(file, encoding);
    };
    tryRead("UTF-8");
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
        toast.error(`カラムが見つかりません: ${missing.join(", ")}`);
        setTradeSaving(false);
        return;
      }

      // 行をグループ化（同じ注文番号 or 連続する新規/決済でグループ化）
      const fills: Fill[] = [];

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
          errors.push(`行 ${i + 1}: データ不正`);
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
        toast.error("取り込めるデータがありませんでした");
        setTradeErrors(errors);
        setTradeSaving(false);
        return;
      }

      // ペア・方向ごとにグループ化してFIFOでマッチング
      const groups = new Map<string, Fill[]>();
      for (const fill of fills) {
        const key = `${fill.pair}_${fill.direction}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(fill);
      }

      let savedCount = 0;
      for (const [, groupFills] of groups) {
        // エントリーとエグジットを時系列順にソート
        groupFills.sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());

        // エントリーごとにトレードグループを作成
        const entryFills = groupFills.filter((f) => f.type === "ENTRY");
        const exitFills = groupFills.filter((f) => f.type === "EXIT");

        // シンプルに1エントリー1エグジットでグループ化
        const used = new Set<string>();
        for (const entry of entryFills) {
          const id = generateId();
          entry.tradeGroupId = id;

          // 対応するエグジットを探す（未使用の最初のエグジット）
          const matchExit = exitFills.find(
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
              memo: "CSVインポート",
              tags: ["インポート"],
              confidence: 3,
            },
            fills: tgFills,
          };

          await saveTrade(tg);
          savedCount++;
        }
      }

      toast.success(`${savedCount}件のトレードを取り込みました`);
      if (errors.length > 0) setTradeErrors(errors.slice(0, 5));
    } catch (e) {
      toast.error("取り込みに失敗しました");
      console.error(e);
    } finally {
      setTradeSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
      <h1 className="font-bold text-sm uppercase tracking-wider">データ取込</h1>

      {/* Tab */}
      <div className="grid grid-cols-2 gap-1 bg-bg-tertiary rounded p-1">
        <button
          onClick={() => setTab("trades")}
          className={clsx("py-1.5 rounded text-xs font-bold transition-colors",
            tab === "trades" ? "bg-accent-orange text-black" : "text-text-secondary")}
        >
          取引履歴CSV
        </button>
        <button
          onClick={() => setTab("ohlc")}
          className={clsx("py-1.5 rounded text-xs font-bold transition-colors",
            tab === "ohlc" ? "bg-accent-orange text-black" : "text-text-secondary")}
        >
          OHLCチャートCSV
        </button>
      </div>

      {/* ---- 取引履歴タブ ---- */}
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
            <p className="text-sm text-text-secondary">取引履歴CSVをドロップ、またはクリックして選択</p>
            <input id="trade-csv-input" type="file" accept=".csv,.txt" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleTradeFile(f); }} />
          </div>

          {tradeCsvText && (
            <p className="text-xs text-profit flex items-center gap-1">
              <CheckCircleIcon size={12} />
              ファイル読込済 ({tradeCsvText.split("\n").length}行)
            </p>
          )}

          {/* Column mapping */}
          {tradeHeaders.length > 0 && (
            <div className="card p-3 space-y-3">
              <p className="text-xs font-bold">カラムマッピング設定</p>
              <p className="text-xs text-text-muted">検出されたヘッダー: {tradeHeaders.join(", ")}</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "通貨ペア", key: "pair" },
                  { label: "売買方向", key: "direction" },
                  { label: "区分（新規/決済）", key: "type" },
                  { label: "ロット数", key: "lots" },
                  { label: "約定レート", key: "price" },
                  { label: "約定日時", key: "datetime" },
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
                  <label className="label">新規を表す値</label>
                  <input className="input-field text-xs" value={tradeColMap.entryValue}
                    onChange={(e) => setTradeColMap({ ...tradeColMap, entryValue: e.target.value })} />
                </div>
                <div>
                  <label className="label">決済を表す値</label>
                  <input className="input-field text-xs" value={tradeColMap.exitValue}
                    onChange={(e) => setTradeColMap({ ...tradeColMap, exitValue: e.target.value })} />
                </div>
                <div>
                  <label className="label">買いを表す値</label>
                  <input className="input-field text-xs" value={tradeColMap.buyValue}
                    onChange={(e) => setTradeColMap({ ...tradeColMap, buyValue: e.target.value })} />
                </div>
              </div>
            </div>
          )}

          {/* Preview */}
          {tradePreview.length > 0 && (
            <div className="overflow-x-auto">
              <p className="text-xs text-text-muted mb-1">プレビュー（先頭5行）</p>
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
            {tradeSaving ? "取り込み中..." : "トレード履歴を取り込む"}
          </button>

          <div className="card p-3 text-xs text-text-muted space-y-1">
            <p className="font-bold text-text-secondary">対応形式</p>
            <p>・タブ区切り or カンマ区切りCSV</p>
            <p>・1行目はヘッダー行</p>
            <p>・新規/決済の区分が必要</p>
            <p>・取り込み後、各トレードに根拠などを追記できます</p>
          </div>
        </div>
      )}

      {/* ---- OHLCタブ ---- */}
      {tab === "ohlc" && (
        <div className="space-y-4">
          <div>
            <label className="label">通貨ペア</label>
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
            <p className="text-sm text-text-secondary">1分足OHLCをドロップ、またはクリックして選択</p>
            <input id="ohlc-csv-input" type="file" accept=".csv,.txt" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleOhlcFile(f); }} />
          </div>

          {ohlcCsvText && (
            <p className="text-xs text-profit flex items-center gap-1">
              <CheckCircleIcon size={12} />ファイル読込済
            </p>
          )}

          <div className="card p-3">
            <p className="text-xs text-text-muted mb-2">プリセット</p>
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
            <button onClick={handleOhlcParse} disabled={!ohlcCsvText} className="btn-secondary flex-1">プレビュー</button>
            <button onClick={handleOhlcSave} disabled={!ohlcCsvText || ohlcSaving} className="btn-primary flex-1">
              {ohlcSaving ? "保存中..." : "保存"}
            </button>
          </div>

          {ohlcErrors.map((e, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-loss">
              <AlertCircleIcon size={12} />{e}
            </div>
          ))}

          {ohlcParsed && ohlcPreview.length > 0 && (
            <div className="overflow-x-auto">
              <p className="text-xs text-text-muted mb-2">プレビュー (先頭20行)</p>
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
