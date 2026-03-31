import type { SupabaseClient } from "@supabase/supabase-js";
import type { MetaRowPayload } from "@/lib/brandops/canonical-ingest";

const PURCHASE_ACTION_TYPES = new Set([
  "offsite_conversion.fb_pixel_purchase",
  "onsite_web_purchase",
  "omni_purchase",
  "purchase",
]);

const ADD_TO_CART_ACTION_TYPES = new Set([
  "offsite_conversion.fb_pixel_add_to_cart",
  "onsite_web_add_to_cart",
  "omni_add_to_cart",
  "add_to_cart",
]);

type MetaActionRow = {
  action_type?: string;
  value?: string;
};

type MetaInsightsRow = {
  account_name?: string;
  campaign_name?: string;
  adset_name?: string;
  ad_name?: string;
  publisher_platform?: string;
  platform_position?: string;
  impression_device?: string;
  date_start?: string;
  date_stop?: string;
  spend?: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  inline_link_clicks?: string;
  ctr?: string;
  inline_link_click_ctr?: string;
  actions?: MetaActionRow[];
  action_values?: MetaActionRow[];
};

type MetaApiResponse = {
  data?: MetaInsightsRow[];
  paging?: {
    next?: string;
  };
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
};

type FetchMetaInsightsOptions = {
  adAccountId: string;
  startDate: string;
  endDate: string;
};

export type MetaIntegrationSettings = {
  adAccountId?: string | null;
  manualFallback?: boolean;
  syncWindowDays?: number | null;
};

export type MetaSyncResult = {
  startDate: string;
  endDate: string;
  rows: number;
  inserted: number;
  updated: number;
  syncedAt: string;
};

function getMetaAccessToken() {
  const token = process.env.META_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new Error("META_ACCESS_TOKEN não configurada.");
  }

  return token;
}

function getMetaApiVersion() {
  return process.env.META_API_VERSION?.trim() || "v19.0";
}

function normalizeAdAccountId(adAccountId: string) {
  const normalized = adAccountId.trim();
  if (!normalized) {
    throw new Error("ID da conta de anúncios da Meta não informado.");
  }

  return normalized.startsWith("act_") ? normalized : `act_${normalized}`;
}

function toNumber(value?: string | null) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toInteger(value?: string | null) {
  return Math.round(toNumber(value));
}

function sumActionValues(
  rows: MetaActionRow[] | undefined,
  acceptedTypes: Set<string>,
) {
  return (rows ?? []).reduce((total, row) => {
    const actionType = row.action_type?.trim().toLowerCase() ?? "";
    if (!acceptedTypes.has(actionType)) {
      return total;
    }

    return total + toNumber(row.value);
  }, 0);
}

function buildMetaInsightsUrl({ adAccountId, startDate, endDate }: FetchMetaInsightsOptions) {
  const params = new URLSearchParams({
    level: "ad",
    fields: [
      "account_name",
      "campaign_name",
      "adset_name",
      "ad_name",
      "date_start",
      "date_stop",
      "reach",
      "impressions",
      "clicks",
      "inline_link_clicks",
      "spend",
      "ctr",
      "inline_link_click_ctr",
      "actions",
      "action_values",
    ].join(","),
    time_increment: "1",
    time_range: JSON.stringify({
      since: startDate,
      until: endDate,
    }),
    use_unified_attribution_setting: "true",
    limit: "500",
    access_token: getMetaAccessToken(),
  });

  return `https://graph.facebook.com/${getMetaApiVersion()}/${normalizeAdAccountId(adAccountId)}/insights?${params.toString()}`;
}

function formatMetaApiError(payload: MetaApiResponse) {
  const message = payload.error?.message?.trim();
  if (!message) {
    return "Falha ao consultar a API da Meta.";
  }

  return message;
}

