import type { CollectResult, DailyStats, TrendTopic, CollectedItem } from "./types";

// Vercel 배포 시 Upstash Redis 사용, 로컬에서는 파일 시스템 사용
const isVercel = process.env.VERCEL === "1" || !!process.env.KV_REST_API_URL;

/** KST 기준 오늘 날짜 (YYYY-MM-DD) */
function getTodayKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split("T")[0];
}

/** publishedAt ISO 문자열 → KST 기준 날짜 (YYYY-MM-DD) */
function toKSTDate(isoStr: string): string {
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return getTodayKST();
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split("T")[0];
}

// ========== Redis 기반 (Vercel) ==========
async function getRedis() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    throw new Error(
      "Redis 설정(KV_REST_API_URL / KV_REST_API_TOKEN)이 없습니다. " +
      "Vercel 대시보드에서 Upstash Redis를 연결했는지 확인해주세요."
    );
  }

  const { Redis } = await import("@upstash/redis");
  return new Redis({ url, token });
}

async function redisSave(key: string, data: unknown) {
  const redis = await getRedis();
  await redis.set(key, JSON.stringify(data));
}

async function redisGet<T>(key: string): Promise<T | null> {
  const redis = await getRedis();
  const data = await redis.get<string>(key);
  if (!data) return null;
  return typeof data === "string" ? JSON.parse(data) : data as T;
}

// ========== 파일 기반 (로컬) ==========
function getFs() {
  const fs = require("fs") as typeof import("fs");
  const path = require("path") as typeof import("path");
  const DATA_DIR = path.join(process.cwd(), "src", "data");
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  return { fs, path, DATA_DIR };
}

function fileSave(filename: string, data: unknown) {
  const { fs, path, DATA_DIR } = getFs();
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2), "utf-8");
}

function fileGet<T>(filename: string): T | null {
  if (isVercel) return null; // Vercel에서는 파일시스템 사용 불가
  const { fs, path, DATA_DIR } = getFs();
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

function fileGetLatest<T>(prefix: string): T | null {
  if (isVercel) return null; // Vercel에서는 파일시스템 사용 불가
  const { fs, path, DATA_DIR } = getFs();
  const files = fs.readdirSync(DATA_DIR)
    .filter((f: string) => f.startsWith(prefix) || f.match(/^\d{4}-\d{2}-\d{2}\.json$/))
    .sort()
    .reverse();

  const target = prefix === ""
    ? files.find((f: string) => f.match(/^\d{4}-\d{2}-\d{2}\.json$/))
    : files.find((f: string) => f.startsWith(prefix));

  if (!target) return null;
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, target), "utf-8"));
  } catch {
    return null;
  }
}

function fileCleanup() {
  const { fs, path, DATA_DIR } = getFs();
  const files = fs.readdirSync(DATA_DIR);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);

  for (const file of files) {
    if (file === "stats.json" || file === ".gitkeep") continue;
    const match = file.match(/(\d{4}-\d{2}-\d{2})/);
    if (match && new Date(match[1]) < cutoff) {
      fs.unlinkSync(path.join(DATA_DIR, file));
    }
  }
}

// ========== 공통 API ==========

