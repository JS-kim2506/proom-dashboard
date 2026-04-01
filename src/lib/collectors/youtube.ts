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

// YouTube 채널 영상은 수집하지 않음
// 피식대학 채널은 십오야, 응답하라 하이스쿨 등 다양한 콘텐츠를 업로드하므로
// 채널 영상 = 피식대학 콘텐츠가 아님
export async function collectYouTube(): Promise<CollectedItem[]> {
  return [];
}