function mapMetaInsightsRow(row: MetaInsightsRow): MetaRowPayload | null {
  const reportStart = row.date_start?.slice(0, 10) ?? "";
  if (!reportStart) {
    return null;
  }

  const clicksAll = toInteger(row.clicks);
  const linkClicks = toInteger(row.inline_link_clicks);
  const impressions = toInteger(row.impressions);
  const ctrAll = toNumber(row.ctr);
  const ctrLink =
    row.inline_link_click_ctr !== undefined
      ? toNumber(row.inline_link_click_ctr)
      : impressions > 0
        ? (linkClicks / impressions) * 100
        : 0;

  return {
    report_start: reportStart,
    report_end: row.date_stop?.slice(0, 10) ?? reportStart,
    campaign_name: row.campaign_name?.trim() ?? "",
    adset_name: row.adset_name?.trim() ?? "",
    ad_name: row.ad_name?.trim() ?? "",
    account_name: row.account_name?.trim() ?? "",
    platform: row.publisher_platform?.trim() || "meta_ads",
    placement: row.platform_position?.trim() || "all",
    device_platform: row.impression_device?.trim() || "all",
    delivery: "api",
    reach: toInteger(row.reach),
    impressions,
    clicks_all: clicksAll,
    link_clicks: linkClicks,
    spend: toNumber(row.spend),
    purchases: Math.round(sumActionValues(row.actions, PURCHASE_ACTION_TYPES)),
    revenue: sumActionValues(row.action_values, PURCHASE_ACTION_TYPES),
    ctr_all: ctrAll,
    ctr_link: ctrLink,
    add_to_cart: Math.round(sumActionValues(row.actions, ADD_TO_CART_ACTION_TYPES)),
  };
}

export async function fetchMetaDailyInsights({
  adAccountId,
  startDate,
  endDate,
}: FetchMetaInsightsOptions): Promise<MetaRowPayload[]> {
  const rows: MetaRowPayload[] = [];
  let nextUrl: string | null = buildMetaInsightsUrl({
    adAccountId,
    startDate,
    endDate,
  });

  while (nextUrl) {
    const response = await fetch(nextUrl, {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });
    const payload = (await response.json()) as MetaApiResponse;

    if (!response.ok || payload.error) {
      throw new Error(formatMetaApiError(payload));
    }

    (payload.data ?? []).forEach((row) => {
      const mapped = mapMetaInsightsRow(row);
      if (mapped) {
        rows.push(mapped);
      }
    });

    nextUrl = payload.paging?.next ?? null;
  }

  const deduped = new Map<string, MetaRowPayload>();
  rows.forEach((row) => {
    const key = [
      row.report_start,
      row.campaign_name ?? "",
      row.adset_name ?? "",
      row.ad_name ?? "",
    ].join("::");
    deduped.set(key, row);
  });

  return [...deduped.values()];
}

function chunkRows<T>(rows: T[], size = 200) {
  const chunks: T[][] = [];
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }
  return chunks;
}

function buildMetaRowHash(brandId: string, row: MetaRowPayload) {
  return [
    brandId,
    row.report_start ?? "",
    row.campaign_name ?? "",
    row.adset_name ?? "",
    row.ad_name ?? "",
  ].join("|");
}

