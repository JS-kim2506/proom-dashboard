import * as cheerio from "cheerio";
import crypto from "crypto";
import { CollectedItem } from "../types";
import { detectAlertLevel } from "../alertKeywords";

function hashId(prefix: string, str: string): string {
  return `${prefix}-${crypto.createHash("md5").update(str).digest("hex").slice(0, 16)}`;
}

/**
 * 에펨코리아(FMKorea) 커뮤니티 전용 수집기
 */
export async function collectFmKorea(
  keyword: string,
  groupId: string,
  memberName?: string
): Promise<CollectedItem[]> {
  const items: CollectedItem[] = [];
  
  // 에펨코리아 자유게시판/유머게시판 등 통합 검색
  const url = `https://www.fmkorea.com/index.php?act=IS&is_keyword=${encodeURIComponent(keyword)}&where=document&mid=humor`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) return [];

    const html = await response.text();
    const $ = cheerio.load(html);

    $(".searchResult li").each((_, el) => {
      const titleEl = $(el).find("dt a").first();
      const title = titleEl.text().trim();
      const link = "https://www.fmkorea.com" + titleEl.attr("href");
      const snippet = $(el).find("dd").text().trim();

      if (title && title.includes(keyword)) {
        items.push({
          id: hashId("fm", link),
          title,
          link,
          source: "에펨코리아",
          sourceTier: 2,
          sourceType: "community",
          groupId,
          memberName,
          keyword,
          publishedAt: new Date().toISOString(),
          collectedAt: new Date().toISOString(),
          alertLevel: detectAlertLevel(title + " " + snippet),
          snippet: snippet.slice(0, 200),
        });
      }
    });
  } catch (e) {
    console.error(`[DeepScraping] FMKorea 실패:`, e);
  }

  return items;
}
