"use client";
// src/app/page.tsx
import Link from "next/link";
import { useAppStore } from "@/store";
import { formatDatetime, formatPips, pipsColor, calcDailyStats } from "@/lib/utils";
import { formatHoldingTime } from "@/lib/fifo";
import { useSampleData } from "@/hooks/useSampleData";
import {
  PlusCircleIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ActivityIcon,
  DatabaseIcon,
} from "lucide-react";
import clsx from "clsx";

export default function HomePage() {
  const { reconstructedTrades, isLoading } = useAppStore();
  const { loadSample, loading: sampleLoading, hasSample } = useSampleData();

  const today = new Date().toISOString().slice(0, 10);
  const todayTrades = reconstructedTrades.filter(
    (t) => t.firstEntryDatetime.slice(0, 10) === today
  );
  const recentTrades = reconstructedTrades.slice(0, 10);
  const dailyStats = calcDailyStats(reconstructedTrades);

  const totalPips = reconstructedTrades.reduce((s, t) => s + t.totalPnlPips, 0);
  const winCount = reconstructedTrades.filter((t) => t.isWin).length;
  const winRate =
    reconstructedTrades.length > 0
      ? ((winCount / reconstructedTrades.length) * 100).toFixed(0)
      : "0";

  const last7 = dailyStats.slice(0, 7);
  const last7Pips = last7.reduce((s, d) => s + d.totalPnlPips, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-sm">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <StatCard
          label="総損益"
          value={formatPips(totalPips)}
          colorClass={pipsColor(totalPips)}
          icon={totalPips >= 0 ? TrendingUpIcon : TrendingDownIcon}
        />
        <StatCard
          label="勝率"
          value={`${winRate}%`}
          sub={`${winCount}/${reconstructedTrades.length}`}
          colorClass="text-text-primary"
          icon={ActivityIcon}
        />
        <StatCard
          label="今日"
          value={`${todayTrades.length}件`}
          sub={
            todayTrades.length > 0
              ? formatPips(todayTrades.reduce((s, t) => s + t.totalPnlPips, 0))
              : "—"
          }
          colorClass="text-text-primary"
          icon={ActivityIcon}
        />
      </div>

      <div className="flex gap-2">
        <Link
          href="/quick-input"
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-accent-blue hover:bg-blue-500 rounded-lg text-white text-sm font-medium transition-colors"
        >
          <PlusCircleIcon size={18} />
          クイック入力
        </Link>
        {!hasSample && (
          <button
            onClick={loadSample}
            disabled={sampleLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border-default text-text-secondary hover:text-text-primary hover:border-border-active text-xs transition-colors"
          >
            <DatabaseIcon size={14} />
            {sampleLoading ? "読込中…" : "サンプル"}
          </button>
        )}
      </div>

      {last7.length > 0 && (
        <section>
          <h2 className="text-text-secondary text-xs mb-2 uppercase tracking-wider">
            直近 {last7.length} 日間
          </h2>
          <div className="card p-3">
            <div className="flex items-end gap-1 h-16">
              {last7.slice().reverse().map((d) => {
                const maxAbs = Math.max(...last7.map((x) => Math.abs(x.totalPnlPips)), 1);
                const pct = Math.abs(d.totalPnlPips) / maxAbs;
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5">
                    <div
                      className={clsx("w-full rounded-sm", d.totalPnlPips >= 0 ? "bg-profit/60" : "bg-loss/60")}
                      style={{ height: `${Math.max(pct * 56, 4)}px` }}
                    />
                    <span className="text-[9px] text-text-muted">{d.date.slice(5)}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className={clsx("text-sm font-medium", pipsColor(last7Pips))}>
                合計: {formatPips(last7Pips)}
              </p>
              <span className="text-xs text-text-muted">
                {last7.reduce((s, d) => s + d.tradeCount, 0)}件
              </span>
            </div>
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-text-secondary text-xs uppercase tracking-wider">直近トレード</h2>
          <Link href="/trades" className="text-xs text-accent-blue hover:underline">全件 →</Link>
        </div>
        {recentTrades.length === 0 ? (
          <div className="card p-8 text-center space-y-2">
            <p className="text-text-muted text-sm">トレードがありません</p>
            <p className="text-text-muted text-xs">「クイック入力」から記録するか、「サンプル」ボタンでデモデータを確認できます</p>
          </div>
        ) : (
          <div className="space-y-1">
            {recentTrades.map((t) => (
              <Link key={t.id} href={`/trades/${t.id}`}>
                <div className="card p-3 flex items-center gap-3 hover:border-border-active transition-colors cursor-pointer">
                  <span className={clsx("text-xs font-bold w-10 text-center flex-shrink-0", t.direction === "BUY" ? "text-accent-blue" : "text-loss")}>
                    {t.direction}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{t.pair}</span>
                      <span className="text-xs text-text-muted">{formatDatetime(t.firstEntryDatetime)}</span>
                    </div>
                    {t.note.entryReason && (
                      <p className="text-xs text-text-secondary mt-0.5 truncate">{t.note.entryReason}</p>
                    )}
                    {t.note.tags.length > 0 && (
                      <div className="flex gap-1 mt-0.5 flex-wrap">
                        {t.note.tags.slice(0, 3).map((tag) => <span key={tag} className="tag">{tag}</span>)}
                      </div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={clsx("text-sm font-medium", pipsColor(t.totalPnlPips))}>{formatPips(t.totalPnlPips)}</div>
                    <div className="text-xs text-text-muted">{formatHoldingTime(t.holdingMinutes)}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, sub, colorClass, icon: Icon }: {
  label: string; value: string; sub?: string; colorClass: string; icon: React.ElementType;
}) {
  return (
    <div className="card p-3">
      <div className="flex items-center gap-1 text-text-muted text-xs mb-1">
        <Icon size={11} />{label}
      </div>
      <div className={clsx("text-base font-bold", colorClass)}>{value}</div>
      {sub && <div className="text-xs text-text-muted mt-0.5">{sub}</div>}
    </div>
  );
}
