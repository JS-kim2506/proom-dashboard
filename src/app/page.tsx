"use client";

import { useState, useEffect, useCallback } from "react";
import { GROUPS } from "@/lib/keywords";
import type { CollectedItem, CollectStats, DailyStats } from "@/lib/types";
import CollectStatus from "@/components/CollectStatus";
import AlertBanner from "@/components/AlertBanner";
import SummaryCards from "@/components/SummaryCards";
import TrendChart from "@/components/TrendChart";
import NewsCard from "@/components/NewsCard";
import { FubaoEmptyState, getRandomLoadingMessage } from "@/components/FubaoEasterEgg";
import Link from "next/link";

export default function HomePage() {
  const [items, setItems] = useState<CollectedItem[]>([]);
  const [stats, setStats] = useState<CollectStats | null>(null);
  const [collectedAt, setCollectedAt] = useState<string | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [isCollecting, setIsCollecting] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [latestRes, statsRes] = await Promise.all([
        fetch("/api/data?type=latest"),
        fetch("/api/data?type=stats"),
      ]);
      const latest = await latestRes.json();
      const statsData = await statsRes.json();

      setItems(latest.items || []);
      setStats(latest.stats || null);
      setCollectedAt(latest.collectedAt || null);
      setDailyStats(statsData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCollect = async () => {
    setIsCollecting(true);
    try {
      const res = await fetch("/api/collect", { method: "POST" });
      const result = await res.json();
      if (result.success) {
        await fetchData();
        if (result.stats && result.stats.total === 0) {
          alert("수집은 완료되었으나 검색 결과가 0건입니다. 잠시 후 다시 시도하거나 키워드 설정을 확인해주세요.");
        } else {
          alert(`수집 완료: ${result.stats?.total || 0}건의 새로운 데이터를 가져왔습니다.`);
        }
      } else {
        alert(`수집패 중: ${result.message}`);
      }
    } catch (e) {
      console.error(e);
      alert("수집 요청 중 오류가 발생했습니다. 네트워크 상태를 확인해주세요.");
    } finally {
      setIsCollecting(false);
    }
  };

  const sortedItems = [...items].sort((a, b) =>
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  if (loading) {
    return <div className="flex items-center justify-center h-96 text-gray-400 dark:text-slate-500">{getRandomLoadingMessage()}</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">푸름님, 좋은 아침이에요:)</h1>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">피식대학 · 뷰티풀너드 · 몬놈즈 종합 모니터링</p>
        </div>
        <button
          onClick={handleCollect}
          disabled={isCollecting}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isCollecting ? "🐼 푸바오가 수집 중..." : "🔄 새로고침"}
        </button>
      </div>

      <CollectStatus collectedAt={collectedAt} stats={stats} />
      <AlertBanner items={items} />
      <SummaryCards byGroup={stats?.byGroup || {}} total={stats?.total || 0} />
      <TrendChart stats={dailyStats} />

      {/* 바로가기 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Link href="/topics" className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-3 text-center hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-colors">
          <div className="text-lg">🔥</div>
          <div className="text-xs font-medium text-gray-700 dark:text-slate-300 mt-1">탑 토픽</div>
        </Link>
        {GROUPS.map((g) => (
          <Link key={g.id} href={`/monitor?group=${g.id}`} className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-3 text-center hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-colors">
            <div className="text-lg">{g.emoji}</div>
            <div className="text-xs font-medium text-gray-700 dark:text-slate-300 mt-1">{g.name}</div>
          </Link>
        ))}
      </div>

      {/* 최신 소식 (시간순) */}
      <div>
        <h2 className="text-sm font-semibold text-gray-800 dark:text-slate-200 mb-3">📰 최신 소식</h2>
        <div className="space-y-2">
          {sortedItems.slice(0, 15).map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}
          {sortedItems.length === 0 && (
            <FubaoEmptyState />
          )}
        </div>
      </div>
    </div>
  );
}
