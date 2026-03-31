import type { CollectResult, DailyStats, TrendTopic } from "./types";

// Vercel 배포 시 Upstash Redis 사용, 로컬에서는 파일 시스템 사용
const isVercel = process.env.VERCEL === "1" || !!process.env.KV_REST_API_URL;

// ========== Redis 기반 (Vercel) ==========
async function getRedis() {
  const { Redis } = await import("@upstash/redis");
  return new Redis({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!,
  });
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
  await redisSave("daily-stats", stats.slice(-30));
}

function updateStatsFile(result: CollectResult) {
  let stats = fileGet<DailyStats[]>("stats.json") || [];
  const dailyStat: DailyStats = { date: result.date, byGroup: result.stats.byGroup, total: result.stats.total };
  const idx = stats.findIndex((s) => s.date === result.date);
  if (idx >= 0) stats[idx] = dailyStat;
  else stats.push(dailyStat);
  fileSave("stats.json", stats.slice(-30));
}

export async function getLatestResult(): Promise<CollectResult | null> {
  if (isVercel) return redisGet<CollectResult>("latest-result");
  return fileGetLatest<CollectResult>("");
}

export async function getLatestTrends(): Promise<TrendTopic[]> {
  if (isVercel) return (await redisGet<TrendTopic[]>("latest-trends")) || [];
  return fileGetLatest<TrendTopic[]>("trends-") || [];
}

export async function getLatestCategoryNews(): Promise<Record<string, TrendTopic[]>> {
  if (isVercel) return (await redisGet<Record<string, TrendTopic[]>>("latest-categories")) || {};
  return fileGetLatest<Record<string, TrendTopic[]>>("categories-") || {};
}

export async function getStats(): Promise<DailyStats[]> {
  if (isVercel) return (await redisGet<DailyStats[]>("daily-stats")) || [];
  return fileGet<DailyStats[]>("stats.json") || [];
}
