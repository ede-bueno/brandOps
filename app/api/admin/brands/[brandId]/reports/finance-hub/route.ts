import { NextResponse } from "next/server";
import { requireBrandAccess } from "@/lib/brandops/admin";
import { buildFinanceHubReport } from "@/lib/brandops/server/management-reports";
import { parseDateParam } from "@/lib/brandops/server/report-params";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ brandId: string }> },
) {
  try {
    const { brandId } = await params;
    const { supabase } = await requireBrandAccess(request, brandId);
    const url = new URL(request.url);
    const from = parseDateParam(url.searchParams.get("from"));
    const to = parseDateParam(url.searchParams.get("to"));

    return NextResponse.json(await buildFinanceHubReport(supabase, brandId, from, to));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível montar o hub Financeiro.",
      },
      { status: 400 },
    );
  }
}
