"use client";
// src/app/trades/page.tsx
import { useState, useMemo } from "react";
import Link from "next/link";
import { useAppStore } from "@/store";
import { formatDatetime, formatPips, pipsColor, CURRENCY_PAIRS } from "@/lib/utils";
import { formatHoldingTime } from "@/lib/fifo";
import { SearchIcon, FilterIcon } from "lucide-react";
import clsx from "clsx";

export default function TradeListPage() {
  const { reconstructedTrades } = useAppStore();
  const [search, setSearch] = useState("");
  const [filterPair, setFilterPair] = useState("ALL");
  const [filterDir, setFilterDir] = useState("ALL");
  const [filterTag, setFilterTag] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilter, setShowFilter] = useState(false);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    reconstructedTrades.forEach((t) => t.note.tags.forEach((tag) => s.add(tag)));
    return Array.from(s).sort();
  }, [reconstructedTrades]);

  const filtered = useMemo(() => {
    return reconstructedTrades.filter((t) => {
      if (filterPair !== "ALL" && t.pair !== filterPair) return false;
      if (filterDir !== "ALL" && t.direction !== filterDir) return false;
      if (filterTag && !t.note.tags.includes(filterTag)) return false;
      if (dateFrom && t.firstEntryDatetime.slice(0, 10) < dateFrom) return false;
      if (dateTo && t.firstEntryDatetime.slice(0, 10) > dateTo) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          t.pair.toLowerCase().includes(q) ||
          t.note.entryReason.toLowerCase().includes(q) ||
          t.note.memo.toLowerCase().includes(q) ||
          t.note.tags.some((tag) => tag.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [reconstructedTrades, filterPair, filterDir, filterTag, dateFrom, dateTo, search]);

  const totalPips = filtered.reduce((s, t) => s + t.totalPnlPips, 0);
  const wins = filtered.filter((t) => t.isWin).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            className="input-field pl-8"
            placeholder="検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowFilter(!showFilter)}
          className={clsx(
            "flex items-center gap-1 px-3 py-2 rounded border text-xs transition-colors",
            showFilter
              ? "bg-accent-blue/20 border-accent-blue/30 text-accent-blue"
              : "bg-bg-tertiary border-border-default text-text-secondary"
          )}
        >
          <FilterIcon size={14} />
          フィルタ
        </button>
      </div>

      {/* Filter panel */}
      {showFilter && (
        <div className="card p-3 grid grid-cols-2 gap-2">
          <div>
            <label className="label">通貨ペア</label>
            <select
              className="input-field"
              value={filterPair}
              onChange={(e) => setFilterPair(e.target.value)}
            >
              <option value="ALL">全て</option>
              {CURRENCY_PAIRS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">方吁E/label>
            <select
              className="input-field"
              value={filterDir}
              onChange={(e) => setFilterDir(e.target.value)}
            >
              <option value="ALL">全て</option>
              <option value="BUY">BUY</option>
              <option value="SELL">SELL</option>
            </select>
          </div>
          <div>
            <label className="label">日付FROM</label>
            <input
              type="date"
              className="input-field"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="label">日付TO</label>
            <input
              type="date"
              className="input-field"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <label className="label">タグ</label>
            <select
              className="input-field"
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
            >
              <option value="">全て</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>
          <button
            className="col-span-2 btn-secondary text-xs"
            onClick={() => {
              setFilterPair("ALL");
              setFilterDir("ALL");
              setFilterTag("");
              setDateFrom("");
              setDateTo("");
              setSearch("");
            }}
          >
            リセチE��
          </button>
        </div>
      )}

      {/* Summary */}
      <div className="flex items-center gap-4 text-xs text-text-secondary px-1">
        <span>{filtered.length}件</span>
        <span>勝率 {filtered.length > 0 ? ((wins / filtered.length) * 100).toFixed(0) : 0}%</span>
        <span className={pipsColor(totalPips)}>{formatPips(totalPips)}</span>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="card p-8 text-center text-text-muted text-sm">
          トレードが見つかりません
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map((t) => (
            <Link key={t.id} href={`/trades/${t.id}`}>
              <div className="card p-3 hover:border-border-active transition-colors cursor-pointer">
                <div className="flex items-start gap-3">
                  <div
                    className={clsx(
                      "text-xs font-bold pt-0.5 w-10 text-center",
                      t.direction === "BUY" ? "text-accent-blue" : "text-loss"
                    )}
                  >
                    {t.direction}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">{t.pair}</span>
                      <span className="text-xs text-text-muted">
                        {formatDatetime(t.firstEntryDatetime, "MM/dd HH:mm")}
                      </span>
                      <span className="text-xs text-text-muted">
                        {formatHoldingTime(t.holdingMinutes)}
                      </span>
                    </div>
                    {t.note.entryReason && (
                      <p className="text-xs text-text-secondary mt-0.5 truncate">
                        {t.note.entryReason}
                      </p>
                    )}
                    {t.note.tags.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {t.note.tags.slice(0, 4).map((tag) => (
                          <span key={tag} className="tag">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div
                      className={clsx(
                        "text-sm font-bold",
                        pipsColor(t.totalPnlPips)
                      )}
                    >
                      {formatPips(t.totalPnlPips)}
                    </div>
                    <div className="text-xs text-text-muted">
                      {t.totalLots}lot
                    </div>
                    <div className="text-xs mt-0.5">
                      {t.note.confidence ? "☁E.repeat(t.note.confidence) : ""}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

