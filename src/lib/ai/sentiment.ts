/**
 * 기본적인 규칙 기반 감성 분석 엔진 (Base implementation)
 * 추후 GPT API로 확장 가능하도록 설계되었습니다.
 */

const POS_KEYWORDS = ["축하", "기부", "선행", "성공", "컴백", "복귀", "1위", "웃음", "인기", "감동", "결혼"];
const NEG_KEYWORDS = ["논란", "비판", "의혹", "사과", "해명", "실망", "고소", "폭로", "수사", "부정", "혐오"];

export function analyzeSentiment(text: string): number {
  let score = 50; // 기본 중립

  for (const word of POS_KEYWORDS) {
    if (text.includes(word)) score += 10;
  }
  for (const word of NEG_KEYWORDS) {
    if (text.includes(word)) score -= 15;
  }

  // 0~100 사이로 보정
  return Math.max(0, Math.min(100, score));
}

export function getSentimentLabel(score: number): { label: string; color: string } {
  if (score >= 70) return { label: "긍정", color: "text-green-500" };
  if (score <= 30) return { label: "부정", color: "text-red-500" };
  return { label: "중립", color: "text-gray-500" };
}
