"use client";

import { useState, useEffect } from "react";
import type { TrendTopic, NewsCategory } from "@/lib/types";
import { FubaoEmptyState, getRandomLoadingMessage } from "@/components/FubaoEasterEgg";

function ArchiveButton({ topic }: { topic: TrendTopic }) {
  const [archived, setArchived] = useState(false);
  const [loading, setLoading] = useState(false);

  // 고유 ID 생성
  const topicId = `topic-${btoa(encodeURIComponent(topic.title)).slice(0, 16)}`;

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;

    setLoading(true);
    try {
      if (archived) {
        await fetch(`/api/archive?id=${topicId}`, { method: "DELETE" });
      } else {
        await fetch("/api/archive", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: topicId,
            title: topic.title,
            link: topic.link,
            source: topic.source,
            sourceTier: 1,
            sourceType: "news" as const,
            groupId: "topics",
            keyword: "탑토픽",
            publishedAt: topic.publishedAt,
            collectedAt: new Date().toISOString(),
            snippet: topic.summary || topic.snippet || "",
          }),
        });
      }
      setArchived(!archived);
    } catch (error) {
      console.error("Archive toggle failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`flex-shrink-0 p-1.5 rounded-lg transition-colors ${
        archived
          ? "text-rose-500 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20"
          : "text-gray-300 dark:text-slate-600 hover:text-gray-500 hover:bg-gray-100 dark:hover:text-slate-400 dark:hover:bg-slate-800"
      }`}
      title={archived ? "아카이브 제거" : "아카이브 저장"}
    >
      {archived ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
      )}
    </button>
  );
}

const TABS: { id: NewsCategory; label: string; icon: string }[] = [
  { id: "politics", label: "정치", icon: "🏛️" },
  { id: "society", label: "사회", icon: "👥" },
  { id: "business", label: "경제", icon: "💰" },
  { id: "world", label: "세계", icon: "🌍" },
  { id: "sports", label: "스포츠", icon: "⚽" },
  { id: "brandpr", label: "브랜드 PR", icon: "🏷️" },
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

export default function TopicsPage() {
  const [categoryData, setCategoryData] = useState<Record<string, TrendTopic[]>>({});
  const [activeTab, setActiveTab] = useState<NewsCategory>("politics");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/data?type=categories")
      .then((r) => r.json())
      .then((data) => setCategoryData(data || {}))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const currentNews = categoryData[activeTab] || [];
  const topFive = currentNews.slice(0, 5);
  const restFive = currentNews.slice(5, 10);

  if (loading) {
    return <div className="flex items-center justify-center h-96 text-gray-400 dark:text-slate-500">{getRandomLoadingMessage()}</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* 헤더 */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">🔥 탑 토픽</h1>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">카테고리별 주요 뉴스 · 상위 5개 AI 요약 제공</p>
      </div>

      {/* 카테고리 탭 */}
      <div className="flex gap-1 bg-gray-100 dark:bg-slate-800/50 p-1 rounded-xl overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* 상위 5개: AI 요약 카드 */}
      {topFive.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-600 dark:text-slate-300">
            ✨ AI 요약 · 상위 5개
          </h2>
          <div className="space-y-2.5">
            {topFive.map((topic, i) => (
              <a
                key={i}
                href={topic.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group block bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-500/30 hover:shadow-sm transition-all overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <span className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold ${
                      i === 0
                        ? "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300"
                        : i < 3
                        ? "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300"
                        : "bg-gray-50 dark:bg-slate-800/50 text-gray-400 dark:text-slate-500"
                    }`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                        {topic.title.split(" - ")[0]}
                      </h3>
                      {/* AI 요약 */}
                      {topic.summary && (
                        <div className="mt-2 px-3 py-2 bg-indigo-50/50 dark:bg-indigo-500/5 border-l-2 border-indigo-400 dark:border-indigo-500/50 rounded-r-lg">
                          <div className="text-[10px] font-semibold text-indigo-500 dark:text-indigo-400 mb-0.5">AI 요약</div>
                          <p className="text-xs text-gray-700 dark:text-slate-300 leading-relaxed">
                            {topic.summary}
                          </p>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-400 dark:text-slate-500">
                        <span>{topic.source}</span>
                        <span>·</span>
                        <span>{timeAgo(topic.publishedAt)}</span>
                      </div>
                    </div>
                    <ArchiveButton topic={topic} />
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      ) : (
        <FubaoEmptyState message="푸바오가 이 카테고리 뉴스를 찾고 있어요... 새로고침 해볼까요?" />
      )}

      {/* 나머지 5개: 리스트만 */}
      {restFive.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-600 dark:text-slate-300">
            📋 기타 뉴스
          </h2>
          <div className="space-y-1.5">
            {restFive.map((topic, i) => (
              <a
                key={i}
                href={topic.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 bg-white dark:bg-slate-900 rounded-lg border border-gray-100 dark:border-slate-800 px-4 py-2.5 hover:border-gray-300 dark:hover:border-slate-600 transition-all"
              >
                <span className="text-xs font-bold text-gray-300 dark:text-slate-600 w-5 text-center">
                  {i + 6}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate transition-colors">
                    {topic.title.split(" - ")[0]}
                  </div>
                </div>
                <div className="text-[11px] text-gray-400 dark:text-slate-500 flex-shrink-0">
                  {topic.source} · {timeAgo(topic.publishedAt)}
                </div>
                <ArchiveButton topic={topic} />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
