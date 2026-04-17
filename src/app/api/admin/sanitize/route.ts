import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const maxDuration = 300; // 5분 허용

function toKSTDate(isoStr: string): string {
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return "unknown";
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split("T")[0];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  // 보안을 위해 간단한 체크 (또는 필요 시 제거)
  if (secret !== process.env.CRON_SECRET) {
    // return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    return NextResponse.json({ error: "Redis credentials missing" }, { status: 500 });
  }

  const redis = new Redis({ url, token });
  const logs: string[] = [];
  
  try {
    logs.push("=== 데이터 클리닝 시작 ===");
    let cursor = "0";
    const allResults: Record<string, any[]> = {};
    const dateKeys: string[] = [];

    // 1. 모든 result-* 키 스캔
    do {
      const [nextCursor, keys] = await redis.scan(cursor, { match: "result-*", count: 100 });
      cursor = nextCursor;
      dateKeys.push(...keys);
    } while (cursor !== "0");

    logs.push(`총 ${dateKeys.length}개의 날짜 버킷 발견`);

    // 2. 모든 데이터 로드 및 재분류
    for (const key of dateKeys) {
      const dateStr = key.replace("result-", "");
      if (dateStr === "latest") continue;

      const data = await redis.get<any>(key);
      if (!data || !data.items) continue;

      for (const item of data.items) {
        const actualDate = item.publishedAt ? toKSTDate(item.publishedAt) : dateStr;
        if (actualDate === "unknown") continue;

        if (!allResults[actualDate]) allResults[actualDate] = [];
        if (!allResults[actualDate].some((i: any) => i.id === item.id)) {
          allResults[actualDate].push(item);
        }
      }
    }

    // 3. 재분류된 데이터를 기반으로 Redis 업데이트
    const dailyStats: any[] = [];
    const updatePromises = Object.entries(allResults).map(async ([date, items]) => {
      const byGroup: Record<string, number> = {};
      const bySource: Record<string, number> = {};
      for (const item of items) {
        byGroup[item.groupId] = (byGroup[item.groupId] || 0) + 1;
        const source = item.source || "Unknown";
        bySource[source] = (bySource[source] || 0) + 1;
      }

      const updatedResult = {
        date,
        items,
        collectedAt: new Date().toISOString(),
        stats: { total: items.length, byGroup, bySource }
      };

      await redis.set(`result-${date}`, JSON.stringify(updatedResult));
      dailyStats.push({ date, byGroup, total: items.length });
    });

    await Promise.all(updatePromises);
    logs.push(`총 ${Object.keys(allResults).length}개의 날짜 버킷 갱신 완료`);

    // 4. 통계 통합 업데이트
    const sortedStats = dailyStats
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-90);
    await redis.set("daily-stats", JSON.stringify(sortedStats));

    // 5. latest-result 갱신
    const latestDate = dailyStats.sort((a, b) => b.date.localeCompare(a.date))[0]?.date;
    if (latestDate) {
      const latestData = await redis.get(`result-${latestDate}`);
      await redis.set("latest-result", JSON.stringify(latestData));
      logs.push(`최신 데이터 갱신: ${latestDate}`);
    }

    return NextResponse.json({ success: true, logs });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
