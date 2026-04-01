"use client";

import type { CollectStats } from "@/lib/types";

interface Props {
  collectedAt: string | null;
  stats: CollectStats | null;
}

export default function CollectStatus({ collectedAt, stats }: Props) {
  if (!collectedAt || !stats) {
    return (
      <div className="text-xs text-gray-400 dark:text-slate-500 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-lg px-3 py-2">
        수집된 데이터가 없습니다. 새로고침을 눌러주세요.
      </div>
    );
  }

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  const { tier1, tier2 } = stats?.tierStatus || { 
    tier1: { success: true, count: 0, errors: [] }, 
    tier2: { success: true, count: 0, errors: [] } 
  };

  return (
    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-lg px-3 py-2 flex-wrap">
      <span>마지막: <strong className="text-gray-700 dark:text-slate-200">{formatTime(collectedAt)}</strong></span>
      <span className="text-gray-300 dark:text-slate-600">|</span>
      <span>Tier1 {tier1.success ? "✅" : "⚠️"} {tier1.count}건</span>
      <span>Tier2 {tier2.success ? "✅" : "⚠️"} {tier2.count}건</span>
      <span className="text-gray-300 dark:text-slate-600">|</span>
      <span>총 <strong className="text-gray-700 dark:text-slate-200">{stats.total}건</strong></span>
    </div>
  );
}
