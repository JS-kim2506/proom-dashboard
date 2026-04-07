import { NextResponse } from "next/server";
import { runCollection } from "@/lib/collector";
import { saveCollectResult } from "@/lib/dataManager";

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const targetDate = body.date;
    
    console.log(`[POST /api/collect] 수집 시작... (대상 날짜: ${targetDate || "오늘"})`);
    const startTime = Date.now();
    const { result, trends, categoryNews } = await runCollection(targetDate);
    console.log(`[POST /api/collect] 수집 완료: ${result.stats.total}건 (${((Date.now() - startTime) / 1000).toFixed(1)}초)`);
    console.log("[POST /api/collect] stats:", JSON.stringify(result.stats));

    console.log(`[POST /api/collect] 결과 데이터 크기: ${JSON.stringify(result).length} bytes`);
    await saveCollectResult(result, trends, categoryNews);
    console.log(`[POST /api/collect] ${result.date} 일자 데이터 저장 완료`);

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
    const { searchParams } = new URL(request.url);
    const targetDate = searchParams.get("date");
    
    console.log(`[Cron /api/collect] ${new Date().toISOString()} 자동 수집 실행... (대상 날짜: ${targetDate || "오늘"})`);
    const { result, trends, categoryNews } = await runCollection(targetDate || undefined);
    await saveCollectResult(result, trends, categoryNews);
    console.log(`[Cron /api/collect] ${result.date} 자동 수집 및 저장 완료 (총 ${result.stats.total}건)`);

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
