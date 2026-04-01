import type { CollectedItem } from "../types";

/**
 * 수집된 방대한 데이터를 기반으로 주요 이슈를 한눈에 파악할 수 있도록 요약합니다.
 * (추후 LLM 연동을 위한 전처리 및 기본 요약 로직)
 */

export function generateDailyDigest(items: CollectedItem[]): string {
  if (items.length === 0) return "오늘 수집된 데이터가 없습니다.";

  // 리스크 레벨이 높거나 감성이 매우 낮은 상위 3개 이슈 추출
  const criticalIssues = items
    .filter(i => i.alertLevel === "critical" || (i.sentiment !== undefined && i.sentiment < 30))
    .slice(0, 3);

  // 긍정적인 상위 2개 이슈 추출
  const positiveIssues = items
    .filter(i => i.sentiment !== undefined && i.sentiment > 70)
    .slice(0, 2);

  let digest = "### 📢 오늘 아침 AI 리스크 브리핑\n\n";

  if (criticalIssues.length > 0) {
    digest += "#### ⚠️ 주의가 필요한 리스크 이슈\n";
    criticalIssues.forEach(issue => {
      digest += `- **${issue.title}** (${issue.source}): ${issue.snippet?.slice(0, 100)}...\n`;
    });
  } else {
    digest += "✅ 현재 수집된 주요 리스크 이슈가 없습니다. 평온한 상태입니다.\n";
  }

  if (positiveIssues.length > 0) {
    digest += "\n#### ✨ 주요 긍정 바이럴/활동\n";
    positiveIssues.forEach(issue => {
      digest += `- **${issue.title}** (${issue.source})\n`;
    });
  }

  digest += `\n\n*총 ${items.length}건의 데이터를 분석한 결과입니다.*`;

  return digest;
}
