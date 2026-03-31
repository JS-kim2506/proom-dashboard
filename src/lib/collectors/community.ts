import * as cheerio from "cheerio";
import { CollectedItem } from "../types";
import { detectAlertLevel } from "../alertKeywords";

const DELAY_MS = 2000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function collectCommunity(
  keyword: string,
  groupId: string,
  memberName?: string
): Promise<CollectedItem[]> {
  const items: CollectedItem[] = [];
  const encodedKeyword = encodeURIComponent(keyword);

  // Google 검색을 통한 커뮤니티 간접 수집 (theqoo, dcinside, fmkorea 등)
  const sites = ["theqoo.net", "gall.dcinside.com", "fmkorea.com"];
  const siteQuery = sites.map((s) => `site:${s}`).join(" OR ");
  const url = `https://www.google.com/search?q=${encodedKeyword}+${encodeURIComponent(siteQuery)}&tbs=qdr:d&hl=ko`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();
    const $ = cheerio.load(html);

    $("div.g").each((_, el) => {
      const titleEl = $(el).find("h3").first();
      const title = titleEl.text().trim();
      const linkEl = $(el).find("a").first();
      const link = linkEl.attr("href") || "";
      const snippet = $(el).find(".VwiC3b").text().trim();

      if (!title) return;

      let sourceName = "커뮤니티";
      if (link.includes("theqoo")) sourceName = "더쿠";
      else if (link.includes("dcinside")) sourceName = "디시인사이드";
      else if (link.includes("fmkorea")) sourceName = "에펨코리아";

      items.push({
        id: `comm-${Buffer.from(link || title).toString("base64").slice(0, 20)}-${Date.now()}`,
        title,
        link,
        source: sourceName,
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
    });

    await sleep(DELAY_MS);
  } catch (error) {
    console.error(`[Tier2] 커뮤니티 수집 실패 (${keyword}):`, error);
  }

  return items;
}
