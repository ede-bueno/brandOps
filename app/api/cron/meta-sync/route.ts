import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  return NextResponse.json({
    retired: true,
    executed: false,
    path: "/api/cron/meta-sync",
    replacement: "/api/cron/brand-syncs",
    message:
      "A rota legada da Meta foi aposentada. O cron central de integrações agora roda em /api/cron/brand-syncs.",
  }, { status: 410 });
}
