import { runCollection } from "../src/lib/collector";
import { saveCollectResult } from "../src/lib/dataManager";

async function backfill() {
  const days = 90;
  const now = new Date();
  
  console.log(`🚀Starting 3-month backfill (${days} days)`);
  
  for (let i = days; i >= 1; i--) {
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() - i);
    const dateStr = targetDate.toISOString().split("T")[0];
    
    console.log(`\n--- [${dateStr}] (${days - i + 1}/${days}) 수집 중... ---`);
    
    try {
      const { result, trends, categoryNews } = await runCollection(dateStr);
      await saveCollectResult(result, trends, categoryNews);
      console.log(`✅ [${dateStr}] 완료: ${result.stats.total}건 수집됨`);
      
      // 사이트 차단 방지를 위한 지연 시간 (3~5초)
      const delay = Math.floor(Math.random() * 2000) + 3000;
      await new Promise(r => setTimeout(r, delay));
    } catch (error) {
      console.error(`❌ [${dateStr}] 실패:`, error);
    }
  }
  
  console.log("\n✨ 모든 백필 작업이 완료되었습니다!");
}

backfill();
