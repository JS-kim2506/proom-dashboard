export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // 서버 사이드 초기화 로직
    const { startScheduler } = await import("./lib/scheduler");
    startScheduler();
  }
}
