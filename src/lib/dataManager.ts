import type { CollectResult, DailyStats, TrendTopic } from "./types";

// Vercel 배포 시 Upstash Redis 사용, 로컬에서는 파일 시스템 사용
const isVercel = process.env.VERCEL === "1" || !!process.env.KV_REST_API_URL;

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
  cutoff.setDate(cutoff.getDate() - 30);

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
  if (isVercel) {
    await Promise.all([
      redisSave("latest-result", result),
      redisSave("latest-trends", trends),
      categoryNews ? redisSave("latest-categories", categoryNews) : Promise.resolve(),
      saveStatsRedis(result),
    ]);
  } else {
    fileSave(`${result.date}.json`, result);
    fileSave(`trends-${result.date}.json`, trends);
    if (categoryNews) fileSave(`categories-${result.date}.json`, categoryNews);
    updateStatsFile(result);
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
  let data = null;
  if (isVercel) data = await redisGet<CollectResult>(`result-${date}`);
  if (!data) data = fileGet<CollectResult>(`${date}.json`); // Fallback to file
  return data;
}

export async function getTrendsByDate(date: string): Promise<TrendTopic[]> {
  let data = null;
  if (isVercel) data = await redisGet<TrendTopic[]>(`trends-${date}`);
  if (!data) data = fileGet<TrendTopic[]>(`trends-${date}.json`); // Fallback to file
  return data || [];
}

export async function getLatestResult(): Promise<CollectResult | null> {
  let data = null;
  if (isVercel) data = await redisGet<CollectResult>("latest-result");
  if (!data) data = fileGetLatest<CollectResult>(""); // Fallback to file
  return data;
}

export async function getLatestTrends(): Promise<TrendTopic[]> {
  let data = null;
  if (isVercel) data = await redisGet<TrendTopic[]>("latest-trends");
  if (!data) data = fileGetLatest<TrendTopic[]>("trends-"); // Fallback to file
  return data || [];
}

export async function getLatestCategoryNews(): Promise<Record<string, TrendTopic[]>> {
  let data = null;
  if (isVercel) data = await redisGet<Record<string, TrendTopic[]>>("latest-categories");
  if (!data) data = fileGetLatest<Record<string, TrendTopic[]>>("categories-"); // Fallback to file
  return data || {};
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
  
  return stats;
}
