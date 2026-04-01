import Parser from "rss-parser";
import crypto from "crypto";
import { CollectedItem } from "../types";
import { detectAlertLevel } from "../alertKeywords";
import { GROUPS } from "../keywords";

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

/** 영상 제목이 해당 그룹과 관련 있는지 확인 */
function isRelevantVideo(title: string, groupId: string): boolean {
  const group = GROUPS.find((g) => g.id === groupId);
  if (!group) return false;
  const text = title.toLowerCase();
  // 그룹 키워드 또는 멤버 이름이 제목에 포함되어야 함
  const allKeywords = [
    ...group.verifyKeywords,
    ...group.members.map((m) => m.name),
  ];
  return allKeywords.some((kw) => text.includes(kw.toLowerCase()));
}

export async function collectYouTube(): Promise<CollectedItem[]> {
  const items: CollectedItem[] = [];

  for (const [name, { channelId, groupId }] of Object.entries(YOUTUBE_CHANNELS)) {
    const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

    try {
      const feed = await parser.parseURL(url);

      for (const entry of feed.items.slice(0, 15)) {
        const title = entry.title || "";
        if (!isRelevantVideo(title, groupId)) continue;

        items.push({
          id: hashId("yt", entry.id || entry.link || title),
          title,
          link: entry.link || "",
          source: `YouTube (${name})`,
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
