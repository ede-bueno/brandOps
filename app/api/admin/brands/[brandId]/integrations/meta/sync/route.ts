import { NextResponse } from "next/server";
import { requireBrandAccess } from "@/lib/brandops/admin";
import { syncMetaIntegrationForBrand } from "@/lib/brandops/integration-automation";

function formatError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error && "message" in error) {
    return String(error.message);
  }

  return "Falha ao sincronizar a Meta.";
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
    const result = await syncMetaIntegrationForBrand({
      supabase,
      brandId,
      trigger: "manual",
    });

    return NextResponse.json({
      synced: true,
      ...result,
    });
  } catch (error) {
    const message = formatError(error);

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
        .eq("provider", "meta");
      } catch {
        // best effort
      }
    }

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
