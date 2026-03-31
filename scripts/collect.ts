import { runCollection } from "../src/lib/collector";
import { saveCollectResult } from "../src/lib/dataManager";

async function main() {
  console.log("========================================");
  console.log(`[${new Date().toLocaleString("ko-KR")}] 데이터 수집 시작`);
  console.log("========================================");

  try {
    const { result, trends } = await runCollection();
    saveCollectResult(result, trends);

    console.log("========================================");
    console.log("[수집 완료 요약]");
    console.log(`  총 수집: ${result.stats.total}건`);
    console.log(`  그룹별:`, result.stats.byGroup);
    console.log(`  Tier 1: ${result.stats.tierStatus.tier1.success ? "✅" : "⚠️"} ${result.stats.tierStatus.tier1.count}건`);
    console.log(`  Tier 2: ${result.stats.tierStatus.tier2.success ? "✅" : "⚠️"} ${result.stats.tierStatus.tier2.count}건`);
    if (result.stats.tierStatus.tier2.errors.length > 0) {
      console.log(`  Tier 2 에러:`, result.stats.tierStatus.tier2.errors);
    }
    console.log(`  트렌드 토픽: ${trends.length}건`);
    console.log("========================================");
  } catch (error) {
    console.error("[수집 실패]", error);
    process.exit(1);
  }
}

main();