async function upsertMetaPerformanceRows(
  supabase: SupabaseClient,
  brandId: string,
  rows: MetaRowPayload[],
) {
  if (!rows.length) {
    return {
      inserted: 0,
      updated: 0,
    };
  }

  const rowsWithHash = rows.map((row) => ({
    ...row,
    row_hash: buildMetaRowHash(brandId, row),
  }));

  const existingRows = [];
  for (const chunk of chunkRows(rowsWithHash.map((row) => row.row_hash), 200)) {
    const { data, error } = await supabase
      .from("media_performance")
      .select(
        "row_hash, is_ignored, ignore_reason, ignored_by, ignored_at, sanitization_status, sanitization_note, sanitized_at, sanitized_by",
      )
      .eq("brand_id", brandId)
      .in("row_hash", chunk);

    if (error) {
      throw error;
    }

    existingRows.push(...(data ?? []));
  }

  const existingMap = new Map(
    existingRows.map((row) => [row.row_hash, row]),
  );

  const payload = rowsWithHash.map((row) => {
    const existing = existingMap.get(row.row_hash);
    return {
      brand_id: brandId,
      date: row.report_start,
      report_start: row.report_start,
      report_end: row.report_end,
      campaign_name: row.campaign_name ?? "",
      adset_name: row.adset_name ?? "",
      ad_name: row.ad_name ?? "",
      account_name: row.account_name ?? null,
      platform: row.platform ?? "meta_ads",
      placement: row.placement ?? "all",
      device_platform: row.device_platform ?? "all",
      delivery: row.delivery ?? "api",
      reach: row.reach ?? 0,
      impressions: row.impressions,
      clicks: row.link_clicks ?? row.clicks_all,
      clicks_all: row.clicks_all,
      link_clicks: row.link_clicks,
      spend: row.spend,
      purchases: row.purchases,
      conversion_value: row.revenue ?? 0,
      ctr_all: row.ctr_all ?? 0,
      ctr_link: row.ctr_link ?? 0,
      add_to_cart: row.add_to_cart ?? 0,
      currency: "BRL",
      row_hash: row.row_hash,
      is_ignored: existing?.is_ignored ?? false,
      ignore_reason: existing?.ignore_reason ?? null,
      ignored_by: existing?.ignored_by ?? null,
      ignored_at: existing?.ignored_at ?? null,
      sanitization_status: existing?.sanitization_status ?? "PENDING",
      sanitization_note: existing?.sanitization_note ?? null,
      sanitized_at: existing?.sanitized_at ?? null,
      sanitized_by: existing?.sanitized_by ?? null,
    };
  });

  for (const chunk of chunkRows(payload)) {
    const { error } = await supabase
      .from("media_performance")
      .upsert(chunk, {
        onConflict: "brand_id,row_hash",
      });

    if (error) {
      throw error;
    }
  }

  let inserted = 0;
  let updated = 0;
  rowsWithHash.forEach((row) => {
    if (existingMap.has(row.row_hash)) {
      updated += 1;
    } else {
      inserted += 1;
    }
  });

  return {
    inserted,
    updated,
  };
}

function resolveSyncWindowDays(value?: number | null) {
  if (!value || !Number.isFinite(value)) {
    return 30;
  }

  return Math.max(1, Math.min(365, Math.round(value)));
}

function resolveSyncRange(syncWindowDays?: number | null) {
  const windowDays = resolveSyncWindowDays(syncWindowDays);
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - (windowDays - 1));

  return {
    startDate: startDate.toISOString().slice(0, 10),
    endDate: endDate.toISOString().slice(0, 10),
    windowDays,
  };
}

export async function syncMetaRowsForBrand(
  supabase: SupabaseClient,
  options: {
    brandId: string;
    integrationId: string;
    settings: MetaIntegrationSettings;
  },
): Promise<MetaSyncResult> {
  const { brandId, integrationId, settings } = options;
  const adAccountId = settings.adAccountId?.trim();
  if (!adAccountId) {
    throw new Error("ID da conta de anúncios da Meta não configurado para esta loja.");
  }

  await supabase
    .from("brand_integrations")
    .update({
      last_sync_status: "running",
      last_sync_error: null,
    })
    .eq("id", integrationId);

  const { startDate, endDate, windowDays } = resolveSyncRange(settings.syncWindowDays);
  const rows = await fetchMetaDailyInsights({
    adAccountId,
    startDate,
    endDate,
  });

  const result = await upsertMetaPerformanceRows(supabase, brandId, rows);

  const syncedAt = new Date().toISOString();
  await supabase
    .from("brand_integrations")
    .update({
      last_sync_at: syncedAt,
      last_sync_status: "success",
      last_sync_error: null,
      settings: {
        ...settings,
        adAccountId,
        manualFallback: settings.manualFallback ?? true,
        syncWindowDays: windowDays,
      },
    })
    .eq("id", integrationId);

  return {
    startDate,
    endDate,
    rows: rows.length,
    inserted: result.inserted,
    updated: result.updated,
    syncedAt,
  };
}
