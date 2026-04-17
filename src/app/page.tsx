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

/** KST 기준 오늘 날짜 (YYYY-MM-DD) */
function getKSTToday(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split("T")[0];
}

export default function HomePage() {
  // --- 상태 관리 ---
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [items, setItems] = useState<CollectedItem[]>([]);
  const [stats, setStats] = useState<CollectStats | null>(null);
  const [collectedAt, setCollectedAt] = useState<string | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [isCollecting, setIsCollecting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiDigest, setAiDigest] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"daily" | "archive">("daily");
  const [archivedItems, setArchivedItems] = useState<CollectedItem[]>([]);

  // --- 데이터 패칭 ---
  const fetchData = useCallback(async (date: string) => {
    setLoading(true);
    try {
      // 명시적으로 지정된 날짜의 결과만 가져오도록 쿼리 수정 & 캐시 방지 추가
      const resultUrl = `/api/data?type=latest&date=${date}&_t=${Date.now()}`;
      
      const [latestRes, statsRes] = await Promise.all([
        fetch(resultUrl, { cache: 'no-store' }).catch(() => null),
        fetch(`/api/data?type=stats&_t=${Date.now()}`, { cache: 'no-store' }).catch(() => null),
      ]);
      
      let latest: any = { items: [], stats: null, collectedAt: null, aiDigest: null };
      let statsData: any = [];

      if (latestRes && latestRes.ok) {
        try { latest = await latestRes.json(); } catch(e) { console.error("JSON Error"); }
      }
      if (statsRes && statsRes.ok) {
        try { statsData = await statsRes.json(); } catch(e) { console.error("JSON Error"); }
      }

      setItems(Array.isArray(latest?.items) ? latest.items : []);
      setStats(latest?.stats || null);
      setCollectedAt(latest?.collectedAt || null);
      setAiDigest(latest?.aiDigest || null);
      setDailyStats(Array.isArray(statsData) ? statsData : []);
    } catch (e) {
      console.error("[Fetch Error]:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchArchive = useCallback(async () => {
    try {
      const res = await fetch("/api/archive");
      if (res.ok) {
        const data = await res.json();
        setArchivedItems(data);
      }
    } catch (e) {
      console.error("Fetch Archive Error:", e);
    }
  }, []);

  useEffect(() => { 
    setIsMounted(true);
    
    if (activeTab === "daily") {
      if (!selectedDate) {
        const today = getKSTToday();
        setSelectedDate(today);
        fetchData(today);
      } else {
        fetchData(selectedDate);
      }
    } else {
      fetchArchive();
    }
  }, [fetchData, fetchArchive, selectedDate, activeTab]);

  // --- 핸들러 ---
  const handleCollect = async (date?: string) => {
    setIsCollecting(true);
    const targetDate = date || (selectedDate === getLocalToday() ? undefined : selectedDate);
    
    try {
      const res = await fetch("/api/collect", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: targetDate })
      });
      const result = await res.json();
      if (result.success) {
        if (!targetDate) setSelectedDate(getLocalToday());
        await fetchData(targetDate || getLocalToday());
        if (result.aiDigest) setAiDigest(result.aiDigest);
        alert(`수집 완료: ${result.stats?.total || 0}건의 데이터를 가져왔습니다.`);
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

  const isLatest = selectedDate === getLocalToday();

  const sortedItems = items
    .filter((item) => item && item.publishedAt) // 유효성 검사 추가
    .sort((a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );

  if (!isMounted) {
    return <div className="flex items-center justify-center h-96 text-gray-400 dark:text-slate-500">대시보드를 준비 중입니다...</div>;
  }

  if (loading && items.length === 0 && activeTab === "daily") {
    return <div className="flex items-center justify-center h-96 text-gray-400 dark:text-slate-500">{getRandomLoadingMessage()}</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* 탭 네비게이션 */}
      <div className="flex border-b border-gray-100 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("daily")}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 ${
            activeTab === "daily" 
              ? "border-indigo-600 text-indigo-600" 
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          📅 데일리 모니터링
        </button>
        <button
          onClick={() => setActiveTab("archive")}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 ${
            activeTab === "archive" 
              ? "border-indigo-600 text-indigo-600" 
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          📂 내 저장소 (아카이브)
        </button>
      </div>

      {activeTab === "daily" ? (
        <>
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
              onClick={() => handleCollect()}
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
      {isMounted && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TrendChart stats={dailyStats} />
          <ShareChart byGroup={stats?.byGroup || {}} />
        </div>
      )}

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
              <NewsCard 
                key={item.id} 
                item={item} 
                initiallyArchived={archivedItems.some(ai => ai.id === item.id)}
              />
            ))}
            {sortedItems.length === 0 && !loading && (
              <div className="bg-white dark:bg-slate-900 border border-dashed border-gray-200 dark:border-slate-800 rounded-xl p-10 text-center">
                <div className="text-4xl mb-3">🔍</div>
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
                  {selectedDate}에 수집된 데이터가 없습니다.
                </p>
                <button
                  onClick={() => handleCollect(selectedDate)}
                  disabled={isCollecting}
                  className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all border border-indigo-100 dark:border-indigo-500/20"
                >
                  {isCollecting ? "🐼 수집 중..." : `✨ ${selectedDate} 데이터 수집하기`}
                </button>
              </div>
            )}
          </div>
        </div>
      </>
    ) : (
      /* 아카이브 탭 콘텐츠 */
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">나만의 아카이브 📂</h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">내가 선택하여 저장한 주요 소식들이 누적됩니다.</p>
        </div>
        
        <div className="space-y-2">
          {archivedItems.length > 0 ? (
            archivedItems.map((item) => (
              <NewsCard 
                key={item.id} 
                item={item} 
                initiallyArchived={true}
                onArchiveToggle={(id, archived) => {
                  if (!archived) {
                    setArchivedItems(prev => prev.filter(i => i.id !== id));
                  }
                }}
              />
            ))
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-dashed border-gray-200 dark:border-slate-800 rounded-xl p-20 text-center">
              <span className="text-4xl mb-4 block">📭</span>
              <p className="text-sm text-gray-400">아직 저장된 기사가 없습니다.</p>
              <button 
                onClick={() => setActiveTab("daily")}
                className="mt-4 text-xs font-bold text-indigo-600 hover:underline"
              >
                소식 보러가기
              </button>
            </div>
          )}
        </div>
      </div>
    )}
    </div>
  );
}