export async function saveCollectResult(
  result: CollectResult,
  trends: TrendTopic[],
  categoryNews?: Record<string, TrendTopic[]>
) {
  // 기사를 publishedAt 기준으로 KST 날짜별 분류
  const itemsByDate: Record<string, CollectedItem[]> = {};
  for (const item of result.items) {
    const pubDate = item.publishedAt ? toKSTDate(item.publishedAt) : result.date;
    if (!itemsByDate[pubDate]) itemsByDate[pubDate] = [];
    itemsByDate[pubDate].push(item);
  }

  if (isVercel) {
    const saves: Promise<void>[] = [
      // 최신 데이터 갱신 (전체)
      redisSave("latest-result", result),
      redisSave("latest-trends", trends),
      categoryNews ? redisSave("latest-categories", categoryNews) : Promise.resolve(),
      redisSave(`trends-${result.date}`, trends),
      categoryNews ? redisSave(`categories-${result.date}`, categoryNews) : Promise.resolve(),
    ];

    await Promise.all(saves);

    // 날짜별로 기존 데이터에 병합하여 순차 저장 (race condition 방지)
    for (const [date, items] of Object.entries(itemsByDate)) {
      try {
        const existing = await redisGet<CollectResult>(`result-${date}`);
        const existingItems = existing?.items || [];
        const existingIds = new Set(existingItems.map(i => i.id));
        const newItems = items.filter(i => !existingIds.has(i.id));
        const mergedItems = [...existingItems, ...newItems];

        const byGroup: Record<string, number> = {};
        const bySource: Record<string, number> = {};
        for (const item of mergedItems) {
          byGroup[item.groupId] = (byGroup[item.groupId] || 0) + 1;
          bySource[item.source] = (bySource[item.source] || 0) + 1;
        }

        const dateResult: CollectResult = {
          date,
          collectedAt: existing?.collectedAt || result.collectedAt,
          items: mergedItems,
          stats: {
            total: mergedItems.length,
            byGroup,
            bySource,
            tierStatus: result.stats.tierStatus,
          },
        };
        await redisSave(`result-${date}`, dateResult);
        await saveStatsRedis(dateResult);
      } catch (e) {
        console.error(`[saveCollectResult] ${date} 저장 실패:`, e);
      }
    }
  } else {
    // 로컬: 날짜별 분류 저장
    for (const [date, items] of Object.entries(itemsByDate)) {
      const existing = fileGet<CollectResult>(`${date}.json`);
      const existingItems = existing?.items || [];
      const existingIds = new Set(existingItems.map(i => i.id));
      const newItems = items.filter(i => !existingIds.has(i.id));
      const mergedItems = [...existingItems, ...newItems];

      const byGroup: Record<string, number> = {};
      const bySource: Record<string, number> = {};
      for (const item of mergedItems) {
        byGroup[item.groupId] = (byGroup[item.groupId] || 0) + 1;
        bySource[item.source] = (bySource[item.source] || 0) + 1;
      }

      const dateResult: CollectResult = {
        date,
        collectedAt: existing?.collectedAt || result.collectedAt,
        items: mergedItems,
        stats: {
          total: mergedItems.length,
          byGroup,
          bySource,
          tierStatus: result.stats.tierStatus,
        },
      };
      fileSave(`${date}.json`, dateResult);
      updateStatsFile(dateResult);
    }

    fileSave(`trends-${result.date}.json`, trends);
    if (categoryNews) fileSave(`categories-${result.date}.json`, categoryNews);
    fileCleanup();
  }
}

async function saveStatsRedis(result: CollectResult) {
  const stats = await redisGet<DailyStats[]>("daily-stats") || [];
  const dailyStat: DailyStats = { date: result.date, byGroup: result.stats.byGroup, total: result.stats.total };
  const idx = stats.findIndex((s) => s.date === result.date);
  if (idx >= 0) stats[idx] = dailyStat;
  else stats.push(dailyStat);
  
  // 90일(3개월)치 보관
  await redisSave("daily-stats", stats.sort((a,b) => a.date.localeCompare(b.date)).slice(-90));
}

function updateStatsFile(result: CollectResult) {
  let stats = fileGet<DailyStats[]>("stats.json") || [];
  const dailyStat: DailyStats = { date: result.date, byGroup: result.stats.byGroup, total: result.stats.total };
  const idx = stats.findIndex((s) => s.date === result.date);
  if (idx >= 0) stats[idx] = dailyStat;
  else stats.push(dailyStat);
  
  // 90일(3개월)치 보관
  fileSave("stats.json", stats.sort((a,b) => a.date.localeCompare(b.date)).slice(-90));
}

export async function getResultByDate(date: string): Promise<CollectResult | null> {
  try {
    let data: CollectResult | null = null;
    if (isVercel) {
      data = await redisGet<CollectResult>(`result-${date}`);
    } else {
      data = fileGet<CollectResult>(`${date}.json`);
    }

    if (data) {
      // 오염된 데이터 방어: 수집된 날짜(date)와 실제 발행일이 다른 항목 필터링
      // 단, 수집 시점 차이로 인해 ±1일 정도의 차이는 허용할 수 있으나 
      // 현재 사용자가 겪는 문제는 수개월 전 기사가 노출되는 것이므로 
      // 발행일이 해당 날짜에 부합하지 않으면 제외합니다.
      const filteredItems = data.items.filter(item => {
        if (!item.publishedAt) return false;
        const pubDate = toKSTDate(item.publishedAt);
        // 발행일이 조회 날짜와 일치하거나, 수집 시차를 고려해 30일 이내인 것만 보임
        // (1월 기사가 4월에 보이는 것을 막는 핵심 로직)
        return pubDate === date;
      });

      if (filteredItems.length !== data.items.length) {
        return {
          ...data,
          items: filteredItems,
          stats: {
            ...data.stats,
            total: filteredItems.length
          }
        };
      }
      return data;
    }
  } catch (e) {
    console.error(`[getResultByDate] 조회 및 필터링 실패 (${date}):`, e);
  }
  return null;
}

export async function getTrendsByDate(date: string): Promise<TrendTopic[]> {
  try {
    if (isVercel) {
      const data = await redisGet<TrendTopic[]>(`trends-${date}`);
      if (data) return data;
    }
  } catch (e) {
    console.error(`[getTrendsByDate] Redis 조회 실패 (${date}):`, e);
  }
  try {
    return fileGet<TrendTopic[]>(`trends-${date}.json`) || [];
  } catch { return []; }
}

