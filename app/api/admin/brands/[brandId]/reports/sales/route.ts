import { NextResponse } from "next/server";
import { requireBrandAccess } from "@/lib/brandops/admin";
import { parseDateParam } from "@/lib/brandops/server/report-params";
import { normalizeSalesDetailReportPayload } from "@/lib/brandops/server/sales-report";

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

    const { data, error } = await supabase.rpc("get_sales_detail_report", {
      p_brand_id: brandId,
      p_from: from,
      p_to: to,
    });

    if (error) {
      throw error;
    }

    return NextResponse.json(
      normalizeSalesDetailReportPayload(data, {
        from,
        to,
      }),
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível montar o relatório detalhado de vendas.",
      },
      { status: 400 },
    );
  }
}
