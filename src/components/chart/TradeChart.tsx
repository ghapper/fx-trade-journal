"use client";
// src/components/chart/TradeChart.tsx
import { useEffect, useRef, useState, useCallback } from "react";
import type { OhlcBar, ReconstructedTrade, Timeframe } from "@/types";
import { aggregateBars, TIMEFRAME_MINUTES, parseCsv } from "@/lib/utils/ohlc";
import { fetchOhlcFromTwelveData, getDateRangeForTrade } from "@/lib/utils/twelvedata";
import { saveOhlcBars, getOhlcBarsByTradeId, hasOhlcDataForTrade } from "@/lib/db";
import clsx from "clsx";
import { RefreshCwIcon, UploadIcon } from "lucide-react";
import toast from "react-hot-toast";

const TIMEFRAMES: Timeframe[] = ["1m", "5m", "10m", "15m", "30m", "1h", "4h"];
const JST_OFFSET = 9 * 60 * 60;

function toJstBars(bars: OhlcBar[]): OhlcBar[] {
  return bars.map((b) => ({ ...b, time: b.time + JST_OFFSET }));
}

// CSVカラムマッピング候補（ヘッダーを見て自動選択）
function detectColMap(csvText: string) {
  const firstLine = csvText.split("\n")[0];
  const delimiter = firstLine.includes("\t") ? "\t" : ",";
  const headers = firstLine.split(delimiter).map((h) => h.trim().toLowerCase().replace(/"/g, ""));

  const find = (...candidates: string[]) =>
    candidates.find((c) => headers.includes(c)) ?? candidates[0];

  return {
    time: find("time", "date", "datetime", "timestamp"),
    open: find("open"),
    high: find("high"),
    low: find("low"),
    close: find("close"),
    volume: headers.includes("volume") ? "volume" : undefined,
  };
}

interface Props {
  trade: ReconstructedTrade;
}

export function TradeChart({ trade }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<unknown>(null);
  const seriesRef = useRef<unknown>(null);
  const [tf, setTf] = useState<Timeframe>("5m");
  const [ready, setReady] = useState(false);
  const [bars1m, setBars1m] = useState<OhlcBar[]>([]);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showCsvUpload, setShowCsvUpload] = useState(false);

  // OHLCをトレードIDで読み込み、なければAPIで取得
  const loadOhlc = useCallback(async (forceRefresh = false) => {
    setFetching(true);
    setFetchError(null);

    try {
      // まずトレードIDで保存済みデータを確認
      if (!forceRefresh) {
        const hasData = await hasOhlcDataForTrade(trade.id);
        console.log("[TradeChart] hasOhlcDataForTrade:", trade.id, hasData);
        if (hasData) {
          const stored = await getOhlcBarsByTradeId(trade.id);
          console.log("[TradeChart] stored bars:", stored.length);
          if (stored.length > 0) {
            setBars1m(stored);
            setFetching(false);
            return;
          }
        }
      }

      // APIから取得を試みる
      const { startDate, endDate } = getDateRangeForTrade(trade.firstEntryDatetime);
      const { bars, error } = await fetchOhlcFromTwelveData({
        symbol: trade.pair,
        timeframe: "1m",
        outputSize: 5000,
        startDate,
        endDate,
      });

      if (error) {
        setFetchError(error);
        setShowCsvUpload(true);
      } else if (bars.length > 0) {
        // エントリー時刻のデータが含まれているか確認
        const entryTs = Math.floor(new Date(trade.firstEntryDatetime).getTime() / 1000);
        const hasEntryData = bars.some(
          (b) => Math.abs(b.time - entryTs) < 60 * 60 * 24 // 1日以内
        );
        if (!hasEntryData) {
          setFetchError("APIでこの日付のデータを取得できませんでした。CSVから取り込んでください。");
          setShowCsvUpload(true);
        } else {
          setBars1m(bars);
          await saveOhlcBars(trade.pair, "1m", bars, trade.id);
        }
      } else {
        setFetchError("データが取得できませんでした。CSVから取り込んでください。");
        setShowCsvUpload(true);
      }
    } catch {
      setFetchError("取得エラー");
      setShowCsvUpload(true);
    } finally {
      setFetching(false);
    }
  }, [trade.id, trade.pair, trade.firstEntryDatetime]);

  // CSVファイルを読み込んでトレードに紐付けて保存
  const handleCsvUpload = useCallback(async (file: File) => {
    const text = await file.text();
    const colMap = detectColMap(text);
    const { bars, errors } = parseCsv(text, colMap);

    if (errors.length > 0 && bars.length === 0) {
      toast.error(`CSVエラー: ${errors[0]}`);
      return;
    }

    if (bars.length === 0) {
      toast.error("CSVからデータを読み込めませんでした");
      return;
    }

    setBars1m(bars);
    await saveOhlcBars(trade.pair, "1m", bars, trade.id);
    setShowCsvUpload(false);
    setFetchError(null);
    toast.success(`${bars.length}件のOHLCデータを保存しました`);
  }, [trade.pair, trade.id]);

  useEffect(() => {
    loadOhlc();
  }, [loadOhlc]);

  // チャート初期化
  useEffect(() => {
    if (!containerRef.current) return;
    (async () => {
      const LWC = await import("lightweight-charts");
      const createChart = (LWC as any).createChart;
      const container = containerRef.current;
      if (!container) return;

      const chart = createChart(container, {
        width: container.clientWidth,
        height: container.clientHeight,
        layout: { background: { color: "#0a0a0f" }, textColor: "#8888aa" },
        grid: { vertLines: { color: "#1a1a24" }, horzLines: { color: "#1a1a24" } },
        rightPriceScale: { borderColor: "#1e1e2e" },
        timeScale: { borderColor: "#1e1e2e", timeVisible: true, secondsVisible: false },
      });

      const series = chart.addCandlestickSeries({
        upColor: "#22c55e", downColor: "#ef4444",
        borderUpColor: "#22c55e", borderDownColor: "#ef4444",
        wickUpColor: "#22c55e", wickDownColor: "#ef4444",
      });

      chartRef.current = chart;
      seriesRef.current = series;
      setReady(true);

      const ro = new ResizeObserver(() => {
        if (containerRef.current && chartRef.current) {
          (chartRef.current as any).applyOptions({
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
          });
        }
      });
      ro.observe(container);
      return () => { ro.disconnect(); };
    })();

    return () => {
      if (chartRef.current) {
        try { (chartRef.current as any).remove(); } catch {}
        chartRef.current = null;
        seriesRef.current = null;
        setReady(false);
      }
    };
  }, []);

  // データ更新
  useEffect(() => {
    if (!ready || !seriesRef.current || bars1m.length === 0) return;
    try {
      const rawBars = aggregateBars(bars1m, tf);
      const jstBars = toJstBars(rawBars);
      (seriesRef.current as any).setData(jstBars);
    } catch (e) { console.error("Chart data error:", e); }
  }, [ready, bars1m, tf]);

  // マーカー＋スクロール
  useEffect(() => {
    if (!ready || !seriesRef.current || bars1m.length === 0) return;
    try {
      const tfSeconds = TIMEFRAME_MINUTES[tf] * 60;
      const markers: unknown[] = [];

      for (const fill of trade.fills) {
        const ts = Math.floor(new Date(fill.datetime).getTime() / 1000) + JST_OFFSET;
        const barTime = Math.floor(ts / tfSeconds) * tfSeconds;
        if (fill.type === "ENTRY") {
          markers.push({
            time: barTime,
            position: trade.direction === "BUY" ? "belowBar" : "aboveBar",
            color: "#3b82f6",
            shape: trade.direction === "BUY" ? "arrowUp" : "arrowDown",
            text: `E ${fill.price}`, size: 1,
          });
        } else {
          markers.push({
            time: barTime,
            position: trade.direction === "BUY" ? "aboveBar" : "belowBar",
            color: trade.totalPnlPips >= 0 ? "#22c55e" : "#ef4444",
            shape: trade.direction === "BUY" ? "arrowDown" : "arrowUp",
            text: `X ${fill.price}`, size: 1,
          });
        }
      }

      markers.sort((a: any, b: any) => a.time - b.time);
      (seriesRef.current as any).setMarkers(markers);

      if (chartRef.current) {
        const entryFills = trade.fills.filter((f) => f.type === "ENTRY");
        const exitFills = trade.fills.filter((f) => f.type === "EXIT");
        if (entryFills.length > 0) {
          const entryTs = Math.floor(new Date(entryFills[0].datetime).getTime() / 1000) + JST_OFFSET;
          const exitTs = exitFills.length > 0
            ? Math.floor(new Date(exitFills[exitFills.length - 1].datetime).getTime() / 1000) + JST_OFFSET
            : entryTs + tfSeconds * 10;
          const padding = Math.max((exitTs - entryTs) * 3, tfSeconds * 30);
          try {
            (chartRef.current as any).timeScale().setVisibleRange({
              from: entryTs - padding,
              to: exitTs + padding,
            });
          } catch {}
        }
      }
    } catch (e) { console.error("Chart marker error:", e); }
  }, [ready, trade, tf, bars1m]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border-subtle bg-bg-secondary flex-shrink-0 flex-wrap">
        {TIMEFRAMES.map((t) => (
          <button key={t} onClick={() => setTf(t)}
            className={clsx("px-2 py-0.5 text-xs rounded transition-colors",
              tf === t ? "bg-accent-blue/20 text-accent-blue" : "text-text-muted hover:text-text-secondary")}>
            {t}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          {/* CSVアップロードボタン */}
          <label className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary cursor-pointer transition-colors">
            <UploadIcon size={12} />
            CSV
            <input
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleCsvUpload(file);
                e.target.value = "";
              }}
            />
          </label>
          <button onClick={() => loadOhlc(true)} disabled={fetching}
            className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors">
            <RefreshCwIcon size={12} className={fetching ? "animate-spin" : ""} />
            {fetching ? "取得中..." : "API更新"}
          </button>
        </div>
      </div>

      {/* Chart */}
      <div ref={containerRef} className="flex-1 relative">
        {bars1m.length === 0 && !fetching && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-text-muted text-sm p-4">
            {fetchError && <p className="text-xs text-loss text-center">{fetchError}</p>}
            <div className="flex flex-col items-center gap-2">
              <label className="flex items-center gap-2 btn-secondary cursor-pointer text-xs">
                <UploadIcon size={14} />
                CSVをアップロード
                <input
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleCsvUpload(file);
                    e.target.value = "";
                  }}
                />
              </label>
              <button onClick={() => loadOhlc(true)} className="text-xs text-accent-blue hover:underline">
                APIから再取得する
              </button>
            </div>
          </div>
        )}
        {fetching && bars1m.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-text-muted text-sm">
            チャートデータを取得中...
          </div>
        )}
      </div>
    </div>
  );
}
