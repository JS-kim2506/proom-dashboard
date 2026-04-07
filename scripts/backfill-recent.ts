import { runCollection } from "../src/lib/collector";
import { saveCollectResult } from "../src/lib/dataManager";
import fs from "fs";
import path from "path";

async function backfillRecent() {
  const lookbackDays = 7;
  const now = new Date();
  const DATA_DIR = path.join(process.cwd(), "src", "data");

  console.log(`🚀 [백필] 최근 ${lookbackDays}일간 누락된 데이터 확인 및 수집 시작...`);

  for (let i = lookbackDays; i >= 0; i--) {
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() - i);
    const dateStr = targetDate.toISOString().split("T")[0];

    const filePath = path.join(DATA_DIR, `${dateStr}.json`);
    
    if (fs.existsSync(filePath)) {
      console.log(`📍 [${dateStr}] 데이터 이미 존재함. 건너뜁니다.`);
      continue;
    }

    console.log(`\n--- [${dateStr}] 데이터 수집 중... ---`);

    try {
      const { result, trends, categoryNews } = await runCollection(dateStr);
      await saveCollectResult(result, trends, categoryNews);
      console.log(`✅ [${dateStr}] 완료: ${result.stats.total}건 수집 및 저장됨`);

      // API 차단 방지를 위한 짧은 지연 (3초)
      if (i > 0) {
        await new Promise(r => setTimeout(r, 3000));
      }
    } catch (error) {
      console.error(`❌ [${dateStr}] 실패:`, error);
    }
  }

  console.log("\n✨ 최근 데이터 백필 작업이 완료되었습니다.");
}

backfillRecent().catch(console.error);
