import { NextResponse } from "next/server";
import { requireBrandAccess } from "@/lib/brandops/admin";
import {
  syncMetaCatalogForBrand,
  type MetaIntegrationSettings,
} from "@/lib/integrations/meta";

function formatError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error && "message" in error) {
    return String(error.message);
  }

  return "Falha ao sincronizar o catálogo da Meta.";
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ brandId: string }> },
) {
  let brandId = "";
  let authenticatedSupabase: Awaited<ReturnType<typeof requireBrandAccess>>["supabase"] | null =
    null;

  try {
    ({ brandId } = await params);
    const { supabase } = await requireBrandAccess(request, brandId);
    authenticatedSupabase = supabase;

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
      throw new Error("A integração da Meta precisa estar em modo API para sincronizar o catálogo.");
    }

    const settings =
      integration.settings &&
      typeof integration.settings === "object" &&
      !Array.isArray(integration.settings)
        ? (integration.settings as MetaIntegrationSettings)
        : {};

    const result = await syncMetaCatalogForBrand(supabase, {
      brandId,
      integrationId: integration.id,
      settings,
    });

    return NextResponse.json({
      synced: true,
      ...result,
    });
  } catch (error) {
    const message = formatError(error);

    if (brandId && authenticatedSupabase) {
      try {
        const { data: current } = await authenticatedSupabase
          .from("brand_integrations")
          .select("settings")
          .eq("brand_id", brandId)
          .eq("provider", "meta")
          .single();

        const settings =
          current?.settings &&
          typeof current.settings === "object" &&
          !Array.isArray(current.settings)
            ? (current.settings as Record<string, unknown>)
            : {};

        await authenticatedSupabase
          .from("brand_integrations")
          .update({
            settings: {
              ...settings,
              catalogSyncStatus: "error",
              catalogSyncError: message,
            },
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
