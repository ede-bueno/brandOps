import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/brandops/admin";
import { syncMetaRowsForBrand, type MetaIntegrationSettings } from "@/lib/integrations/meta";

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

  try {
    const { supabase } = await requireSuperAdmin(request);
    const { brandId } = await params;

    const { data: integration, error: integrationError } = await supabase
      .from("brand_integrations")
      .select("id, mode, settings")
      .eq("brand_id", brandId)
      .eq("provider", "meta")
      .single();

    if (integrationError || !integration) {
      throw integrationError ?? new Error("Integração da Meta não encontrada para esta loja.");
    }

    if (integration.mode !== "api") {
      throw new Error("A integração da Meta precisa estar em modo API para sincronizar.");
    }

    const result = await syncMetaRowsForBrand(supabase, {
      brandId,
      integrationId: integration.id,
      settings:
        integration.settings &&
        typeof integration.settings === "object" &&
        !Array.isArray(integration.settings)
          ? (integration.settings as MetaIntegrationSettings)
          : {},
    });

    return NextResponse.json({
      synced: true,
      ...result,
    });
  } catch (error) {
    const message = formatError(error);

    try {
      const { brandId } = await params;
      const { supabase } = await requireSuperAdmin(request);
      await supabase
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

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
