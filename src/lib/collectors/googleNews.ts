import Parser from "rss-parser";
import * as cheerio from "cheerio";
import crypto from "crypto";
import { CollectedItem, TrendTopic, NEWS_CATEGORIES } from "../types";
import { detectAlertLevel } from "../alertKeywords";
import { isRelevantArticle } from "../keywords";

function hashId(prefix: string, str: string): string {
  return `${prefix}-${crypto.createHash("md5").update(str).digest("hex").slice(0, 16)}`;
}

const parser = new Parser({
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/rss+xml, application/xml;q=0.9, */*;q=0.8",
  },
  timeout: 20000,
});

export async function collectGoogleNews(
  keyword: string,
  groupId: string,
  memberName?: string
): Promise<CollectedItem[]> {
  const items: CollectedItem[] = [];
  const encodedKeyword = encodeURIComponent(keyword);
  const url = `https://news.google.com/rss/search?q=${encodedKeyword}&hl=ko&gl=KR&ceid=KR:ko`;

  try {
    const feed = await parser.parseURL(url);

    for (const entry of feed.items.slice(0, 50)) {
      const title = entry.title || "";
      const snippet = entry.contentSnippet?.slice(0, 200);

      if (!isRelevantArticle(title, snippet, groupId, memberName)) continue;

      const sourceName = extractSource(title);
      const sourceType = classifySource(sourceName);

      items.push({
        id: hashId("gnews", entry.link || title),
        title,
        link: entry.link || "",
        source: sourceName,
        sourceTier: 1,
        sourceType,
        groupId,
        memberName,
        keyword,
        publishedAt: entry.pubDate || new Date().toISOString(),
        collectedAt: new Date().toISOString(),
        alertLevel: detectAlertLevel(title),
        snippet,
      });
    }
  } catch (error) {
    console.error(`[Tier1] Google News 수집 실패 (${keyword}):`, error);
  }

  return items;
}

export async function collectTrendTopics(): Promise<TrendTopic[]> {
  const topics: TrendTopic[] = [];
  const url = "https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko";

  try {
    const feed = await parser.parseURL(url);

    for (const entry of feed.items.slice(0, 20)) {
      topics.push({
        title: entry.title || "",
        link: entry.link || "",
        source: "Google News",
        publishedAt: entry.pubDate || new Date().toISOString(),
        snippet: entry.contentSnippet?.slice(0, 300),
      });
    }
  } catch (error) {
    console.error("[Tier1] 트렌드 토픽 수집 실패:", error);
  }

  return topics;
}

/** 카테고리별 뉴스 수집 (정치, 사회, 경제, 세계, 스포츠) */
export async function collectCategoryNews(): Promise<Record<string, TrendTopic[]>> {
  const result: Record<string, TrendTopic[]> = {};

  const categoryUrls: { id: string; url: string }[] = [
    { id: "politics", url: "https://news.google.com/rss/headlines/section/topic/NATION?hl=ko&gl=KR&ceid=KR:ko" },
    { id: "society", url: "https://news.google.com/rss/headlines/section/topic/HEALTH?hl=ko&gl=KR&ceid=KR:ko" },
    { id: "business", url: "https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=ko&gl=KR&ceid=KR:ko" },
    { id: "world", url: "https://news.google.com/rss/headlines/section/topic/WORLD?hl=ko&gl=KR&ceid=KR:ko" },
    { id: "sports", url: "https://news.google.com/rss/headlines/section/topic/SPORTS?hl=ko&gl=KR&ceid=KR:ko" },
  ];

  const fetches = categoryUrls.map(async ({ id, url }) => {
    try {
      const feed = await parser.parseURL(url);
      const topics: TrendTopic[] = [];

      for (const entry of feed.items.slice(0, 10)) {
        const title = entry.title || "";
        const snippet = entry.contentSnippet?.slice(0, 500) || "";

        topics.push({
          title,
          link: entry.link || "",
          source: extractSource(entry.title || ""),
          publishedAt: entry.pubDate || new Date().toISOString(),
          snippet,
          summary: generateSummary(title, snippet),
          category: id,
        });
      }

      result[id] = topics;
    } catch (error) {
      console.error(`[카테고리 뉴스] ${id} 수집 실패:`, error);
      result[id] = [];
    }
  });

  await Promise.all(fetches);
  return result;
}

/** Google News 제목에서 출처 추출 ("제목 - 출처" 형식) */
function extractSource(fullTitle: string): string {
  const parts = fullTitle.split(" - ");
  return parts.length > 1 ? parts[parts.length - 1].trim() : "Google News";
}

const BLOG_SOURCES = ["brunch", "tistory", "naver.com/post", "blog", "velog", "medium"];
const COMMUNITY_SOURCES = ["theqoo", "dcinside", "fmkorea", "instiz", "mlbpark", "clien", "ruliweb", "ppomppu"];

/** 출처명으로 뉴스/블로그/커뮤니티 분류 */
function classifySource(source: string): "news" | "blog" | "community" {
  const s = source.toLowerCase();
  if (BLOG_SOURCES.some((b) => s.includes(b))) return "blog";
  if (COMMUNITY_SOURCES.some((c) => s.includes(c))) return "community";
  return "news";
}

/** 스니펫 기반 AI 스타일 요약 생성 */
function generateSummary(title: string, snippet: string): string {
  // Google News RSS의 content에서 실제 기사 내용 추출
  const cleanSnippet = snippet
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleanSnippet || cleanSnippet.length < 20) {
    // 스니펫이 없으면 제목에서 출처 제거하고 요약
    const titleOnly = title.split(" - ")[0].trim();
    return titleOnly;
  }

  // 핵심 문장 추출 (첫 2문장)
  const sentences = cleanSnippet
    .split(/(?<=[.!?다요음함됨])\s+/)
    .filter((s) => s.length > 10)
    .slice(0, 2);

  if (sentences.length > 0) {
    return sentences.join(" ").slice(0, 200);
  }

  return cleanSnippet.slice(0, 200);
}
