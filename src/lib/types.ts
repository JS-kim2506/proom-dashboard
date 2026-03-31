import type { AlertLevel } from "./alertKeywords";

export interface CollectedItem {
  id: string;
  title: string;
  link: string;
  source: string;
  sourceTier: 1 | 2;
  sourceType: "news" | "community" | "youtube" | "blog" | "trend";
  groupId: string;
  memberName?: string;
  keyword: string;
  publishedAt: string;
  collectedAt: string;
  alertLevel?: AlertLevel | null;
  snippet?: string;
}

export interface CollectResult {
  date: string;
  collectedAt: string;
  items: CollectedItem[];
  stats: CollectStats;
}

export interface CollectStats {
  total: number;
  byGroup: Record<string, number>;
  bySource: Record<string, number>;
  tierStatus: {
    tier1: { success: boolean; count: number; errors: string[] };
    tier2: { success: boolean; count: number; errors: string[] };
  };
}

export interface DailyStats {
  date: string;
  byGroup: Record<string, number>;
  total: number;
}

export interface TrendTopic {
  title: string;
  link: string;
  source: string;
  publishedAt: string;
  snippet?: string;
  summary?: string;
  category?: string;
}

export type NewsCategory = "politics" | "society" | "business" | "world" | "sports";

export const NEWS_CATEGORIES: { id: NewsCategory; label: string; icon: string; googleTopic: string }[] = [
  { id: "politics", label: "정치", icon: "🏛️", googleTopic: "NATION" },
  { id: "society", label: "사회", icon: "👥", googleTopic: "NATION" },
  { id: "business", label: "경제", icon: "💰", googleTopic: "BUSINESS" },
  { id: "world", label: "세계", icon: "🌍", googleTopic: "WORLD" },
  { id: "sports", label: "스포츠", icon: "⚽", googleTopic: "SPORTS" },
];
