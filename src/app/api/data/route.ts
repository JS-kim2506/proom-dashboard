import { NextRequest, NextResponse } from "next/server";
import { getLatestResult, getLatestTrends, getLatestCategoryNews, getStats } from "@/lib/dataManager";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "latest";

  switch (type) {
    case "latest": {
      const result = await getLatestResult();
      return NextResponse.json(result || { items: [], stats: { total: 0, byGroup: {}, bySource: {} } });
    }
    case "trends": {
      const trends = await getLatestTrends();
      return NextResponse.json(trends);
    }
    case "categories": {
      const categories = await getLatestCategoryNews();
      return NextResponse.json(categories);
    }
    case "stats": {
      const stats = await getStats();
      return NextResponse.json(stats);
    }
    default:
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }
}
