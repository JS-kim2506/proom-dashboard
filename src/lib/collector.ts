import { collectGoogleNews, collectTrendTopics, collectCategoryNews } from "./collectors/googleNews";
import { collectYouTube } from "./collectors/youtube";
import { collectNaverNews, collectNaverBlog } from "./collectors/naverNews";
import { collectCommunity } from "./collectors/community";
import { getAllSearchKeywords } from "./keywords";
import type { CollectedItem, CollectResult, CollectStats, TrendTopic } from "./types";

function getToday(): string {
  return new Date().toISOString().split("T")[0];
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

export async function runCollection(): Promise<{ result: CollectResult; trends: TrendTopic[]; categoryNews: Record<string, TrendTopic[]> }> {
  const keywords = getAllSearchKeywords();
  const groupKeywords = keywords.filter((k) => !k.memberName);

  console.log(`[수집] 전 병렬 수집 시작... (키워드 수: ${keywords.length})`);
  const startTime = Date.now();

  // === 모든 수집을 병행로 실행 ===
  const [
    googleNewsResults,
    youtubeResult,
    trendsResult,
    naverNewsResults,
    naverBlogResults,
    communityResults,
  ] = await Promise.all([
    // Tier 1: Google News - 모든 키워드 병렬
    Promise.all(
      keywords.map(({ keyword, groupId, memberName }) =>
        safeCollect(() => collectGoogleNews(keyword, groupId, memberName), `Google News (${keyword})`)
      )
    ).then((res) => {
      const count = res.reduce((acc, r) => acc + r.items.length, 0);
      console.log(`[Tier1] Google News 완료: ${count}건`);
      return res;
    }),
    // Tier 1: YouTube
    safeCollect(() => collectYouTube(), "YouTube").then((res) => {
      console.log(`[Tier1] YouTube 완료: ${res.items.length}건`);
      return res;
    }),
    // Tier 1: 트렌드
    safeCollect(() => collectTrendTopics(), "트렌드").then((res) => {
      console.log(`[Tier1] 트랜드 완료: ${res.items.length}건`);
      return res;
    }),
    // Tier 2: 네이버 뉴스 - 그룹 키워드 병렬
    Promise.all(
      groupKeywords.map(({ keyword, groupId, memberName }) =>
        safeCollect(() => collectNaverNews(keyword, groupId, memberName), `네이버뉴스 (${keyword})`)
      )
    ).then((res) => {
      const count = res.reduce((acc, r) => acc + r.items.length, 0);
      console.log(`[Tier2] 네이버 뉴스 완료: ${count}건`);
      return res;
    }),
    // Tier 2: 네이버 블로그 - 그룹 키워드 병렬
    Promise.all(
      groupKeywords.map(({ keyword, groupId, memberName }) =>
        safeCollect(() => collectNaverBlog(keyword, groupId, memberName), `네이버블로그 (${keyword})`)
      )
    ).then((res) => {
      const count = res.reduce((acc, r) => acc + r.items.length, 0);
      console.log(`[Tier2] 네이버 블로그 완료: ${count}건`);
      return res;
    }),
    // Tier 2: 커뮤니티 - 그룹 키워드 병렬
    Promise.all(
      groupKeywords.map(({ keyword, groupId, memberName }) =>
        safeCollect(() => collectCommunity(keyword, groupId, memberName), `커뮤니티 (${keyword})`)
      )
    ).then((res) => {
      const count = res.reduce((acc, r) => acc + r.items.length, 0);
      console.log(`[Tier2] 커뮤니티 완료: ${count}건`);
      return res;
    }),
  ]);

  // 결과 집계
  const tier1Errors: string[] = [];
  const tier2Errors: string[] = [];
  const allItems: CollectedItem[] = [];
  let tier1Count = 0;
  let tier2Count = 0;

  // Tier 1 집계
  for (const r of googleNewsResults) {
    tier1Count += r.items.length;
    allItems.push(...r.items);
    if (r.error) tier1Errors.push(r.error);
  }
  tier1Count += youtubeResult.items.length;
  allItems.push(...youtubeResult.items);
  if (youtubeResult.error) tier1Errors.push(youtubeResult.error);

  const trends = trendsResult.items;
  if (trendsResult.error) tier1Errors.push(trendsResult.error);

  // Tier 2 집계
  for (const r of [...naverNewsResults, ...naverBlogResults, ...communityResults]) {
    tier2Count += r.items.length;
    allItems.push(...r.items);
    if (r.error) tier2Errors.push(r.error);
  }

  // 중복 제거
  const dedupedItems = deduplicateItems(allItems);

  // 통계
  const byGroup: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  for (const item of dedupedItems) {
    byGroup[item.groupId] = (byGroup[item.groupId] || 0) + 1;
    bySource[item.source] = (bySource[item.source] || 0) + 1;
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[수집 완료] ${elapsed}초 | 총 ${dedupedItems.length}건 (Tier1: ${tier1Count}, Tier2: ${tier2Count})`);

  const stats: CollectStats = {
    total: dedupedItems.length,
    byGroup,
    bySource,
    tierStatus: {
      tier1: { success: tier1Errors.length === 0, count: tier1Count, errors: tier1Errors },
      tier2: { success: tier2Errors.length === 0, count: tier2Count, errors: tier2Errors },
    },
  };

  // === 카테고리별 뉴스 (병렬) ===
  console.log("[수집] 카테고리별 뉴스 수집 시작...");
  let categoryNews: Record<string, import("./types").TrendTopic[]> = {};
  try {
    categoryNews = await collectCategoryNews();
  } catch (error) {
    console.error("[수집] 카테고리 뉴스 실패:", error);
  }

  return {
    result: {
      date: getToday(),
      collectedAt: new Date().toISOString(),
      items: dedupedItems,
      stats,
    },
    trends,
    categoryNews,
  };
}
