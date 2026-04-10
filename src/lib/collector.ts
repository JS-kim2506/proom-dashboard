import { collectGoogleNews, collectTrendTopics, collectCategoryNews } from "./collectors/googleNews";
import { collectYouTube } from "./collectors/youtube";
import { collectNaverNews, collectNaverBlog } from "./collectors/naverNews";
import { collectCommunity } from "./collectors/community";
import { collectDcInside } from "./collectors/dcinside";
import { collectFmKorea } from "./collectors/fmkorea";
import { getAllSearchKeywords } from "./keywords";
import { analyzeSentiment } from "./ai/sentiment";
import { generateDailyDigest } from "./ai/summarizer";
import type { CollectedItem, CollectResult, CollectStats, TrendTopic } from "./types";

/** KST 기준 오늘 날짜 (YYYY-MM-DD) */
function getToday(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split("T")[0];
}

function deduplicateItems(items: CollectedItem[]): CollectedItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.title.replace(/\s+/g, "").toLowerCase().slice(0, 50);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function safeCollect<T>(fn: () => Promise<T[]>, label: string): Promise<{ items: T[]; error?: string }> {
  try {
    const items = await fn();
    return { items };
  } catch (error) {
    console.error(`[수집 실패] ${label}:`, error);
    return { items: [], error: `${label}: ${String(error)}` };
  }
}

export async function runCollection(targetDate?: string): Promise<{ result: CollectResult; trends: TrendTopic[]; categoryNews: Record<string, TrendTopic[]> }> {
  const keywords = getAllSearchKeywords();
  const groupKeywords = keywords.filter((k) => !k.memberName);

  console.log(`[수집] 고도화된 병렬 수집 시작... (대상 날짜: ${targetDate || "오늘"}, 키워드 수: ${keywords.length})`);
  const startTime = Date.now();

  // === 모든 수집을 병행으로 실행 ===
  const [
    googleNewsResults,
    youtubeResult,
    trendsResult,
    naverNewsResults,
    naverBlogResults,
    communityResults,
    dcInsideResults,
    fmKoreaResults,
  ] = await Promise.all([
    // Tier 1: Google News & YouTube
    Promise.all(keywords.map(k => safeCollect(() => collectGoogleNews(k.keyword, k.groupId, k.memberName), `GNews(${k.keyword})`))),
    safeCollect(() => collectYouTube(), "YouTube"),
    safeCollect(() => collectTrendTopics(), "트렌드"),
    
    // Tier 2: Naver & Communities
    Promise.all(groupKeywords.map(k => safeCollect(() => collectNaverNews(k.keyword, k.groupId, k.memberName, targetDate), `NaverNews(${k.keyword})`))),
    Promise.all(groupKeywords.map(k => safeCollect(() => collectNaverBlog(k.keyword, k.groupId, k.memberName), `NaverBlog(${k.keyword})`))),
    Promise.all(groupKeywords.map(k => safeCollect(() => collectCommunity(k.keyword, k.groupId, k.memberName), `Comm(${k.keyword})`))),
    
    // Deep Scraping: DCInside & FMKorea
    Promise.all(groupKeywords.map(k => safeCollect(() => collectDcInside(k.keyword, k.groupId, k.memberName, targetDate), `DCInside(${k.keyword})`))),
    Promise.all(groupKeywords.map(k => safeCollect(() => collectFmKorea(k.keyword, k.groupId, k.memberName), `FMKorea(${k.keyword})`))),
  ]);

  // 결과 집계
  const allResults = [
    ...googleNewsResults, 
    youtubeResult, 
    ...naverNewsResults, 
    ...naverBlogResults, 
    ...communityResults,
    ...dcInsideResults,
    ...fmKoreaResults
  ];

  const allItems: CollectedItem[] = [];
  const errors: string[] = [];
  
  for (const r of allResults) {
    allItems.push(...r.items);
    if (r.error) errors.push(r.error);
  }

  // 중복 제거 후 감성 분석 적용
  const dedupedRaw = deduplicateItems(allItems);
  const itemsWithSentiment = dedupedRaw.map(item => ({
    ...item,
    sentiment: analyzeSentiment(item.title + " " + (item.snippet || ""))
  }));

  // 통계 계산
  const byGroup: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  let totalSentiment = 0;

  for (const item of itemsWithSentiment) {
    byGroup[item.groupId] = (byGroup[item.groupId] || 0) + 1;
    bySource[item.source] = (bySource[item.source] || 0) + 1;
    totalSentiment += item.sentiment || 50;
  }

  const overallSentiment = itemsWithSentiment.length > 0 
    ? Math.round(totalSentiment / itemsWithSentiment.length) 
    : 50;

  // AI 요약 생성
  const aiDigest = generateDailyDigest(itemsWithSentiment);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[수집 완료] ${elapsed}초 | 총 ${itemsWithSentiment.length}건 수집 (평균 감성: ${overallSentiment})`);

  const stats: CollectStats = {
    total: itemsWithSentiment.length,
    byGroup,
    bySource,
    overallSentiment,
    tierStatus: {
      tier1: { success: true, count: 0, errors: [] }, // 요약 정보로 대체 가
      tier2: { success: true, count: 0, errors: [] },
    },
  };

  // 카테고리 기사 수집 (별도)
  let categoryNews: Record<string, TrendTopic[]> = {};
  try {
    categoryNews = await collectCategoryNews();
  } catch (e) {
    console.error("Category News fail:", e);
  }

  return {
    result: {
      date: targetDate || getToday(),
      collectedAt: new Date().toISOString(),
      items: itemsWithSentiment,
      stats,
      aiDigest,
    },
    trends: trendsResult.items,
    categoryNews,
  };
}
