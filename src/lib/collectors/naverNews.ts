import * as cheerio from "cheerio";
import crypto from "crypto";
import { CollectedItem } from "../types";
import { detectAlertLevel } from "../alertKeywords";
import { isRelevantArticle } from "../keywords";

function hashId(prefix: string, str: string): string {
  return `${prefix}-${crypto.createHash("md5").update(str).digest("hex").slice(0, 16)}`;
}

const DELAY_MS = 2000;
const MAX_RETRIES = 3;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 네이버 검색 결과의 날짜 문자열(예: "1시간 전", "2025.01.24.")을 ISO 형식으로 변환 */
function parseNaverDate(dateStr: string): string {
  const now = new Date();
  const s = dateStr.trim();

  try {
    if (s.includes("분 전")) {
      const mins = parseInt(s.replace("분 전", ""));
      now.setMinutes(now.getMinutes() - mins);
    } else if (s.includes("시간 전")) {
      const hours = parseInt(s.replace("시간 전", ""));
      now.setHours(now.getHours() - hours);
    } else if (s.includes("일 전")) {
      const days = parseInt(s.replace("일 전", ""));
      now.setDate(now.getDate() - days);
    } else if (/\d{4}\.\d{2}\.\d{2}\./.test(s)) {
      const parts = s.split(".").map(p => parseInt(p));
      return new Date(parts[0], parts[1] - 1, parts[2]).toISOString();
    } else if (/\d{2,4}\.\d{1,2}\.\d{1,2}/.test(s)) {
      const parts = s.split(".").map(p => parseInt(p));
      const year = parts[0] < 100 ? 2000 + parts[0] : parts[0];
      return new Date(year, parts[1] - 1, parts[2]).toISOString();
    }
  } catch (e) {
    console.warn("[Date Parse Error] Naver:", dateStr, e);
  }

  // 미래 날짜 보정 (현재보다 미래면 1년 전으로)
  if (now > new Date()) {
    // 사실 위 로직에서 now는 항상 현재 또는 과거이므로 별도 처리 불필요
  }

  return now.toISOString();
}

async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "ko-KR,ko;q=0.9",
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      if (i === retries - 1) throw error;
      await sleep(DELAY_MS);
    }
  }
  throw new Error("Max retries reached");
}

export async function collectNaverNews(
  keyword: string,
  groupId: string,
  memberName?: string
): Promise<CollectedItem[]> {
  const items: CollectedItem[] = [];
  const encodedKeyword = encodeURIComponent(keyword);
  const url = `https://search.naver.com/search.naver?where=news&query=${encodedKeyword}&sort=1`;

  try {
    const html = await fetchWithRetry(url);
    const $ = cheerio.load(html);

    $(".news_area").each((_, el) => {
      const titleEl = $(el).find(".news_tit");
      const title = titleEl.text().trim();
      const link = titleEl.attr("href") || "";
      const press = $(el).find(".info.press").first().text().trim();
      const snippet = $(el).find(".news_dsc .dsc_wrap").text().trim();

      if (!title || !isRelevantArticle(title, snippet, groupId, memberName)) return;

      const dateStr = $(el).find(".info_group .info").last().text().trim();
      const publishedAt = parseNaverDate(dateStr);

      items.push({
        id: hashId("naver", link || title),
        title,
        link,
        source: press ? `네이버 (${press})` : "네이버 뉴스",
        sourceTier: 2,
        sourceType: "news",
        groupId,
        memberName,
        keyword,
        publishedAt,
        collectedAt: new Date().toISOString(),
        alertLevel: detectAlertLevel(title + " " + snippet),
        snippet: snippet.slice(0, 200),
      });
    });

    await sleep(DELAY_MS);
  } catch (error) {
    console.error(`[Tier2] 네이버 뉴스 수집 실패 (${keyword}):`, error);
  }

  return items;
}

export async function collectNaverBlog(
  keyword: string,
  groupId: string,
  memberName?: string
): Promise<CollectedItem[]> {
  const items: CollectedItem[] = [];
  const encodedKeyword = encodeURIComponent(keyword);
  const url = `https://search.naver.com/search.naver?where=blog&query=${encodedKeyword}&sort=1`;

  try {
    const html = await fetchWithRetry(url);
    const $ = cheerio.load(html);

    $(".api_txt_lines.total_tit").each((_, el) => {
      const title = $(el).text().trim();
      const link = $(el).attr("href") || "";

      if (!title || !isRelevantArticle(title, undefined, groupId, memberName)) return;

      const dateStr = $(el).closest(".api_ani_send").find(".sub_time").text().trim() 
                      || $(el).parent().find(".sub_time").text().trim();
      const publishedAt = parseNaverDate(dateStr);

      items.push({
        id: hashId("nblog", link || title),
        title,
        link,
        source: "네이버 블로그",
        sourceTier: 2,
        sourceType: "blog",
        groupId,
        memberName,
        keyword,
        publishedAt,
        collectedAt: new Date().toISOString(),
        alertLevel: detectAlertLevel(title),
      });
    });

    await sleep(DELAY_MS);
  } catch (error) {
    console.error(`[Tier2] 네이버 블로그 수집 실패 (${keyword}):`, error);
  }

  return items;
}
