import { NextResponse } from "next/server";
import { requireBrandAccess } from "@/lib/brandops/admin";
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
    const search = url.searchParams.get("search");
    const status = url.searchParams.get("status");
    const productType = url.searchParams.get("productType");
    const collection = url.searchParams.get("collection");

    const { data, error } = await supabase.rpc("get_catalog_report", {
      p_brand_id: brandId,
      p_from: from,
      p_to: to,
      p_search: search?.trim() || null,
      p_status:
        status === "sold" || status === "unsold" || status === "all" ? status : "all",
      p_product_type: productType?.trim() || "all",
      p_collection: collection?.trim() || "all",
    });

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível montar o relatório do catálogo.",
      },
      { status: 400 },
    );
  }
}
