import { Redis } from "@upstash/redis";
import crypto from "crypto";

// 환경변수 직접 설정 (실행 시 필요)
const url = process.env.KV_REST_API_URL;
const token = process.env.KV_REST_API_TOKEN;

if (!url || !token) {
  console.error("환경변수 KV_REST_API_URL, KV_REST_API_TOKEN이 필요합니다.");
  process.exit(1);
}

const redis = new Redis({ url, token });

interface CollectedItem {
  id: string;
  publishedAt: string | null;
  [key: string]: any;
}

interface CollectResult {
  date: string;
  items: CollectedItem[];
  stats: any;
  collectedAt?: string;
}

interface DailyStats {
  date: string;
  byGroup: Record<string, number>;
  total: number;
}

function toKSTDate(isoStr: string): string {
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return "unknown";
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split("T")[0];
}

async function runSanitization() {
  console.log("=== 데이터 클리닝 시작 ===");
  
  let cursor = "0";
  const allResults: Record<string, CollectedItem[]> = {};
  const dateKeys: string[] = [];

  // 1. 모든 result-* 키 스캔
  do {
    const [nextCursor, keys] = await redis.scan(cursor, { match: "result-*", count: 100 });
    cursor = nextCursor;
    dateKeys.push(...keys);
  } while (cursor !== "0");

  console.log(`총 ${dateKeys.length}개의 날짜 버킷 발견`);

  // 2. 모든 데이터 로드 및 정렬
  for (const key of dateKeys) {
    const dateStr = key.replace("result-", "");
    if (dateStr === "latest") continue; // latest-result는 나중에 별도 처리

    const data = await redis.get<CollectResult>(key);
    if (!data || !data.items) continue;

    console.log(`매핑 중: ${key} (${data.items.length}건)`);
    
    for (const item of data.items) {
      const actualDate = item.publishedAt ? toKSTDate(item.publishedAt) : dateStr;
      
      if (actualDate === "unknown") {
        console.warn(`[!] 날짜 불명 기사 제외: ${item.title}`);
        continue;
      }

      if (!allResults[actualDate]) allResults[actualDate] = [];
      
      // 중복 체크 (다른 날짜 버킷에서 왔을 수 있음)
      if (!allResults[actualDate].some(i => i.id === item.id)) {
        allResults[actualDate].push(item);
      }
    }
  }

  // 3. 재분류된 데이터를 기반으로 Redis 업데이트
  console.log("\n=== 데이터 재배치 및 저자 시작 ===");
  const dailyStats: DailyStats[] = [];

  for (const [date, items] of Object.entries(allResults)) {
    console.log(`업데이트 중: result-${date} (${items.length}건)`);

    // 통계 재계산
    const byGroup: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    for (const item of items) {
      byGroup[item.groupId] = (byGroup[item.groupId] || 0) + 1;
      const source = item.source || "Unknown";
      bySource[source] = (bySource[source] || 0) + 1;
    }

    const updatedResult: CollectResult = {
      date,
      items,
      collectedAt: new Date().toISOString(),
      stats: {
        total: items.length,
        byGroup,
        bySource,
      }
    };

    await redis.set(`result-${date}`, JSON.stringify(updatedResult));
    dailyStats.push({
      date,
      byGroup,
      total: items.length
    });
  }

  // 4. 통계 통합 업데이트
  console.log("\n=== 통계 데이터 갱신 ===");
  const sortedStats = dailyStats
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-90);
  
  await redis.set("daily-stats", JSON.stringify(sortedStats));

  // 5. latest-result 갱신 (가장 최신 날짜 데이터로)
  if (dailyStats.length > 0) {
    const latestDate = dailyStats.sort((a, b) => b.date.localeCompare(a.date))[0].date;
    const latestData = await redis.get(`result-${latestDate}`);
    if (latestData) {
      await redis.set("latest-result", JSON.stringify(latestData));
      console.log(`최신 데이터 갱신 완료: ${latestDate}`);
    }
  }

  console.log("\n=== 클리닝 완료! ===");
}

runSanitization().catch(console.error);
