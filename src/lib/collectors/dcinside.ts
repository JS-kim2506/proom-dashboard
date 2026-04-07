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
  memberName?: string,
  targetDate?: string // YYYY-MM-DD 형식
): Promise<CollectedItem[]> {
  const items: CollectedItem[] = [];
  const gallIds = ["psik", "beautifulnerd", "moms"]; 
  
  const targetTime = targetDate ? new Date(targetDate).getTime() : null;
  const targetDayStr = targetDate || new Date().toISOString().split("T")[0];

  for (const gallId of gallIds) {
    let page = 1;
    let stop = false;

    while (page <= 5 && !stop) { // 최대 5페이지까지만 검색 (안전성)
      const url = `https://gall.dcinside.com/board/lists/?id=${gallId}&page=${page}&s_type=search_subject_memo&s_keyword=${encodeURIComponent(keyword)}`;
      
      try {
        const response = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
        });

        if (!response.ok) break;

        const html = await response.text();
        const $ = cheerio.load(html);
        const posts = $(".ub-content.us-post");

        if (posts.length === 0) break;

        posts.each((_, el) => {
          const titleEl = $(el).find(".gall_tit a").first();
          const title = titleEl.text().trim();
          const link = "https://gall.dcinside.com" + titleEl.attr("href");
          const dateAttr = $(el).find(".gall_date").attr("title");
          const postDate = dateAttr ? new Date(dateAttr) : new Date();
          const postDayStr = postDate.toISOString().split("T")[0];

          if (targetDate) {
            if (postDayStr === targetDayStr) {
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
                  publishedAt: postDate.toISOString(),
                  collectedAt: new Date().toISOString(),
                  alertLevel: detectAlertLevel(title),
                  snippet: `갤러리: ${gallId}`,
                });
              }
            } else if (postDate.getTime() < (targetTime || 0)) {
              stop = true; // 타겟 날짜보다 과거로 가면 중단
            }
          } else {
            // targetDate가 없으면 첫 페이지만 수집 (기본 동작)
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
                publishedAt: postDate.toISOString(),
                collectedAt: new Date().toISOString(),
                alertLevel: detectAlertLevel(title),
                snippet: `갤러리: ${gallId}`,
              });
            }
            stop = true; 
          }
        });
        page++;
      } catch (e) {
        console.error(`[DCInside] ${gallId} p${page} 실패:`, e);
        break;
      }
    }
  }

  return items;
}
