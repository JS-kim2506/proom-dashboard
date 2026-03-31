export type AlertLevel = "critical" | "warning" | "info";

export const ALERT_KEYWORDS: Record<AlertLevel, string[]> = {
  critical: ["논란", "고소", "폭로", "사과문", "탈퇴", "해체", "구속", "체포", "성추행", "성폭행", "음주운전"],
  warning: ["해명", "사건", "루머", "의혹", "비판", "갈등", "불화", "소송", "고발"],
  info: ["컴백", "신작", "콜라보", "출연", "수상", "1위", "신규", "오픈"],
};

export function detectAlertLevel(text: string): AlertLevel | null {
  for (const keyword of ALERT_KEYWORDS.critical) {
    if (text.includes(keyword)) return "critical";
  }
  for (const keyword of ALERT_KEYWORDS.warning) {
    if (text.includes(keyword)) return "warning";
  }
  for (const keyword of ALERT_KEYWORDS.info) {
    if (text.includes(keyword)) return "info";
  }
  return null;
}

export function getAlertStyle(level: AlertLevel) {
  switch (level) {
    case "critical":
      return { bg: "bg-red-100", border: "border-red-500", text: "text-red-800", icon: "🚨" };
    case "warning":
      return { bg: "bg-orange-100", border: "border-orange-500", text: "text-orange-800", icon: "⚠️" };
    case "info":
      return { bg: "bg-blue-100", border: "border-blue-500", text: "text-blue-800", icon: "ℹ️" };
  }
}
