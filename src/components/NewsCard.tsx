"use client";

import type { CollectedItem } from "@/lib/types";

interface Props {
  item: CollectedItem;
}

const SOURCE_STYLES: Record<string, string> = {
  news: "bg-sky-100 text-sky-800 dark:bg-sky-500/10 dark:text-sky-300",
  community: "bg-violet-100 text-violet-800 dark:bg-violet-500/10 dark:text-violet-300",
  youtube: "bg-rose-100 text-rose-800 dark:bg-rose-500/10 dark:text-rose-300",
  blog: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300",
  trend: "bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-300",
};

const SOURCE_ICONS: Record<string, string> = {
  news: "📰",
  community: "💬",
  youtube: "📺",
  blog: "📝",
  trend: "📊",
};

const ALERT_STYLES: Record<string, string> = {
  critical: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  info: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
};

function timeAgo(dateStr: string): string {
  const published = new Date(dateStr);
  if (isNaN(published.getTime())) return "날짜 미상";

  const now = new Date();
  const diff = now.getTime() - published.getTime();
  
  // 미래 날짜 방어 로직 (수집 오류 대비)
  if (diff < -60000) return published.toLocaleDateString("ko-KR");

  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}분 전`;
  
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;
  
  // 30일 이상이면 년.월.일 표시
  return published.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
}

export default function NewsCard({ item }: Props) {
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-600 hover:shadow-sm transition-all"
    >
      {/* 좌측: 소스 아이콘 */}
      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-lg">
        {SOURCE_ICONS[item.sourceType] || "📄"}
      </div>

      {/* 중앙: 콘텐츠 */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 line-clamp-1 transition-colors">
          {item.title}
        </h3>
        {item.snippet && (
          <p className="text-xs text-gray-500 dark:text-slate-400 line-clamp-1 mt-0.5">{item.snippet}</p>
        )}
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${SOURCE_STYLES[item.sourceType] || ""}`}>
            {item.source}
          </span>
          {item.memberName && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300 font-medium">
              {item.memberName}
            </span>
          )}
          {item.alertLevel && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${ALERT_STYLES[item.alertLevel] || ""}`}>
              {item.alertLevel === "critical" ? "🚨" : item.alertLevel === "warning" ? "⚠️" : "ℹ️"} {item.alertLevel}
            </span>
          )}
          {item.sentiment !== undefined && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
              item.sentiment >= 70 ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300" :
              item.sentiment <= 30 ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300" :
              "bg-gray-50 text-gray-500 dark:bg-slate-800 dark:text-slate-400"
            }`}>
              {item.sentiment >= 70 ? "🎉 긍정" : item.sentiment <= 30 ? "❗ 부정" : "😐 중립"}
            </span>
          )}
        </div>
      </div>

      {/* 우측: 시간 */}
      <div className="flex-shrink-0 text-[11px] text-gray-400 dark:text-slate-500 whitespace-nowrap pt-0.5">
        {timeAgo(item.publishedAt)}
      </div>
    </a>
  );
}
