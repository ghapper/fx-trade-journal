"use client";
// src/components/chart/TradeChart.tsx
import { useEffect, useRef, useState, useCallback } from "react";
import type { OhlcBar, ReconstructedTrade, Timeframe } from "@/types";
import { aggregateBars, TIMEFRAME_MINUTES } from "@/lib/utils/ohlc";
import { fetchOhlcFromTwelveData, getDateRangeForTrade } from "@/lib/utils/twelvedata";
import { saveOhlcBars, getOhlcBars, hasOhlcData } from "@/lib/db";
import clsx from "clsx";
import { RefreshCwIcon } from "lucide-react";

const TIMEFRAMES: Timeframe[] = ["1m", "5m", "10m", "15m", "30m", "1h", "4h"];

// UTC→JSTオフセット（秒）
const JST_OFFSET = 9 * 60 * 60;

// OHLCのtimeをJSTに変換
function toJstBars(bars: OhlcBar[]): OhlcBar[] {
  return bars.map((b) => ({ ...b, time: b.time + JST_OFFSET }));
}

interface Props {
  trade?: ReconstructedTrade;
  pair?: string;
}

export function TradeChart({ trade, pair }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<unknown>(null);
  const seriesRef = useRef<unknown>(null);
  const [tf, setTf] = useState<Timeframe>("5m");
  const [ready, setReady] = useState(false);
  const [bars1m, setBars1m] = useState<OhlcBar[]>([]);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const targetPair = pair ?? trade?.pair;

  const loadOhlc = useCallback(async (forceRefresh = false) => {
    if (!targetPair) return;
    setFetching(true);
    setFetchError(null);

    try {
      const tradeDatetime = trade?.firstEntryDatetime ?? new Date().toISOString();
      const { startDate, endDate } = getDateRangeForTrade(tradeDatetime);
      const startTime = Math.floor(new Date(startDate).getTime() / 1000);
      const endTime = Math.floor(new Date(endDate).getTime() / 1000) + 86400;

      if (!forceRefresh) {
        const hasData = await hasOhlcData(targetPair, "1m", startTime, endTime);
        if (hasData) {
          const stored = await getOhlcBars(targetPair, "1m", startTime, endTime);
          if (stored.length > 0) {
            setBars1m(stored);
            setFetching(false);
            return;
          }
        }
      }

      const { bars, error } = await fetchOhlcFromTwelveData({
        symbol: targetPair,
        timeframe: "1m",
        outputSize: 5000,
        startDate,
        endDate,
      });

      if (error) {
        setFetchError(error);
      } else if (bars.length > 0) {
        setBars1m(bars);
        await saveOhlcBars(targetPair, "1m", bars);
      } else {
        setFetchError("データが取得できませんでした");
      }
    } catch {
      setFetchError("取得エラー");
    } finally {
      setFetching(false);
    }
  }, [targetPair, trade?.firstEntryDatetime]);

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
        timeScale: {
          borderColor: "#1e1e2e",
          timeVisible: true,
          secondsVisible: false,
          // JSTとして表示
          localization: {
            timeFormatter: (time: number) => {
              const date = new Date(time * 1000);
              return date.toLocaleString("ja-JP", {
                timeZone: "Asia/Tokyo",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              });
            },
          },
        },
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

  // データ更新（JSTに変換して描画）
  useEffect(() => {
    if (!ready || !seriesRef.current || bars1m.length === 0) return;
    try {
      const rawBars = aggregateBars(bars1m, tf);
      const jstBars = toJstBars(rawBars);
      (seriesRef.current as any).setData(jstBars);
    } catch (e) { console.error("Chart data error:", e); }
  }, [ready, bars1m, tf]);

  // マーカー＋エントリー位置にスクロール
  useEffect(() => {
    if (!ready || !seriesRef.current || !trade || bars1m.length === 0) return;
    try {
      const tfSeconds = TIMEFRAME_MINUTES[tf] * 60;
      const markers: unknown[] = [];

      for (const fill of trade.fills) {
        // JSTに変換したtimestampでマーカーを配置
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

      // エントリー位置にスクロール
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
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border-subtle bg-bg-secondary flex-shrink-0">
        {TIMEFRAMES.map((t) => (
          <button key={t} onClick={() => setTf(t)}
            className={clsx("px-2 py-0.5 text-xs rounded transition-colors",
              tf === t ? "bg-accent-blue/20 text-accent-blue" : "text-text-muted hover:text-text-secondary")}>
            {t}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          {fetchError && <span className="text-xs text-loss">{fetchError}</span>}
          {targetPair && (
            <button onClick={() => loadOhlc(true)} disabled={fetching}
              className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors">
              <RefreshCwIcon size={12} className={fetching ? "animate-spin" : ""} />
              {fetching ? "取得中..." : "更新"}
            </button>
          )}
        </div>
      </div>
      <div ref={containerRef} className="flex-1 relative">
        {bars1m.length === 0 && !fetching && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-text-muted text-sm">
            <span>OHLCデータなし</span>
            {targetPair && (
              <button onClick={() => loadOhlc(true)} className="text-xs text-accent-blue hover:underline">
                {targetPair}のデータを取得する
              </button>
            )}
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
