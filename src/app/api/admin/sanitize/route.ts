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

    const mode = searchParams.get("mode");
    const targetDate = searchParams.get("date") || toKSTDate(new Date().toISOString());

    if (mode === "deep-clean") {
      // ... (기존 deep-clean 로직 유지)
      logs.push(`[Deep Clean] ${targetDate} 데이터 완전 삭제 및 재수집 시작`);
      await redis.del(`result-${targetDate}`);
      await redis.del("latest-result");
      
      const { runCollection } = await import("@/lib/collector");
      const { saveCollectResult } = await import("@/lib/dataManager");
      
      const { result, trends, categoryNews } = await runCollection(targetDate);
      await saveCollectResult(result, trends, categoryNews);
      
      logs.push(`${targetDate} 데이터 재수집 완료 (총 ${result.stats.total}건)`);
      return NextResponse.json({ success: true, logs });
    }

    if (mode === "history-heal") {
      logs.push("=== 전역 역사 바로 세우기(History Heal) 시작 ===");
      let deletedCount = 0;

      for (const key of dateKeys) {
        if (key === "latest-result") continue;
        const data = await redis.get<CollectResult>(key);
        if (!data || !data.items) continue;

        const originalCount = data.items.length;
        // 버그 시그니처: 발행일과 수집일이 거의 동일하면 '가짜 날짜'로 간주하여 삭제
        const cleanedItems = data.items.filter(item => {
          if (!item.publishedAt || !item.collectedAt) return true;
          const pub = new Date(item.publishedAt).getTime();
          const coll = new Date(item.collectedAt).getTime();
          const diff = Math.abs(pub - coll);
          // 5초 이내면 실패한 폴백 데이터로 간주
          return diff > 5000;
        });

        if (cleanedItems.length !== originalCount) {
          const removed = originalCount - cleanedItems.length;
          deletedCount += removed;

          // 통계 재계산
          const byGroup: Record<string, number> = {};
          const bySource: Record<string, number> = {};
          for (const item of cleanedItems) {
            byGroup[item.groupId] = (byGroup[item.groupId] || 0) + 1;
            bySource[item.source] = (bySource[item.source] || 0) + 1;
          }

          const updatedResult: CollectResult = {
            ...data,
            items: cleanedItems,
            stats: { ...data.stats, total: cleanedItems.length, byGroup, bySource }
          };
          await redis.set(key, JSON.stringify(updatedResult));
        }
      }

      logs.push(`전체 DB에서 ${deletedCount}개의 오염된 기사를 삭제했습니다.`);
      logs.push("이제 깨끗해진 DB에 30일치 데이터를 올바르게 채워넣는 Backfill을 권장합니다.");
      return NextResponse.json({ success: true, logs });
    }

    if (mode === "bulk-heal") {
      logs.push("=== 대규모 전역 클리닝(Bulk Heal) 시작 ===");
      let deletedCount = 0;
      for (const key of dateKeys) {
        if (key === "latest-result" || !key.startsWith("result-")) continue;
        const data = await redis.get<CollectResult>(key);
        if (!data || !data.items) continue;

        // 더 공격적인 삭제 로직: 수집일이 없거나, 발행일과 수집일이 너무 가까운 것들 모두 제거
        const cleanedItems = data.items.filter(item => {
          if (!item.collectedAt) return false; // 수집일 정보 없으면 과거 버그 데이터로 간주 삭제
          const pub = new Date(item.publishedAt).getTime();
          const coll = new Date(item.collectedAt).getTime();
          return Math.abs(pub - coll) > 10000; // 10초 이내면 삭제
        });

        if (cleanedItems.length !== data.items.length) {
          deletedCount += (data.items.length - cleanedItems.length);
          const byGroup: Record<string, number> = {};
          const bySource: Record<string, number> = {};
          for (const item of cleanedItems) {
            byGroup[item.groupId] = (byGroup[item.groupId] || 0) + 1;
            bySource[item.source] = (bySource[item.source] || 0) + 1;
          }
          const updated = { ...data, items: cleanedItems, stats: { ...data.stats, total: cleanedItems.length, byGroup, bySource } };
          await redis.set(key, JSON.stringify(updated));
        }
      }
      logs.push(`총 ${deletedCount}개의 오염된 데이터를 삭제했습니다.`);
      return NextResponse.json({ success: true, logs });
    }

    if (mode === "bulk-refill") {
      const days = parseInt(searchParams.get("days") || "7");
      logs.push(`=== ${days}일치 데이터 정밀 재수집(Bulk Refill) 시작 ===`);
      
      const { runCollection } = await import("@/lib/collector");
      const { saveCollectResult } = await import("@/lib/dataManager");
      
      const today = new Date();
      for (let i = 0; i < days; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = toKSTDate(d.toISOString());
        
        logs.push(`${dateStr} 수집 중...`);
        const { result, trends, categoryNews } = await runCollection(dateStr);
        await saveCollectResult(result, trends, categoryNews);
        logs.push(`${dateStr} 완료 (${result.stats.total}건)`);
      }
      
      return NextResponse.json({ success: true, logs });
    }

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
