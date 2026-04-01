"use client";

import { useState, useEffect, useCallback } from "react";
import { GROUPS } from "@/lib/keywords";
import type { CollectedItem, CollectStats, DailyStats } from "@/lib/types";
import CollectStatus from "@/components/CollectStatus";
import AlertBanner from "@/components/AlertBanner";
import SummaryCards from "@/components/SummaryCards";
import TrendChart from "@/components/TrendChart";
import ShareChart from "@/components/ShareChart";
import NewsCard from "@/components/NewsCard";
import { FubaoEmptyState, getRandomLoadingMessage } from "@/components/FubaoEasterEgg";
import Link from "next/link";

export default function HomePage() {
  // --- 상태 관리 ---
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [items, setItems] = useState<CollectedItem[]>([]);
  const [stats, setStats] = useState<CollectStats | null>(null);
  const [collectedAt, setCollectedAt] = useState<string | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [isCollecting, setIsCollecting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiDigest, setAiDigest] = useState<string | null>(null);

  // --- 데이터 패칭 ---
  const fetchData = useCallback(async (date: string) => {
    setLoading(true);
    try {
      const isToday = date === new Date().toISOString().split("T")[0];
      const resultUrl = isToday ? "/api/data?type=latest" : `/api/data?type=latest&date=${date}`;
      
      const [latestRes, statsRes] = await Promise.all([
        fetch(resultUrl),
        fetch("/api/data?type=stats"),
      ]);
      
      const latest = await latestRes.json();
      const statsData = await statsRes.json();

      setItems(latest.items || []);
      setStats(latest.stats || null);
      setCollectedAt(latest.collectedAt || null);
      setAiDigest(latest.aiDigest || null);
      setDailyStats(statsData || []);
    } catch (e) {
      console.error("[Fetch Error]:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    fetchData(selectedDate); 
  }, [fetchData, selectedDate]);

  // --- 핸들러 ---
  const handleCollect = async () => {
    setIsCollecting(true);
    try {
      const res = await fetch("/api/collect", { method: "POST" });
      const result = await res.json();
      if (result.success) {
        setSelectedDate(new Date().toISOString().split("T")[0]); // 오늘 날짜로 이동
        await fetchData(new Date().toISOString().split("T")[0]);
        if (result.aiDigest) setAiDigest(result.aiDigest);
        alert(`수집 완료: ${result.stats?.total || 0}건의 새로운 데이터를 가져왔습니다.`);
      } else {
        alert(`수집 실패: ${result.message}`);
      }
    } catch (e) {
      console.error(e);
      alert("수집 요청 중 오류가 발생했습니다.");
    } finally {
      setIsCollecting(false);
    }
  };

  const changeDate = (offset: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + offset);
    setSelectedDate(current.toISOString().split("T")[0]);
  };

  const isLatest = selectedDate === new Date().toISOString().split("T")[0];

  const sortedItems = [...items].sort((a, b) =>
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  if (loading && items.length === 0) {
    return <div className="flex items-center justify-center h-96 text-gray-400 dark:text-slate-500">{getRandomLoadingMessage()}</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* 헤더 및 날짜 선택기 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">푸름님, 좋은 아침이에요:)</h1>
          <div className="flex items-center gap-2 mt-1">
            <button 
              onClick={() => changeDate(-1)}
              className="text-gray-400 hover:text-indigo-600 transition-colors p-1"
            >
              ◀
            </button>
            <span className="text-xs font-bold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-500/20">
               📅 {selectedDate} {isLatest && "(오늘)"}
            </span>
            <button 
              onClick={() => changeDate(1)}
              disabled={isLatest}
              className="text-gray-400 hover:text-indigo-600 transition-colors p-1 disabled:opacity-20"
            >
              ▶
            </button>
          </div>
        </div>
        <button
          onClick={handleCollect}
          disabled={isCollecting || !isLatest}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isCollecting ? "🐼 수집 중..." : "🔄 수집 새로고침"}
        </button>
      </div>

      <CollectStatus collectedAt={collectedAt} stats={stats} />
      <AlertBanner items={items} />
      <SummaryCards 
        byGroup={stats?.byGroup || {}} 
        total={stats?.total || 0} 
        overallSentiment={stats?.overallSentiment}
      />
      
      {/* 분석 차트 영역 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TrendChart stats={dailyStats} />
        <ShareChart byGroup={stats?.byGroup || {}} />
      </div>

      {/* AI 데일리 브리핑 (New) */}
      {items.length > 0 && (
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-500/10 dark:to-blue-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🤖</span>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">AI 오늘 아침 브리핑</h2>
          </div>
          <div className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
            {stats && stats.overallSentiment !== undefined && (
              <div className="mb-4 flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-500/30">
                  📊 오늘 여론 지수: {stats.overallSentiment}점
                </span>
                <span className={`text-xs font-bold ${stats.overallSentiment >= 70 ? "text-green-600" : stats.overallSentiment <= 30 ? "text-red-500" : "text-gray-500"}`}>
                  ({stats.overallSentiment >= 70 ? "매우 긍정" : stats.overallSentiment <= 30 ? "주의 필요" : "판단 유보"})
                </span>
              </div>
            )}
            {/* API에서 온 Digest 내용 출력 */}
            <div className="prose dark:prose-invert max-w-none text-sm">
              {aiDigest || (loading ? "분석 중..." : "오늘의 주요 이슈를 분석하고 있습니다.")}
            </div>
          </div>
        </div>
      )}

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
        <h2 className="text-sm font-semibold text-gray-800 dark:text-slate-200 mb-3">📰 {selectedDate} 수집 뉴스</h2>
        <div className="space-y-2">
          {sortedItems.slice(0, 15).map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}
          {sortedItems.length === 0 && !loading && (
            <div className="bg-white dark:bg-slate-900 border border-dashed border-gray-200 dark:border-slate-800 rounded-xl p-10 text-center text-sm text-gray-400">
               해당 날짜에 수집된 데이터가 없습니다. (수집을 실행했는지 확인해주세요)
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
