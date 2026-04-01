import { NextRequest, NextResponse } from "next/server";
import { 
  getLatestResult, 
  getResultByDate, 
  getLatestTrends, 
  getTrendsByDate,
  getLatestCategoryNews, 
  getStats 
} from "@/lib/dataManager";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "latest";
  const date = searchParams.get("date");

  try {
    switch (type) {
      case "latest": {
        const result = date ? await getResultByDate(date) : await getLatestResult();
        return NextResponse.json(result || { items: [], stats: { total: 0, byGroup: {}, bySource: {} } });
      }
      case "trends": {
        const trends = date ? await getTrendsByDate(date) : await getLatestTrends();
        return NextResponse.json(trends || []);
      }
      case "categories": {
        // 카테고리 정보는 현재 최신만 제공하거나 날짜별 저장 필요 (일단 최신 유지)
        const categories = await getLatestCategoryNews();
        return NextResponse.json(categories || {});
      }
      case "stats": {
        const stats = await getStats();
        return NextResponse.json(stats || []);
      }
      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (error) {
    console.error(`[API Error] ${type}:`, error);
    return NextResponse.json({ error: "내부 서버 오류" }, { status: 500 });
  }
}
