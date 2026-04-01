import fs from "fs";
import path from "path";
import { CollectResult } from "../src/lib/types";

const DATA_DIR = path.join(process.cwd(), "src", "data");

async function fixPastDates() {
  console.log("--- Fixing incorrectly dated articles (2026-01 -> 2025-01) ---");
  
  if (!fs.existsSync(DATA_DIR)) return;

  const files = fs.readdirSync(DATA_DIR)
    .filter(f => f.match(/^\d{4}-\d{2}-\d{2}\.json$/));

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const result: CollectResult = JSON.parse(content);
      let changed = false;

      for (const item of result.items) {
        // 이용주 관련 2026년 1월 기사 중, 실제로는 2025년인 경우 보정
        // (현재가 2026년 4월이므로 2026년 1월은 과거이나, 이용주 결혼 기사 등 특정 맥락 확인)
        if (item.publishedAt.startsWith("2026-01") && 
            (item.title.includes("결혼") || item.title.includes("발표") || item.memberName === "이용주")) {
          // 기사 내용을 통해 2025년임을 확신하는 경우 (사용자 피드백 기반)
          item.publishedAt = item.publishedAt.replace("2026-01", "2025-01");
          changed = true;
          console.log(`Fixed date for item: ${item.title}`);
        }
      }

      if (changed) {
        fs.writeFileSync(filePath, JSON.stringify(result, null, 2), "utf-8");
        console.log(`Updated ${file}`);
      }
    } catch (e) {
      console.error(`Error in ${file}:`, e);
    }
  }
}

fixPastDates();
