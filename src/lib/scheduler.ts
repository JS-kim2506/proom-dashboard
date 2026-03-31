import cron from "node-cron";
import { runCollection } from "./collector";
import { saveCollectResult } from "./dataManager";

export function startScheduler() {
  // 매일 아침 7시에 자동 수집
  cron.schedule("0 7 * * *", async () => {
    console.log(`[스케줄러] ${new Date().toLocaleString("ko-KR")} 자동 수집 시작`);
    try {
      const { result, trends } = await runCollection();
      saveCollectResult(result, trends);
      console.log(`[스케줄러] 수집 완료: ${result.stats.total}건`);
    } catch (error) {
      console.error("[스케줄러] 수집 실패:", error);
    }
  }, {
    timezone: "Asia/Seoul",
  });

  console.log("[스케줄러] 매일 AM 7:00 자동 수집 활성화 (Asia/Seoul)");
}
