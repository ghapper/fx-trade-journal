"use client";
// src/app/analysis/page.tsx
import { useMemo } from "react";
import { useAppStore } from "@/store";
import {
  calcDailyStats,
  calcPairStats,
  calcTagStats,
  calcHourStats,
  formatPips,
  pipsColor,
} from "@/lib/utils";
import { formatHoldingTime } from "@/lib/fifo";
import clsx from "clsx";

export default function AnalysisPage() {
  const { reconstructedTrades } = useAppStore();

  const daily = useMemo(() => calcDailyStats(reconstructedTrades), [reconstructedTrades]);
  const pairs = useMemo(() => calcPairStats(reconstructedTrades), [reconstructedTrades]);
  const tags = useMemo(() => calcTagStats(reconstructedTrades), [reconstructedTrades]);
  const hours = useMemo(() => calcHourStats(reconstructedTrades), [reconstructedTrades]);

  const total = reconstructedTrades.length;
  const wins = reconstructedTrades.filter((t) => t.isWin).length;
  const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : "0.0";
  const totalPips = reconstructedTrades.reduce((s, t) => s + t.totalPnlPips, 0);
  const avgHolding =
    total > 0
      ? reconstructedTrades.reduce((s, t) => s + t.holdingMinutes, 0) / total
      : 0;

  const maxHourPips = Math.max(...hours.map((h) => Math.abs(h.totalPnlPips)), 1);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-sm">
        分析データがありません
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-6">
      <h1 className="text-xs text-text-secondary uppercase tracking-wider">分析</h1>

      {/* Overall */}
      <div className="grid grid-cols-2 gap-2">
        <SummaryCard label="総トレード数" value={`${total}件`} />
        <SummaryCard label="勝率" value={`${winRate}%`} sub={`${wins}勝 ${total - wins}敗`} />
        <SummaryCard
          label="総損益"
          value={formatPips(totalPips)}
          valueClass={pipsColor(totalPips)}
        />
        <SummaryCard label="平均保有時間" value={formatHoldingTime(Math.round(avgHolding))} />
      </div>

      {/* Pair stats */}
      <Section title="通貨ペア別">
        <div className="space-y-1">
          {pairs.map((p) => (
            <div key={p.pair} className="card p-2 flex items-center gap-3">
              <span className="text-sm font-semibold w-20">{p.pair}</span>
              <div className="flex-1 text-xs text-text-secondary space-x-2">
                <span>{p.tradeCount}件</span>
                <span>勝率{p.winRate.toFixed(0)}%</span>
                <span>{formatHoldingTime(Math.round(p.avgHoldingMinutes))}</span>
              </div>
              <span className={clsx("text-sm font-bold", pipsColor(p.totalPnlPips))}>
                {formatPips(p.totalPnlPips)}
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* Tag stats */}
      {tags.length > 0 && (
        <Section title="タグ別">
          <div className="space-y-1">
            {tags.map((t) => (
              <div key={t.tag} className="card p-2 flex items-center gap-3">
                <span className="tag">{t.tag}</span>
                <div className="flex-1 text-xs text-text-secondary space-x-2">
                  <span>{t.count}件</span>
                  <span>勝率{t.winRate.toFixed(0)}%</span>
                </div>
                <span className={clsx("text-sm font-bold", pipsColor(t.totalPnlPips))}>
                  {formatPips(t.totalPnlPips)}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Hour stats */}
      <Section title="時間帯別 (エントリー時刻)">
        <div className="card p-3">
          <div className="flex items-end gap-0.5 h-24">
            {hours.map((h) => {
              const pct = Math.abs(h.totalPnlPips) / maxHourPips;
              const isPositive = h.totalPnlPips >= 0;
              return (
                <div key={h.hour} className="flex-1 flex flex-col items-center">
                  {h.count > 0 ? (
                    <div
                      className={clsx(
                        "w-full rounded-sm",
                        isPositive ? "bg-profit/60" : "bg-loss/60"
                      )}
                      style={{ height: `${Math.max(pct * 88, 3)}px` }}
                      title={`${h.hour}時: ${h.count}件 ${formatPips(h.totalPnlPips)}`}
                    />
                  ) : (
                    <div className="w-full" style={{ height: "3px" }} />
                  )}
                  {h.hour % 4 === 0 && (
                    <span className="text-[9px] text-text-muted mt-0.5">{h.hour}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* Daily stats */}
      <Section title="日別損益">
        <div className="space-y-1">
          {daily.slice(0, 30).map((d) => (
            <div key={d.date} className="card p-2 flex items-center gap-3">
              <span className="text-xs text-text-secondary w-20">{d.date.slice(5)}</span>
              <span className="text-xs text-text-muted">{d.tradeCount}件</span>
              <span className="text-xs text-text-muted">
                {d.winCount}勝{d.lossCount}敗
              </span>
              <span
                className={clsx(
                  "ml-auto text-sm font-bold",
                  pipsColor(d.totalPnlPips)
                )}
              >
                {formatPips(d.totalPnlPips)}
              </span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  valueClass,
}: {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <div className="card p-3">
      <p className="text-text-muted text-xs mb-1">{label}</p>
      <p className={clsx("text-lg font-bold", valueClass ?? "text-text-primary")}>{value}</p>
      {sub && <p className="text-xs text-text-muted mt-0.5">{sub}</p>}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-xs text-text-secondary uppercase tracking-wider mb-2">{title}</h2>
      {children}
    </div>
  );
}
