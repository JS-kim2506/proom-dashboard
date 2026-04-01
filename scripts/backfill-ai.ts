import fs from "fs";
import path from "path";
import { CollectResult } from "../src/lib/types";
import { analyzeSentiment } from "../src/lib/ai/sentiment";
import { generateDailyDigest } from "../src/lib/ai/summarizer";

const DATA_DIR = path.join(process.cwd(), "src", "data");

async function backfillAi() {
  console.log("--- Backfilling AI Summary and Sentiment for existing data ---");
  
  if (!fs.existsSync(DATA_DIR)) return;

  const files = fs.readdirSync(DATA_DIR)
    .filter(f => f.match(/^\d{4}-\d{2}-\d{2}\.json$/));

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const result: CollectResult = JSON.parse(content);
      
      console.log(`Processing ${file}...`);
      
      // 1. 모든 아이템에 감성 분석 적용
      result.items = result.items.map(item => ({
        ...item,
        sentiment: analyzeSentiment(item.title + " " + (item.snippet || ""))
      }));

      // 2. 일일 통계 재계산 (평균 감량/감성)
      let totalSentiment = 0;
      for (const item of result.items) {
        totalSentiment += item.sentiment || 50;
      }
      result.stats.overallSentiment = result.items.length > 0 
        ? Math.round(totalSentiment / result.items.length) 
        : 50;

      // 3. AI 요약(Digest) 생성
      result.aiDigest = generateDailyDigest(result.items);

      fs.writeFileSync(filePath, JSON.stringify(result, null, 2), "utf-8");
      console.log(`Updated ${file} with AI data.`);
    } catch (e) {
      console.error(`Error in ${file}:`, e);
    }
  }
}

backfillAi();
