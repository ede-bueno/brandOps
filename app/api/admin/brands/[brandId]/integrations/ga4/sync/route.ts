import { NextResponse } from "next/server";
import { requireBrandAccess } from "@/lib/brandops/admin";
import { syncGa4IntegrationForBrand } from "@/lib/brandops/integration-automation";

function formatGa4SyncError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error && "message" in error) {
    return String(error.message);
  }

  return "Falha ao sincronizar o GA4.";
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ brandId: string }> },
) {
  const startedAt = new Date().toISOString();
  let brandId = "";
  let authenticatedSupabase: Awaited<ReturnType<typeof requireBrandAccess>>["supabase"] | null =
    null;

  try {
    ({ brandId } = await params);
    const { supabase } = await requireBrandAccess(request, brandId);
    authenticatedSupabase = supabase;
    const result = await syncGa4IntegrationForBrand({
      supabase,
      brandId,
      trigger: "manual",
    });

    return NextResponse.json({
      ...result,
    });
  } catch (error) {
    const message = formatGa4SyncError(error);

    if (brandId && authenticatedSupabase) {
      try {
        await authenticatedSupabase
        .from("brand_integrations")
        .update({
          last_sync_status: "error",
          last_sync_error: message,
          last_sync_at: startedAt,
        })
        .eq("brand_id", brandId)
        .eq("provider", "ga4");
      } catch {
        // best effort
      }
    }

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
