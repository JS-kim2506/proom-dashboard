"use client";

import type { CollectedItem } from "@/lib/types";

interface Props {
  item: CollectedItem;
  initiallyArchived?: boolean;
  onArchiveToggle?: (id: string, archived: boolean) => void;
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

function timeAgo(dateStr: string, collectedAt?: string): string {
  const published = new Date(dateStr);
  if (isNaN(published.getTime())) return "날짜 미상";

  // publishedAt과 collectedAt이 5초 이내로 동일하면 날짜 파싱 실패 케이스
  if (collectedAt) {
    const collected = new Date(collectedAt);
    if (!isNaN(collected.getTime()) && Math.abs(published.getTime() - collected.getTime()) < 5000) {
      return published.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
      });
    }
  }

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

import { useState } from "react";

export default function NewsCard({ item, initiallyArchived = false, onArchiveToggle }: Props) {
  const [archived, setArchived] = useState(initiallyArchived);
  const [loading, setLoading] = useState(false);

  const toggleArchive = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;

    setLoading(true);
    try {
      if (archived) {
        await fetch(`/api/archive?id=${item.id}`, { method: "DELETE" });
      } else {
        await fetch("/api/archive", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        });
      }
      setArchived(!archived);
      onArchiveToggle?.(item.id, !archived);
    } catch (error) {
      console.error("Archive toggle failed:", error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <a
      href={item?.link ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-600 hover:shadow-sm transition-all"
    >
      {/* 좌측: 소스 아이콘 */}
      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-lg">
        {SOURCE_ICONS[item?.sourceType ?? ""] || "📄"}
      </div>

      {/* 중앙: 콘텐츠 */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 line-clamp-1 transition-colors">
          {item?.title ?? "제목 없음"}
        </h3>
        {item?.snippet && (
          <p className="text-xs text-gray-500 dark:text-slate-400 line-clamp-1 mt-0.5">{item.snippet}</p>
        )}
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${SOURCE_STYLES[item?.sourceType ?? ""] || ""}`}>
            {item?.source ?? "정보 없음"}
          </span>
          {item?.memberName && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300 font-medium">
              {item.memberName}
            </span>
          )}
          {item?.alertLevel && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${ALERT_STYLES[item.alertLevel] || ""}`}>
              {item.alertLevel === "critical" ? "🚨" : item.alertLevel === "warning" ? "⚠️" : "ℹ️"} {item.alertLevel}
            </span>
          )}
          {item?.sentiment !== undefined && (
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

      {/* 우측: 시간 및 아카이브 버튼 */}
      <div className="flex flex-col items-end gap-2 flex-shrink-0 pt-0.5">
        <div className="text-[11px] text-gray-400 dark:text-slate-500 whitespace-nowrap">
          {timeAgo(item?.publishedAt ?? "", item?.collectedAt)}
        </div>
        <button
          onClick={toggleArchive}
          disabled={loading}
          className={`p-1.5 rounded-lg transition-colors ${
            archived 
              ? "text-rose-500 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20" 
              : "text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-800"
          }`}
          title={archived ? "아카이브 제거" : "아카이브 저장"}
        >
          {archived ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
          )}
        </button>
      </div>
    </a>
  );
}
