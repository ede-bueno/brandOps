import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import {
  acquireCronJobLock,
  releaseCronJobLock,
  renewCronJobLock,
} from "@/lib/brandops/cron-lock";
import {
  isIntegrationAutoSyncDue,
  syncGa4IntegrationForBrand,
  syncMetaIntegrationForBrand,
} from "@/lib/brandops/integration-automation";

const BRAND_SYNCS_CRON_LOCK = "cron:brand-syncs";
const BRAND_SYNCS_CRON_TTL_SECONDS = 90 * 60;

function formatMetaCronError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error && "message" in error) {
    return String(error.message);
  }

  return "Falha ao executar o cron da Meta.";
}

function formatGa4CronError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error && "message" in error) {
    return String(error.message);
  }

  return "Falha ao executar o cron do GA4.";
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const supabase = createSupabaseServiceRoleClient();
    const ownerId = crypto.randomUUID();
    const lock = await acquireCronJobLock(supabase, {
      jobName: BRAND_SYNCS_CRON_LOCK,
      ownerId,
      ttlSeconds: BRAND_SYNCS_CRON_TTL_SECONDS,
      meta: {
        route: "/api/cron/brand-syncs",
      },
    });

    if (!lock.acquired) {
      return NextResponse.json(
        {
          skipped: true,
          reason: "lock_active",
          jobName: BRAND_SYNCS_CRON_LOCK,
          lockExpiresAt: lock.expiresAt,
          ownerId: lock.ownerId,
        },
        { status: 202 },
      );
    }

    try {
      const { data: integrations, error } = await supabase
        .from("brand_integrations")
        .select("id, brand_id, provider, mode, settings, last_sync_at, last_sync_status")
        .in("provider", ["meta", "ga4"])
        .eq("mode", "api");

      if (error) {
        throw error;
      }

      const dueIntegrations = (integrations ?? []).filter((integration) =>
        isIntegrationAutoSyncDue({
          provider: integration.provider,
          mode: integration.mode,
          settings:
            integration.settings &&
            typeof integration.settings === "object" &&
            !Array.isArray(integration.settings)
              ? integration.settings
              : {},
          lastSyncAt: integration.last_sync_at ?? null,
          lastSyncStatus: integration.last_sync_status ?? "idle",
        }),
      );

      const results = [];

      for (const integration of dueIntegrations) {
        try {
          if (integration.provider === "meta") {
            const result = await syncMetaIntegrationForBrand({
              supabase,
              brandId: integration.brand_id,
              trigger: "auto",
            });

            results.push({
              brandId: integration.brand_id,
              provider: integration.provider,
              status: "success",
              ...result,
            });
          } else {
            const result = await syncGa4IntegrationForBrand({
              supabase,
              brandId: integration.brand_id,
              trigger: "auto",
            });

            results.push({
              brandId: integration.brand_id,
              provider: integration.provider,
              status: "success",
              ...result,
            });
          }
        } catch (error) {
          const message =
            integration.provider === "ga4" ? formatGa4CronError(error) : formatMetaCronError(error);

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
            provider: integration.provider,
            status: "error",
            error: message,
          });
        }

        const renewal = await renewCronJobLock(supabase, {
          jobName: BRAND_SYNCS_CRON_LOCK,
          ownerId,
          ttlSeconds: BRAND_SYNCS_CRON_TTL_SECONDS,
        });

        if (!renewal.renewed) {
          throw new Error("O lock do cron central foi perdido durante a execução.");
        }
      }

      return NextResponse.json({
        checkedIntegrations: integrations?.length ?? 0,
        executedIntegrations: dueIntegrations.length,
        results,
      });
    } finally {
      await releaseCronJobLock(supabase, {
        jobName: BRAND_SYNCS_CRON_LOCK,
        ownerId,
      }).catch(() => undefined);
    }
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Falha ao executar o cron de integrações.",
      },
      { status: 500 },
    );
  }
}
