import * as cheerio from "cheerio";
import crypto from "crypto";
import { CollectedItem } from "../types";
import { detectAlertLevel } from "../alertKeywords";

function hashId(prefix: string, str: string): string {
  return `${prefix}-${crypto.createHash("md5").update(str).digest("hex").slice(0, 16)}`;
}

/**
 * 디시인사이드 특정 갤러리(마이너 포함) 전문 수집기
 */
export async function collectDcInside(
  keyword: string,
  groupId: string,
  memberName?: string
): Promise<CollectedItem[]> {
  const items: CollectedItem[] = [];
  
  // 주요 갤러리 목록 (피식대학, 뷰티풀너드 관련)
  const gallIds = ["psik", "beautifulnerd", "moms"]; 
  
  for (const gallId of gallIds) {
    // 갤러리 내 검색 URL
    const url = `https://gall.dcinside.com/board/lists/?id=${gallId}&s_type=search_subject_memo&s_keyword=${encodeURIComponent(keyword)}`;

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      if (!response.ok) continue;

      const html = await response.text();
      const $ = cheerio.load(html);

      $(".ub-content.us-post").each((_, el) => {
        const titleEl = $(el).find(".gall_tit a").first();
        const title = titleEl.text().trim();
        const link = "https://gall.dcinside.com" + titleEl.attr("href");
        const date = $(el).find(".gall_date").attr("title") || new Date().toISOString();

        if (title && title.includes(keyword)) {
          items.push({
            id: hashId("dc", link),
            title,
            link,
            source: "디시인사이드",
            sourceTier: 2,
            sourceType: "community",
            groupId,
            memberName,
            keyword,
            publishedAt: new Date(date).toISOString(),
            collectedAt: new Date().toISOString(),
            alertLevel: detectAlertLevel(title),
            snippet: `갤러리: ${gallId}`,
          });
        }
      });
    } catch (e) {
      console.error(`[DeepScraping] DCInside (${gallId}) 실패:`, e);
    }
  }

  return items;
}
