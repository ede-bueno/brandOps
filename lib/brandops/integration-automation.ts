import type { SupabaseClient } from "@supabase/supabase-js";
import {
  normalizeIntegrationSettings,
  resolveGa4CredentialsForBrand,
  resolveMetaAccessTokenForBrand,
} from "@/lib/brandops/integration-config";
import type { BrandIntegrationConfig, IntegrationProvider } from "@/lib/brandops/types";
import { fetchGa4DailyPerformance, fetchGa4ItemDailyPerformance } from "@/lib/integrations/ga4";
import { syncMetaRowsForBrand, type MetaIntegrationSettings } from "@/lib/integrations/meta";

type BrandIntegrationRow = {
  id: string;
  brand_id: string;
  provider: IntegrationProvider;
  mode: string;
  settings: Record<string, unknown> | null;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
};

type SyncTrigger = "manual" | "auto";

export const INTEGRATION_AUTO_SYNC_INTERVAL_OPTIONS = [1, 2, 3, 6, 12, 24] as const;

export function normalizeAutoSyncIntervalHours(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 6;
  }

  const rounded = Math.max(1, Math.min(24, Math.round(value)));
  return (
    INTEGRATION_AUTO_SYNC_INTERVAL_OPTIONS.find((option) => option === rounded) ?? 6
  );
}

export function computeNextAutoSyncAt(referenceIso: string, intervalHours: number) {
  const next = new Date(referenceIso);
  next.setHours(next.getHours() + Math.max(1, intervalHours));
  return next.toISOString();
}

export function getIntegrationAutoSyncSettings(
  integration: Pick<BrandIntegrationConfig, "provider" | "settings" | "lastSyncAt"> | null | undefined,
) {
  if (!integration) {
    return {
      enabled: false,
      intervalHours: 6,
      lastRunAt: null,
      nextRunAt: null,
    };
  }

  const settings = normalizeIntegrationSettings(integration.provider, integration.settings);

  return {
    enabled: Boolean(settings.autoSyncEnabled),
    intervalHours: normalizeAutoSyncIntervalHours(settings.autoSyncIntervalHours),
    lastRunAt:
      typeof settings.autoSyncLastRunAt === "string"
        ? settings.autoSyncLastRunAt
        : integration.lastSyncAt ?? null,
    nextRunAt:
      typeof settings.autoSyncNextRunAt === "string" ? settings.autoSyncNextRunAt : null,
  };
}

