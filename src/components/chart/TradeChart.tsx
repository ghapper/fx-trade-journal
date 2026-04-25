"use client";
// src/components/chart/TradeChart.tsx
import { useEffect, useRef, useState } from "react";
import type { OhlcBar, ReconstructedTrade, Timeframe } from "@/types";
import { aggregateBars, TIMEFRAME_MINUTES } from "@/lib/utils/ohlc";
import clsx from "clsx";

const TIMEFRAMES: Timeframe[] = ["1m", "5m", "10m", "15m", "30m", "1h", "4h"];

interface Props {
  bars1m: OhlcBar[];
  trade?: ReconstructedTrade;
}

export function TradeChart({ bars1m, trade }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<unknown>(null);
  const seriesRef = useRef<unknown>(null);
  const [tf, setTf] = useState<Timeframe>("5m");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    let chart: unknown;

    (async () => {
      const LWC = await import("lightweight-charts");
      const createChart = (LWC as any).createChart;
      const CrosshairMode = (LWC as any).CrosshairMode;
      const container = containerRef.current!;

      chart = createChart(container, {
        width: container.clientWidth,
        height: container.clientHeight,
        layout: {
          background: { color: "#0a0a0f" },
          textColor: "#8888aa",
        },
        grid: {
          vertLines: { color: "#1a1a24" },
          horzLines: { color: "#1a1a24" },
        },
        crosshair: {
          mode: CrosshairMode?.Normal ?? 1,
        },
        rightPriceScale: {
          borderColor: "#1e1e2e",
        },
        timeScale: {
          borderColor: "#1e1e2e",
          timeVisible: true,
          secondsVisible: false,
        },
      });

      const series = (chart as any).addCandlestickSeries({
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderUpColor: "#22c55e",
        borderDownColor: "#ef4444",
        wickUpColor: "#22c55e",
        wickDownColor: "#ef4444",
      });

      chartRef.current = chart;
      seriesRef.current = series;
      setReady(true);

      const ro = new ResizeObserver(() => {
        if (containerRef.current) {
          (chart as any).applyOptions({
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
        (chartRef.current as any).remove();
        chartRef.current = null;
        seriesRef.current = null;
        setReady(false);
      }
    };
  }, []);

  useEffect(() => {
    if (!ready || !seriesRef.current || bars1m.length === 0) return;
    const bars = aggregateBars(bars1m, tf);
    (seriesRef.current as any).setData(bars);
    if (chartRef.current) {
      (chartRef.current as any).timeScale().fitContent();
    }
  }, [ready, bars1m, tf]);

  useEffect(() => {
    if (!ready || !seriesRef.current || !trade) return;

    const tfMinutes = TIMEFRAME_MINUTES[tf];
    const tfSeconds = tfMinutes * 60;
    const markers: unknown[] = [];

    for (const fill of trade.fills) {
      const ts = Math.floor(new Date(fill.datetime).getTime() / 1000);
      const barTime = Math.floor(ts / tfSeconds) * tfSeconds;

      if (fill.type === "ENTRY") {
        markers.push({
          time: barTime,
          position: trade.direction === "BUY" ? "belowBar" : "aboveBar",
          color: "#3b82f6",
          shape: trade.direction === "BUY" ? "arrowUp" : "arrowDown",
          text: `E ${fill.price}`,
          size: 1,
        });
      } else {
        markers.push({
          time: barTime,
          position: trade.direction === "BUY" ? "aboveBar" : "belowBar",
          color: trade.totalPnlPips >= 0 ? "#22c55e" : "#ef4444",
          shape: trade.direction === "BUY" ? "arrowDown" : "arrowUp",
          text: `X ${fill.price}`,
          size: 1,
        });
      }
    }

    markers.sort((a: any, b: any) => a.time - b.time);
    (seriesRef.current as any).setMarkers(markers);

    if (trade.fills.length > 0 && chartRef.current) {
      const entryFills = trade.fills.filter((f) => f.type === "ENTRY");
      const exitFills = trade.fills.filter((f) => f.type === "EXIT");
      if (entryFills.length > 0 && exitFills.length > 0) {
        const entryTs = Math.floor(new Date(entryFills[0].datetime).getTime() / 1000);
        const exitTs = Math.floor(new Date(exitFills[exitFills.length - 1].datetime).getTime() / 1000);
        const padding = (exitTs - entryTs) * 2 || tfSeconds * 20;
        (chartRef.current as any).timeScale().setVisibleRange({
          from: entryTs - padding,
          to: exitTs + padding,
        });
      }
    }
  }, [ready, trade, tf]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border-subtle bg-bg-secondary flex-shrink-0">
        {TIMEFRAMES.map((t) => (
          <button
            key={t}
            onClick={() => setTf(t)}
            className={clsx(
              "px-2 py-0.5 text-xs rounded transition-colors",
              tf === t ? "bg-accent-blue/20 text-accent-blue" : "text-text-muted hover:text-text-secondary"
            )}
          >
            {t}
          </button>
        ))}
        {bars1m.length === 0 && (
          <span className="ml-auto text-xs text-text-muted">CSVを取込むとチャートが表示されます</span>
        )}
      </div>
      <div ref={containerRef} className="flex-1 relative">
        {bars1m.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-text-muted text-sm">
            OHLCデータなし
          </div>
        )}
      </div>
    </div>
  );
}
