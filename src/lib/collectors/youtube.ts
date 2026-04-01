import Parser from "rss-parser";
import crypto from "crypto";
import { CollectedItem } from "../types";
import { detectAlertLevel } from "../alertKeywords";

function hashId(prefix: string, str: string): string {
  return `${prefix}-${crypto.createHash("md5").update(str).digest("hex").slice(0, 16)}`;
}

const parser = new Parser({
  timeout: 10000,
});

const YOUTUBE_CHANNELS: Record<string, { channelId: string; groupId: string }> = {
  피식대학: { channelId: "UCQ2O-iftmnlfrBuNsUUTofQ", groupId: "pisik" },
  뷰티풀너드: { channelId: "UCLk2HP-Yz5GPxEfXDGPVLPw", groupId: "beautifulnerd" },
  몬놈즈: { channelId: "UC2bZEaGOh_kNm5wBMEj2mGA", groupId: "monnomz" },
};

export async function collectYouTube(): Promise<CollectedItem[]> {
  const items: CollectedItem[] = [];

  for (const [name, { channelId, groupId }] of Object.entries(YOUTUBE_CHANNELS)) {
    const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

    try {
      const feed = await parser.parseURL(url);

      for (const entry of feed.items.slice(0, 5)) {
        const title = entry.title || "";
        items.push({
          id: hashId("yt", entry.id || entry.link || title),
          title,
          link: entry.link || "",
          source: `${name} 채널`,
          sourceTier: 1,
          sourceType: "youtube",
          groupId,
          keyword: name,
          publishedAt: entry.pubDate || entry.isoDate || new Date().toISOString(),
          collectedAt: new Date().toISOString(),
          alertLevel: detectAlertLevel(title),
        });
      }
    } catch (error) {
      console.error(`[Tier1] YouTube 수집 실패 (${name}):`, error);
    }
  }

  return items;
}