export function getNextAutoSyncAtLabel(
  integration: Pick<BrandIntegrationConfig, "provider" | "settings" | "lastSyncAt"> | null | undefined,
) {
  const autoSync = getIntegrationAutoSyncSettings(integration);

  if (!autoSync.enabled) {
    return "Automação desligada";
  }

  if (autoSync.nextRunAt) {
    const nextRun = new Date(autoSync.nextRunAt);
    if (!Number.isNaN(nextRun.getTime())) {
      return nextRun.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  }

  if (autoSync.lastRunAt) {
    return `Após ${autoSync.intervalHours}h da última sincronização`;
  }

  return "Na próxima janela horária";
}

export function isIntegrationAutoSyncDue(
  integration: Pick<BrandIntegrationConfig, "provider" | "mode" | "settings" | "lastSyncAt" | "lastSyncStatus">,
  now = new Date(),
) {
  const settings = normalizeIntegrationSettings(integration.provider, integration.settings);
  const nextRunAt =
    typeof settings.autoSyncNextRunAt === "string" ? Date.parse(settings.autoSyncNextRunAt) : NaN;
  const lastReference =
    typeof settings.autoSyncLastRunAt === "string"
      ? settings.autoSyncLastRunAt
      : integration.lastSyncAt ?? null;
  const intervalHours = normalizeAutoSyncIntervalHours(settings.autoSyncIntervalHours);

  if (integration.mode !== "api" || !settings.autoSyncEnabled) {
    return false;
  }

  if (Number.isFinite(nextRunAt)) {
    return nextRunAt <= now.getTime();
  }

  if (!lastReference) {
    return true;
  }

  const intervalMs = intervalHours * 60 * 60 * 1000;
  const lastReferenceTime = Date.parse(lastReference);
  if (!Number.isFinite(lastReferenceTime)) {
    return true;
  }

  return lastReferenceTime + intervalMs <= now.getTime();
}

export function isAutoSyncDue(integration: BrandIntegrationConfig, now = new Date()) {
  return isIntegrationAutoSyncDue(integration, now);
}

async function updateAutoSyncMetadata(
  supabase: SupabaseClient,
  integration: BrandIntegrationRow,
  trigger: SyncTrigger,
  syncedAt: string,
) {
  if (trigger !== "auto") {
    return;
  }

  const normalized = normalizeIntegrationSettings(
    integration.provider,
    integration.settings,
  );

  await supabase
    .from("brand_integrations")
    .update({
      settings: {
        ...(integration.settings ?? {}),
        autoSyncEnabled: normalized.autoSyncEnabled,
        autoSyncIntervalHours: normalizeAutoSyncIntervalHours(normalized.autoSyncIntervalHours),
        autoSyncLastRunAt: syncedAt,
        autoSyncNextRunAt: computeNextAutoSyncAt(
          syncedAt,
          normalizeAutoSyncIntervalHours(normalized.autoSyncIntervalHours),
        ),
      },
    })
    .eq("id", integration.id);
}

function formatDateForGa4(value: string) {
  return value.slice(0, 10);
}

async function loadIntegrationOrThrow(
  supabase: SupabaseClient,
  brandId: string,
  provider: IntegrationProvider,
) {
  const { data, error } = await supabase
    .from("brand_integrations")
    .select("id, brand_id, provider, mode, settings, last_sync_at, last_sync_status, last_sync_error")
    .eq("brand_id", brandId)
    .eq("provider", provider)
    .single();

  if (error || !data) {
    throw error ?? new Error(`Integração ${provider} não encontrada para esta loja.`);
  }

  return data as BrandIntegrationRow;
}

export async function syncMetaIntegrationForBrand(options: {
  supabase: SupabaseClient;
  brandId: string;
  trigger?: SyncTrigger;
}) {
  const integration = await loadIntegrationOrThrow(
    options.supabase,
    options.brandId,
    "meta",
  );

  if (integration.mode !== "api") {
    throw new Error("A integração da Meta precisa estar em modo API para sincronizar.");
  }

  const metaAccess = await resolveMetaAccessTokenForBrand({
    brandId: options.brandId,
    settings: integration.settings,
  });

  const result = await syncMetaRowsForBrand(options.supabase, {
    brandId: options.brandId,
    integrationId: integration.id,
    settings:
      integration.settings &&
      typeof integration.settings === "object" &&
      !Array.isArray(integration.settings)
        ? (integration.settings as MetaIntegrationSettings)
        : {},
    accessToken: metaAccess.accessToken,
  });

  await updateAutoSyncMetadata(
    options.supabase,
    integration,
    options.trigger ?? "manual",
    result.syncedAt,
  );

  return result;
}

export async function syncGa4IntegrationForBrand(options: {
  supabase: SupabaseClient;
  brandId: string;
  trigger?: SyncTrigger;
}) {
  const integration = await loadIntegrationOrThrow(
    options.supabase,
    options.brandId,
    "ga4",
  );

  if (integration.mode !== "api") {
    throw new Error("A integração do GA4 precisa estar em modo API para sincronizar.");
  }

  const settings = normalizeIntegrationSettings("ga4", integration.settings);
  const propertyId =
    typeof settings.propertyId === "string" ? settings.propertyId.trim() : "";
  if (!propertyId) {
    throw new Error("Property ID do GA4 não configurado para esta loja.");
  }

  await options.supabase
    .from("brand_integrations")
    .update({
      last_sync_status: "running",
      last_sync_error: null,
    })
    .eq("id", integration.id);

  const { data: firstOrderRow, error: firstOrderError } = await options.supabase
    .from("orders")
    .select("order_date")
    .eq("brand_id", options.brandId)
    .order("order_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (firstOrderError) {
    throw firstOrderError;
  }

  const now = new Date();
  const fallbackStart = new Date(now);
  fallbackStart.setDate(fallbackStart.getDate() - 90);

  const startDate = firstOrderRow?.order_date
    ? formatDateForGa4(firstOrderRow.order_date)
    : fallbackStart.toISOString().slice(0, 10);
  const endDate = now.toISOString().slice(0, 10);

  const ga4Access = await resolveGa4CredentialsForBrand({
    brandId: options.brandId,
    settings: integration.settings,
  });

  const [rows, itemRows] = await Promise.all([
    fetchGa4DailyPerformance(propertyId, startDate, endDate, {
      credentials: ga4Access.credentials,
    }),
    fetchGa4ItemDailyPerformance(propertyId, startDate, endDate, {
      credentials: ga4Access.credentials,
    }),
  ]);
  const syncedAt = new Date().toISOString();

  if (rows.length) {
    const dates = [...new Set(rows.map((row) => row.date))];
    const { error: deleteError } = await options.supabase
      .from("ga4_daily_performance")
      .delete()
      .eq("brand_id", options.brandId)
      .in("date", dates);

    if (deleteError) {
      throw deleteError;
    }

    const payload = rows.map((row) => ({
      brand_id: options.brandId,
      date: row.date,
      source_medium: row.sourceMedium,
      campaign_name: row.campaignName,
      landing_page: row.landingPage,
      sessions: row.sessions,
      total_users: row.totalUsers,
      page_views: row.pageViews,
      add_to_carts: row.addToCarts,
      begin_checkouts: row.beginCheckouts,
      purchases: row.purchases,
      purchase_revenue: row.purchaseRevenue,
      last_synced_at: syncedAt,
    }));

    const { error: insertError } = await options.supabase
      .from("ga4_daily_performance")
      .insert(payload);

    if (insertError) {
      throw insertError;
    }
  }

  if (itemRows.length) {
    const dates = [...new Set(itemRows.map((row) => row.date))];
    const { error: deleteError } = await options.supabase
      .from("ga4_item_daily_performance")
      .delete()
      .eq("brand_id", options.brandId)
      .in("date", dates);

    if (deleteError) {
      throw deleteError;
    }

    const payload = itemRows.map((row) => ({
      brand_id: options.brandId,
      date: row.date,
      item_id: row.itemId,
      item_name: row.itemName,
      item_brand: row.itemBrand,
      item_category: row.itemCategory,
      item_views: row.itemViews,
      add_to_carts: row.addToCarts,
      checkouts: row.checkouts,
      ecommerce_purchases: row.ecommercePurchases,
      item_purchase_quantity: row.itemPurchaseQuantity,
      item_revenue: row.itemRevenue,
      cart_to_view_rate: row.cartToViewRate,
      purchase_to_view_rate: row.purchaseToViewRate,
      last_synced_at: syncedAt,
    }));

    const { error: insertError } = await options.supabase
      .from("ga4_item_daily_performance")
      .insert(payload);

    if (insertError) {
      throw insertError;
    }
  }

  await options.supabase
    .from("brand_integrations")
    .update({
      last_sync_at: syncedAt,
      last_sync_status: "success",
      last_sync_error: null,
      settings: {
        ...(integration.settings ?? {}),
        timezone: settings.timezone,
      },
    })
    .eq("id", integration.id);

  await updateAutoSyncMetadata(
    options.supabase,
    integration,
    options.trigger ?? "manual",
    syncedAt,
  );

  return {
    synced: true,
    propertyId,
    startDate,
    endDate,
    rows: rows.length,
    itemRows: itemRows.length,
    syncedAt,
  };
}
