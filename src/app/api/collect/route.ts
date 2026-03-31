import { NextResponse } from "next/server";
import { runCollection } from "@/lib/collector";
import { saveCollectResult } from "@/lib/dataManager";

export const maxDuration = 120;

export async function POST() {
  try {
    const { result, trends, categoryNews } = await runCollection();
    await saveCollectResult(result, trends, categoryNews);

    return NextResponse.json({
      success: true,
      message: `수집 완료: ${result.stats.total}건`,
      stats: result.stats,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: String(error) },
      { status: 500 }
    );
  }
}

// Vercel Cron: 매일 AM 7:00 KST (UTC 22:00) 자동 수집
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // 로컬에서는 CRON_SECRET 없이도 동작
    if (process.env.VERCEL === "1") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const { result, trends, categoryNews } = await runCollection();
    await saveCollectResult(result, trends, categoryNews);

    return NextResponse.json({
      success: true,
      message: `Cron 수집 완료: ${result.stats.total}건`,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: String(error) },
      { status: 500 }
    );
  }
}
