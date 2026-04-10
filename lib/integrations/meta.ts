import type { SupabaseClient } from "@supabase/supabase-js";
import type { MetaRowPayload } from "@/lib/brandops/canonical-ingest";
import { replaceCatalogProductsBySource } from "@/lib/brandops/database";
import type { CatalogProduct } from "@/lib/brandops/types";

const PURCHASE_ACTION_PRIORITY = [
  "offsite_conversion.fb_pixel_purchase",
  "onsite_web_purchase",
  "purchase",
  "omni_purchase",
  "onsite_web_app_purchase",
  "web_in_store_purchase",
  "web_app_in_store_purchase",
] as const;

const ADD_TO_CART_ACTION_PRIORITY = [
  "offsite_conversion.fb_pixel_add_to_cart",
  "onsite_web_add_to_cart",
  "add_to_cart",
  "omni_add_to_cart",
  "onsite_web_app_add_to_cart",
] as const;

type MetaActionRow = {
  action_type?: string;
  value?: string;
};

type MetaInsightsRow = {
  account_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  creative_id?: string;
  creative_name?: string;
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

type MetaAdCreativeNode = {
  id?: string;
  name?: string;
};

type MetaAdNode = {
  id?: string;
  name?: string;
  creative?: MetaAdCreativeNode;
};

type MetaCatalogProductRow = {
  id?: string;
  retailer_id?: string;
  name?: string;
  description?: string;
  url?: string;
  image_url?: string;
  additional_image_urls?: string[] | string;
  availability?: string;
  condition?: string;
  brand?: string;
  price?: string | { amount?: string | number; currency?: string } | null;
  sale_price?: string | { amount?: string | number; currency?: string } | null;
  google_product_category?: string;
  fb_product_category?: string;
  color?: string;
  gender?: string;
  material?: string;
  age_group?: string;
  size?: string;
  custom_label_0?: string;
  custom_label_1?: string;
  custom_label_2?: string;
};

type MetaCatalogApiResponse = {
  data?: MetaCatalogProductRow[];
  paging?: {
    next?: string;
  };
  error?: {
    message?: string;
  };
};

type FetchMetaInsightsOptions = {
  adAccountId: string;
  startDate: string;
  endDate: string;
  accessToken?: string;
};

type MetaCreativeMapRow = {
  creativeId: string | null;
  creativeName: string | null;
};

export type MetaIntegrationSettings = {
  adAccountId?: string | null;
  catalogId?: string | null;
  manualFallback?: boolean;
  syncWindowDays?: number | null;
  catalogSyncAt?: string | null;
  catalogSyncStatus?: string | null;
  catalogSyncError?: string | null;
  catalogProductCount?: number | null;
};

export type MetaSyncResult = {
  startDate: string;
  endDate: string;
  rows: number;
  inserted: number;
  updated: number;
  syncedAt: string;
};

export type MetaCatalogSyncResult = {
  rows: number;
  inserted: number;
  updated: number;
  deleted: number;
  syncedAt: string;
};

export function getMetaAccessTokenFromEnv() {
  const token = process.env.META_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new Error("META_ACCESS_TOKEN não configurada.");
  }

  return token;
}

