"use client";

import type { CollectedItem } from "@/lib/types";

interface Props {
  items: CollectedItem[];
}

export default function AlertBanner({ items }: Props) {
  const criticals = items.filter((i) => i.alertLevel === "critical");
  const warnings = items.filter((i) => i.alertLevel === "warning");

  if (criticals.length === 0 && warnings.length === 0) return null;

  return (
    <div className="space-y-2">
      {criticals.length > 0 && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-800 dark:text-red-200 p-3 rounded-xl">
          <div className="font-semibold text-sm mb-1">🚨 긴급 주의 ({criticals.length}건)</div>
          <ul className="space-y-0.5">
            {criticals.slice(0, 3).map((item) => (
              <li key={item.id} className="text-xs">
                <a href={item.link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  [{item.source}] {item.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {warnings.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-200 p-3 rounded-xl">
          <div className="font-semibold text-sm mb-1">⚠️ 주의 필요 ({warnings.length}건)</div>
          <ul className="space-y-0.5">
            {warnings.slice(0, 3).map((item) => (
              <li key={item.id} className="text-xs">
                <a href={item.link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  [{item.source}] {item.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
