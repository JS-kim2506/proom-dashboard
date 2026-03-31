"use client";

import { GROUPS } from "@/lib/keywords";

interface Props {
  byGroup: Record<string, number>;
  total: number;
}

export default function SummaryCards({ byGroup, total }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-4">
        <div className="text-xs font-medium text-gray-500 dark:text-slate-400">전체 언급</div>
        <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{total}</div>
      </div>
      {GROUPS.map((group) => (
        <div
          key={group.id}
          className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-4"
        >
          <div className="text-xs font-medium text-gray-500 dark:text-slate-400">
            {group.emoji} {group.name}
          </div>
          <div className="text-2xl font-bold mt-1" style={{ color: group.color }}>
            {byGroup[group.id] || 0}
          </div>
        </div>
      ))}
    </div>
  );
}
