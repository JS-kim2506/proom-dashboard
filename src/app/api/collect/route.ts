import { NextResponse } from "next/server";
import { runCollection } from "@/lib/collector";
import { saveCollectResult } from "@/lib/dataManager";

export const maxDuration = 120;

export async function POST() {
  try {
    console.log("[POST /api/collect] 수집 시작...");
    const startTime = Date.now();
    const { result, trends, categoryNews } = await runCollection();
    console.log(`[POST /api/collect] 수집 완료: ${result.stats.total}건 (${((Date.now() - startTime) / 1000).toFixed(1)}초)`);
    console.log("[POST /api/collect] stats:", JSON.stringify(result.stats));

    await saveCollectResult(result, trends, categoryNews);
    console.log("[POST /api/collect] 저장 완료");

    return NextResponse.json({
      success: true,
      message: `수집 완료: ${result.stats.total}건`,
      stats: result.stats,
    });
  } catch (error) {
    console.error("[POST /api/collect] 실패:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// Vercel Cron: 매일 AM 7:00 KST (UTC 22:00) 자동 수집
export async function GET(request: Request) {
  // Vercel Cron은 CRON_SECRET 없이도 동작하도록 허용
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { result, trends, categoryNews } = await runCollection();
    await saveCollectResult(result, trends, categoryNews);

    return NextResponse.json({
      success: true,
      message: `Cron 수집 완료: ${result.stats.total}건`,
    });
  } catch (error) {
    console.error("[GET /api/collect] Cron 실패:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
