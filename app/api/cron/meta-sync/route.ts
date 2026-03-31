import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { syncMetaRowsForBrand, type MetaIntegrationSettings } from "@/lib/integrations/meta";

function formatError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error && "message" in error) {
    return String(error.message);
  }

  return "Falha ao executar o cron da Meta.";
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const supabase = createSupabaseServiceRoleClient();

    const { data: integrations, error } = await supabase
      .from("brand_integrations")
      .select("id, brand_id, settings")
      .eq("provider", "meta")
      .eq("mode", "api");

    if (error) {
      throw error;
    }

    const eligibleIntegrations = (integrations ?? []).filter((integration) => {
      const settings =
        integration.settings &&
        typeof integration.settings === "object" &&
        !Array.isArray(integration.settings)
          ? (integration.settings as MetaIntegrationSettings)
          : {};

      return typeof settings.adAccountId === "string" && settings.adAccountId.trim().length > 0;
    });

    const results = [];
    for (const integration of eligibleIntegrations) {
      try {
        const result = await syncMetaRowsForBrand(supabase, {
          brandId: integration.brand_id,
          integrationId: integration.id,
          settings:
            integration.settings &&
            typeof integration.settings === "object" &&
            !Array.isArray(integration.settings)
              ? (integration.settings as MetaIntegrationSettings)
              : {},
        });

        results.push({
          brandId: integration.brand_id,
          status: "success",
          ...result,
        });
      } catch (error) {
        const message = formatError(error);
        await supabase
          .from("brand_integrations")
          .update({
            last_sync_status: "error",
            last_sync_error: message,
            last_sync_at: new Date().toISOString(),
          })
          .eq("id", integration.id);

        results.push({
          brandId: integration.brand_id,
          status: "error",
          error: message,
        });
      }
    }

    return NextResponse.json({
      syncedBrands: results.length,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      { error: formatError(error) },
      { status: 500 },
    );
  }
}
