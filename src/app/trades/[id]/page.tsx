"use client";
// src/app/trades/[id]/page.tsx
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAppStore } from "@/store";
import { formatDatetime, formatPips, pipsColor } from "@/lib/utils";
import { formatHoldingTime } from "@/lib/fifo";
import { TradeChart } from "@/components/chart/TradeChart";
import { TradeEditModal } from "@/components/trade/TradeEditModal";
import { EditIcon, Trash2Icon, ChevronLeftIcon } from "lucide-react";
import clsx from "clsx";

import toast from "react-hot-toast";

export default function TradeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { reconstructedTrades, tradeGroups, deleteTrade } = useAppStore();

  const trade = reconstructedTrades.find((t) => t.id === id);
  const tradeGroup = tradeGroups.find((tg) => tg.id === id);
  const [editOpen, setEditOpen] = useState(false);
  

  

  if (!trade || !tradeGroup) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-sm">
        トレードが見つかりません
      </div>
    );
  }

  const handleDelete = async () => {
    if (!confirm("このトレードを削除しますか?")) return;
    await deleteTrade(id);
    toast.success("削除しました");
    router.push("/trades");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border-subtle bg-bg-secondary flex-shrink-0">
        <button onClick={() => router.back()} className="text-text-muted hover:text-text-primary">
          <ChevronLeftIcon size={18} />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <span
            className={clsx(
              "text-xs font-bold",
              trade.direction === "BUY" ? "text-accent-blue" : "text-loss"
            )}
          >
            {trade.direction}
          </span>
          <span className="font-semibold">{trade.pair}</span>
          <span className="text-xs text-text-muted">
            {formatDatetime(trade.firstEntryDatetime)}
          </span>
        </div>
        <span className={clsx("text-sm font-bold", pipsColor(trade.totalPnlPips))}>
          {formatPips(trade.totalPnlPips)}
        </span>
        <button onClick={() => setEditOpen(true)} className="text-text-muted hover:text-accent-blue">
          <EditIcon size={16} />
        </button>
        <button onClick={handleDelete} className="text-text-muted hover:text-loss">
          <Trash2Icon size={16} />
        </button>
      </div>

      {/* Chart */}
      <div className="flex-shrink-0 h-64 md:h-80 border-b border-border-subtle">
        <TradeChart trade={trade} />
      </div>

      {/* Info panels */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 space-y-3 max-w-2xl mx-auto">
          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <InfoItem label="エントリー" value={trade.avgEntryPrice.toFixed(3)} />
            <InfoItem label="エグジット" value={trade.avgExitPrice > 0 ? trade.avgExitPrice.toFixed(3) : "—"} />
            <InfoItem label="ロット" value={`${trade.totalLots}lot`} />
            <InfoItem label="保有時間" value={formatHoldingTime(trade.holdingMinutes)} />
            <InfoItem
              label="損益"
              value={formatPips(trade.totalPnlPips)}
              valueClass={pipsColor(trade.totalPnlPips)}
            />
            <InfoItem label="自信度" value={trade.note.confidence ? "★".repeat(trade.note.confidence) : "—"} />
          </div>

          {/* Tags */}
          {trade.note.tags.length > 0 && (
            <div>
              <p className="label">タグ</p>
              <div className="flex gap-1 flex-wrap">
                {trade.note.tags.map((tag) => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <NoteSection label="相場前提" value={trade.note.marketPremise} />
          <NoteSection label="エントリー根拠" value={trade.note.entryReason} />
          <NoteSection label="決済根拠" value={trade.note.exitReason} />
          <NoteSection label="改善点" value={trade.note.improvements} />
          <NoteSection label="メモ" value={trade.note.memo} />

          {/* TP/SL */}
          {(trade.note.tpPrice || trade.note.slPrice) && (
            <div className="grid grid-cols-2 gap-2">
              {trade.note.tpPrice && (
                <InfoItem label="利確予定" value={trade.note.tpPrice.toString()} valueClass="text-profit" />
              )}
              {trade.note.slPrice && (
                <InfoItem label="損切予定" value={trade.note.slPrice.toString()} valueClass="text-loss" />
              )}
            </div>
          )}

          {/* Legs detail */}
          {trade.legs.length > 0 && (
            <div>
              <p className="label">FIFO内訳</p>
              <div className="space-y-1">
                {trade.legs.map((leg, i) => (
                  <div key={i} className="card p-2 text-xs flex items-center gap-3">
                    <span className="text-text-muted">#{i + 1}</span>
                    <span>{leg.entryPrice.toFixed(3)} → {leg.exitPrice.toFixed(3)}</span>
                    <span className="text-text-muted">{leg.lots}lot</span>
                    <span className={clsx("ml-auto font-medium", pipsColor(leg.pnlPips))}>
                      {formatPips(leg.pnlPips)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit modal */}
      {editOpen && tradeGroup && (
        <TradeEditModal
          tradeGroup={tradeGroup}
          onClose={() => setEditOpen(false)}
        />
      )}
    </div>
  );
}

function InfoItem({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="card p-2">
      <p className="text-text-muted text-[10px] mb-0.5">{label}</p>
      <p className={clsx("text-sm font-medium", valueClass ?? "text-text-primary")}>
        {value}
      </p>
    </div>
  );
}

function NoteSection({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="label">{label}</p>
      <div className="card p-3 text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
        {value}
      </div>
    </div>
  );
}