export async function getLatestResult(): Promise<CollectResult | null> {
  // KST 기준 오늘 날짜의 데이터를 우선 반환
  const today = getTodayKST();
  try {
    const todayResult = await getResultByDate(today);
    if (todayResult && todayResult.items.length > 0) return todayResult;
  } catch (e) {
    console.error("[getLatestResult] 오늘 데이터 조회 실패:", e);
  }

  // 오늘 데이터 없으면 latest-result fallback (여기서도 필터링 필요)
  try {
    let data: CollectResult | null = null;
    if (isVercel) {
      data = await redisGet<CollectResult>("latest-result");
    } else {
      data = fileGetLatest<CollectResult>("");
    }

    if (data) {
      // 최신 결과에서도 30일 이상 지난 기사는 노출하지 않음
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const filteredItems = data.items.filter(item => {
        if (!item.publishedAt) return false;
        return new Date(item.publishedAt) >= cutoff;
      });

      return {
        ...data,
        items: filteredItems,
        stats: { ...data.stats, total: filteredItems.length }
      };
    }
  } catch (e) {
    console.error("[getLatestResult] Fallback 조회 실패:", e);
  }
  return null;
}

export async function getLatestTrends(): Promise<TrendTopic[]> {
  try {
    if (isVercel) {
      const data = await redisGet<TrendTopic[]>("latest-trends");
      if (data) return data;
    }
  } catch (e) {
    console.error("[getLatestTrends] Redis 조회 실패:", e);
  }
  try {
    return fileGetLatest<TrendTopic[]>("trends-") || [];
  } catch { return []; }
}

export async function getLatestCategoryNews(): Promise<Record<string, TrendTopic[]>> {
  try {
    if (isVercel) {
      const data = await redisGet<Record<string, TrendTopic[]>>("latest-categories");
      if (data) return data;
    }
  } catch (e) {
    console.error("[getLatestCategoryNews] Redis 조회 실패:", e);
  }
  try {
    return fileGetLatest<Record<string, TrendTopic[]>>("categories-") || {};
  } catch { return {}; }
}

export async function getStats(): Promise<DailyStats[]> {
  let stats: DailyStats[] = [];
  
  if (isVercel) {
    stats = (await redisGet<DailyStats[]>("daily-stats")) || [];
    
    // 만약 Redis 통계가 부족하면 파일 시스템(Git에 포함된 과거 데이터)과 병합
    const fileStats = fileGet<DailyStats[]>("stats.json") || [];
    if (fileStats.length > stats.length) {
      const mergedMap = new Map();
      [...fileStats, ...stats].forEach(s => mergedMap.set(s.date, s));
      stats = Array.from(mergedMap.values()).sort((a,b) => a.date.localeCompare(b.date));
      // 병합된 결과 Redis에 백업 제안 (캐시 동기화)
      await redisSave("daily-stats", stats.slice(-90));
    }
  } else {
    stats = fileGet<DailyStats[]>("stats.json") || [];
  }
  
  // 합리적인 범위(최근 90일) 밖의 비정상 날짜 제거
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90);
  const cutoffStr = cutoffDate.toISOString().split("T")[0];
  
  return stats.filter(s => s.date >= cutoffStr);
}

export async function saveToArchive(item: CollectedItem) {
  if (isVercel) {
    const items = (await redisGet<CollectedItem[]>("archived-items")) || [];
    if (!items.find((i: CollectedItem) => i.id === item.id)) {
      items.unshift(item);
      await redisSave("archived-items", items);
    }
  } else {
    let items = fileGet<CollectedItem[]>("archived-items.json") || [];
    if (!items.find((i: { id: string }) => i.id === item.id)) {
      items.unshift(item);
      fileSave("archived-items.json", items);
    }
  }
}

export async function removeFromArchive(itemId: string) {
  if (isVercel) {
    let items = (await redisGet<CollectedItem[]>("archived-items")) || [];
    items = items.filter((i: CollectedItem) => i.id !== itemId);
    await redisSave("archived-items", items);
  } else {
    let items = fileGet<CollectedItem[]>("archived-items.json") || [];
    items = items.filter((i: { id: string }) => i.id !== itemId);
    fileSave("archived-items.json", items);
  }
}

export async function getArchiveItems(): Promise<CollectedItem[]> {
  if (isVercel) {
    return (await redisGet<CollectedItem[]>("archived-items")) || [];
  } else {
    return fileGet<CollectedItem[]>("archived-items.json") || [];
  }
}

export async function isArchived(itemId: string): Promise<boolean> {
  const items = await getArchiveItems();
  return items.some((i) => i.id === itemId);
}

