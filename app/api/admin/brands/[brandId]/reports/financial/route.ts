import { NextResponse } from "next/server";
import { requireBrandAccess } from "@/lib/brandops/admin";
import { normalizeFinancialReportPayload } from "@/lib/brandops/server/financial-report";
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

    const { data, error } = await supabase.rpc("get_financial_report", {
      p_brand_id: brandId,
      p_from: from,
      p_to: to,
    });

    if (error) {
      throw error;
    }

    return NextResponse.json(normalizeFinancialReportPayload(data));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível montar o relatório financeiro canônico.",
      },
      { status: 400 },
    );
  }
}