function requireMetaAccessToken(accessToken?: string) {
  const token = accessToken?.trim();
  if (!token) {
    throw new Error(
      "Nenhum token da Meta foi enviado para a sincronização. Salve o token próprio da marca no painel antes de sincronizar.",
    );
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

function pickActionValue(
  rows: MetaActionRow[] | undefined,
  priority: readonly string[],
) {
  const normalized = new Map(
    (rows ?? []).map((row) => [row.action_type?.trim().toLowerCase() ?? "", row]),
  );

  for (const actionType of priority) {
    const match = normalized.get(actionType);
    if (match) {
      return toNumber(match.value);
    }
  }

  return 0;
}

function buildMetaInsightsUrl({
  adAccountId,
  startDate,
  endDate,
  accessToken,
}: FetchMetaInsightsOptions) {
  const token = requireMetaAccessToken(accessToken);
  const params = new URLSearchParams({
    level: "ad",
    fields: [
      "account_name",
      "campaign_id",
      "campaign_name",
      "adset_id",
      "adset_name",
      "ad_id",
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
    access_token: token,
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

function formatMetaCatalogApiError(payload: MetaCatalogApiResponse) {
  const message = payload.error?.message?.trim();
  if (!message) {
    return "Falha ao consultar o catálogo da Meta.";
  }

  return message;
}

function chunkStrings(items: string[], size = 50) {
  const chunks: string[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function fetchMetaCreativeMap(
  adIds: string[],
  accessToken?: string,
): Promise<Map<string, MetaCreativeMapRow>> {
  const token = requireMetaAccessToken(accessToken);
  const normalizedIds = [...new Set(adIds.map((item) => item.trim()).filter(Boolean))];
  const creativeMap = new Map<string, MetaCreativeMapRow>();

  for (const chunk of chunkStrings(normalizedIds, 50)) {
    const params = new URLSearchParams({
      ids: chunk.join(","),
      fields: "id,name,creative{id,name}",
      access_token: token,
    });

    const response = await fetch(`https://graph.facebook.com/${getMetaApiVersion()}/?${params.toString()}`, {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });
    const payload = (await response.json()) as Record<string, MetaAdNode> & MetaApiResponse;

    if (!response.ok || payload.error) {
      throw new Error(formatMetaApiError(payload));
    }

    chunk.forEach((adId) => {
      const row = payload[adId];
      if (!row || typeof row !== "object") {
        return;
      }

      creativeMap.set(adId, {
        creativeId: row.creative?.id?.trim() ?? null,
        creativeName: row.creative?.name?.trim() ?? null,
      });
    });
  }

  return creativeMap;
}

function buildMetaCatalogUrl(catalogId: string, accessToken?: string) {
  const normalized = catalogId.trim();
  if (!normalized) {
    throw new Error("ID do catálogo da Meta não informado.");
  }

  const token = requireMetaAccessToken(accessToken);
  const params = new URLSearchParams({
    fields: [
      "id",
      "retailer_id",
      "name",
      "description",
      "url",
      "image_url",
      "additional_image_urls",
      "availability",
      "condition",
      "brand",
      "price",
      "sale_price",
      "google_product_category",
      "fb_product_category",
      "color",
      "gender",
      "material",
      "age_group",
      "size",
      "custom_label_0",
      "custom_label_1",
      "custom_label_2",
    ].join(","),
    limit: "500",
    access_token: token,
  });

  return `https://graph.facebook.com/${getMetaApiVersion()}/${normalized}/products?${params.toString()}`;
}

function parseMetaCatalogPrice(
  value?: string | { amount?: string | number; currency?: string } | null,
) {
  if (!value) {
    return 0;
  }

  if (typeof value === "object") {
    const parsed = Number(value.amount ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const normalized = value.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseMetaCatalogList(value?: string[] | string) {
  if (Array.isArray(value)) {
    return value.map((item) => item.trim()).filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function mapMetaCatalogRow(row: MetaCatalogProductRow): CatalogProduct | null {
  const productId = row.retailer_id?.trim() || row.id?.trim() || "";
  if (!productId) {
    return null;
  }

  return {
    id: productId,
    title: row.name?.trim() || productId,
    description: row.description?.trim() || undefined,
    imageUrl: row.image_url?.trim() || undefined,
    additionalImageUrls: parseMetaCatalogList(row.additional_image_urls),
    link: row.url?.trim() || undefined,
    price: parseMetaCatalogPrice(row.price),
    salePrice: row.sale_price ? parseMetaCatalogPrice(row.sale_price) : null,
    availability: row.availability?.trim() || undefined,
    condition: row.condition?.trim() || undefined,
    googleProductCategory: row.google_product_category?.trim() || undefined,
    fbProductCategory: row.fb_product_category?.trim() || undefined,
    brand: row.brand?.trim() || undefined,
    productType: row.custom_label_0?.trim() || undefined,
    collections: parseMetaCatalogList(row.custom_label_1),
    keywords: parseMetaCatalogList(row.custom_label_2),
    color: row.color?.trim() || undefined,
    gender: row.gender?.trim() || undefined,
    material: row.material?.trim() || undefined,
    ageGroup: row.age_group?.trim() || undefined,
    size: row.size?.trim() || undefined,
    dataSource: "meta_catalog",
    externalCatalogId: row.id?.trim() || null,
  };
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
    campaign_id: row.campaign_id?.trim() ?? "",
    campaign_name: row.campaign_name?.trim() ?? "",
    adset_id: row.adset_id?.trim() ?? "",
    adset_name: row.adset_name?.trim() ?? "",
    ad_id: row.ad_id?.trim() ?? "",
    ad_name: row.ad_name?.trim() ?? "",
    creative_id: row.creative_id?.trim() ?? "",
    creative_name: row.creative_name?.trim() ?? "",
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
    purchases: Math.round(pickActionValue(row.actions, PURCHASE_ACTION_PRIORITY)),
    revenue: pickActionValue(row.action_values, PURCHASE_ACTION_PRIORITY),
    ctr_all: ctrAll,
    ctr_link: ctrLink,
    add_to_cart: Math.round(pickActionValue(row.actions, ADD_TO_CART_ACTION_PRIORITY)),
  };
}

export async function fetchMetaDailyInsights({
  adAccountId,
  startDate,
  endDate,
  accessToken,
}: FetchMetaInsightsOptions): Promise<MetaRowPayload[]> {
  const rows: MetaRowPayload[] = [];
  let nextUrl: string | null = buildMetaInsightsUrl({
    adAccountId,
    startDate,
    endDate,
    accessToken,
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

  try {
    const creativeMap = await fetchMetaCreativeMap(
      rows.map((row) => row.ad_id ?? "").filter(Boolean),
      accessToken,
    );

    rows.forEach((row) => {
      if (!row.ad_id) {
        return;
      }

      const creative = creativeMap.get(row.ad_id);
      if (!creative) {
        return;
      }

      row.creative_id = creative.creativeId;
      row.creative_name = creative.creativeName;
    });
  } catch {
    // Não derruba a sync se a camada de criativo falhar nesta rodada.
  }

  const deduped = new Map<string, MetaRowPayload>();
  rows.forEach((row) => {
    const key = [
      row.report_start,
      row.campaign_id ?? "",
      row.campaign_name ?? "",
      row.adset_id ?? "",
      row.adset_name ?? "",
      row.ad_id ?? "",
      row.ad_name ?? "",
      row.creative_id ?? "",
      row.creative_name ?? "",
      row.platform ?? "",
      row.placement ?? "",
      row.device_platform ?? "",
    ].join("::");
    deduped.set(key, row);
  });

  return [...deduped.values()];
}

export async function fetchMetaCatalogProducts(
  catalogId: string,
  accessToken?: string,
): Promise<CatalogProduct[]> {
  const rows: CatalogProduct[] = [];
  let nextUrl: string | null = buildMetaCatalogUrl(catalogId, accessToken);

  while (nextUrl) {
    const response = await fetch(nextUrl, {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });
    const payload = (await response.json()) as MetaCatalogApiResponse;

    if (!response.ok || payload.error) {
      throw new Error(formatMetaCatalogApiError(payload));
    }

    (payload.data ?? []).forEach((row) => {
      const mapped = mapMetaCatalogRow(row);
      if (mapped) {
        rows.push(mapped);
      }
    });

    nextUrl = payload.paging?.next ?? null;
  }

  const deduped = new Map<string, CatalogProduct>();
  rows.forEach((row) => {
    deduped.set(row.id, row);
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

function isMissingMediaCreativeColumns(error: unknown) {
  return (
    error instanceof Error &&
    /column .*?(campaign_id|adset_id|ad_id|creative_id|creative_name).* does not exist/i.test(
      error.message,
    )
  );
}

function stripMediaCreativeDimensions<T extends Record<string, unknown>>(row: T) {
  return {
    brand_id: row.brand_id,
    date: row.date,
    report_start: row.report_start,
    report_end: row.report_end,
    campaign_name: row.campaign_name,
    adset_name: row.adset_name,
    ad_name: row.ad_name,
    account_name: row.account_name,
    platform: row.platform,
    placement: row.placement,
    device_platform: row.device_platform,
    delivery: row.delivery,
    reach: row.reach,
    impressions: row.impressions,
    clicks: row.clicks,
    clicks_all: row.clicks_all,
    link_clicks: row.link_clicks,
    spend: row.spend,
    purchases: row.purchases,
    conversion_value: row.conversion_value,
    ctr_all: row.ctr_all,
    ctr_link: row.ctr_link,
    add_to_cart: row.add_to_cart,
    currency: row.currency,
    row_hash: row.row_hash,
    is_ignored: row.is_ignored,
    ignore_reason: row.ignore_reason,
    ignored_by: row.ignored_by,
    ignored_at: row.ignored_at,
    sanitization_status: row.sanitization_status,
    sanitization_note: row.sanitization_note,
    sanitized_at: row.sanitized_at,
    sanitized_by: row.sanitized_by,
  };
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
      campaign_id: row.campaign_id ?? null,
      campaign_name: row.campaign_name ?? "",
      adset_id: row.adset_id ?? null,
      adset_name: row.adset_name ?? "",
      ad_id: row.ad_id ?? null,
      ad_name: row.ad_name ?? "",
      creative_id: row.creative_id ?? null,
      creative_name: row.creative_name ?? null,
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

  let supportsCreativeDimensions = true;
  for (const chunk of chunkRows(payload)) {
    let currentChunk: Array<Record<string, unknown>> = chunk;

    while (true) {
      const { error } = await supabase
        .from("media_performance")
        .upsert(currentChunk, {
          onConflict: "brand_id,row_hash",
        });

      if (!error) {
        break;
      }

      if (!supportsCreativeDimensions || !isMissingMediaCreativeColumns(error)) {
        throw error;
      }

      supportsCreativeDimensions = false;
      currentChunk = chunk.map(stripMediaCreativeDimensions);
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
    accessToken?: string;
  },
): Promise<MetaSyncResult> {
  const { brandId, integrationId, settings, accessToken } = options;
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
    accessToken,
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

export async function syncMetaCatalogForBrand(
  supabase: SupabaseClient,
  options: {
    brandId: string;
    integrationId: string;
    settings: MetaIntegrationSettings;
    accessToken?: string;
  },
): Promise<MetaCatalogSyncResult> {
  const { brandId, integrationId, settings, accessToken } = options;
  const catalogId = settings.catalogId?.trim();
  if (!catalogId) {
    throw new Error("ID do catálogo da Meta não configurado para esta loja.");
  }

  await supabase
    .from("brand_integrations")
    .update({
      settings: {
        ...settings,
        catalogId,
        catalogSyncStatus: "running",
        catalogSyncError: null,
      },
    })
    .eq("id", integrationId);

  const products = await fetchMetaCatalogProducts(catalogId, accessToken);
  const result = await replaceCatalogProductsBySource(
    supabase,
    brandId,
    products,
    "meta_catalog",
  );

  const syncedAt = new Date().toISOString();
  await supabase
    .from("brand_integrations")
    .update({
      settings: {
        ...settings,
        catalogId,
        catalogSyncAt: syncedAt,
        catalogSyncStatus: "success",
        catalogSyncError: null,
        catalogProductCount: result.total,
      },
    })
    .eq("id", integrationId);

  return {
    rows: products.length,
    inserted: result.inserted,
    updated: result.updated,
    deleted: result.deleted,
    syncedAt,
  };
}


