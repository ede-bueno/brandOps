import { parseUploadedCsv } from "@/lib/brandops/csv";
import { ingestMetaRaw } from "@/lib/brandops/canonical-ingest";
import { supabase } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AcquisitionHubReport,
  AnnualDreReport,
  BrandExpense,
  BrandDataset,
  BrandIntegrationConfig,
  CatalogProduct,
  CatalogReport,
  CmvCheckpoint,
  CmvMatchType,
  CsvFileKind,
  ExecutiveActionStatus,
  FinanceHubReport,
  Ga4ItemDailyPerformanceRow,
  Ga4DailyPerformanceRow,
  ImportRunInfo,
  ExpenseCategory,
  ImportedFileInfo,
  ManagementSnapshotV2,
  MediaRow,
  MediaDataSource,
  MediaReport,
  OrderItem,
  OfferHubReport,
  PaidOrder,
  ProductDecisionAction,
  ProductInsightClassification,
  ProductInsightSort,
  ProductInsightsReport,
  SanitizationReport,
  SalesDetailReport,
  SalesLine,
  SanitizationReview,
  SanitizationDecision,
  TrafficReport,
} from "./types";
import {
  isMissingBrandGovernanceSchemaError,
  resolveBrandGovernance,
} from "./governance";

const PAGE_SIZE = 1000;

function chunkArray<T>(items: T[], size = 200) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function dedupeByKey<T>(items: T[], getKey: (item: T) => string) {
  const unique = new Map<string, T>();
  items.forEach((item) => {
    unique.set(getKey(item), item);
  });
  return [...unique.values()];
}

async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => Promise<{ data: T[] | null; error: Error | null }>,
) {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await fetchPage(from, to);
    if (error) {
      throw error;
    }

    const page = data ?? [];
    rows.push(...page);

    if (page.length < PAGE_SIZE) {
      break;
    }
  }
  return rows;
}

export async function fetchDashboardKpis(
  brandId: string,
  from?: string | null,
  to?: string | null
): Promise<Record<string, number | null>> {
  const { data, error } = await supabase.rpc("get_dashboard_kpis", {
    p_brand_id: brandId,
    p_from: from || null,
    p_to: to || null,
  });
  if (error) throw error;
  return data as Record<string, number | null>;
}

async function getValidAccessToken() {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  let accessToken = session?.access_token ?? null;
  if (!accessToken) {
    throw new Error("Sessão ausente.");
  }

  const validateToken = async (token: string) => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    return !error && Boolean(user);
  };

  if (await validateToken(accessToken)) {
    return accessToken;
  }

  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
  accessToken = refreshed.session?.access_token ?? null;

  if (refreshError || !accessToken || !(await validateToken(accessToken))) {
    await supabase.auth.signOut().catch(() => undefined);
    throw new Error("Sessão inválida. Faça login novamente.");
  }

  return accessToken;
}

async function fetchBrandReportFromApi<T>(
  brandId: string,
  reportPath: string,
  options?: {
    from?: string | null;
    to?: string | null;
    extraParams?: Record<string, string | null | undefined>;
    errorMessage?: string;
  },
): Promise<T> {
  const accessToken = await getValidAccessToken();

  const searchParams = new URLSearchParams();
  if (options?.from) {
    searchParams.set("from", options.from);
  }
  if (options?.to) {
    searchParams.set("to", options.to);
  }
  Object.entries(options?.extraParams ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();
  const response = await fetch(
    `/api/admin/brands/${encodeURIComponent(brandId)}/reports/${reportPath}${query ? `?${query}` : ""}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    },
  );

  const payload = await readJsonResponse<T>(response);
  if (!response.ok) {
    throw new Error(payload?.error || options?.errorMessage || "Não foi possível carregar o relatório.");
  }

  if (!payload) {
    throw new Error(options?.errorMessage || "O relatório retornou vazio.");
  }

  return payload;
}

export async function fetchDreMonthly(
  brandId: string,
  yearmonth?: string | null
): Promise<Array<Record<string, unknown>>> {
  const { data, error } = await supabase.rpc("get_dre_monthly", {
    p_brand_id: brandId,
    p_yearmonth: yearmonth || null,
  });
  if (error) throw error;
  return data || [];
}

export async function fetchFinancialReport(
  brandId: string,
  from?: string | null,
  to?: string | null,
): Promise<AnnualDreReport> {
  return fetchBrandReportFromApi<AnnualDreReport>(brandId, "financial", {
    from,
    to,
    errorMessage: "Não foi possível carregar o relatório financeiro.",
  });
}

export async function fetchSalesDetailReport(
  brandId: string,
  from?: string | null,
  to?: string | null,
): Promise<SalesDetailReport> {
  return fetchBrandReportFromApi<SalesDetailReport>(brandId, "sales", {
    from,
    to,
    errorMessage: "Não foi possível carregar o relatório detalhado de vendas.",
  });
}

export async function fetchMediaReport(
  brandId: string,
  from?: string | null,
  to?: string | null,
): Promise<MediaReport> {
  return fetchBrandReportFromApi<MediaReport>(brandId, "media", {
    from,
    to,
    errorMessage: "Não foi possível carregar o relatório de Performance Mídia.",
  });
}

export async function fetchTrafficReport(
  brandId: string,
  from?: string | null,
  to?: string | null,
): Promise<TrafficReport> {
  return fetchBrandReportFromApi<TrafficReport>(brandId, "traffic", {
    from,
    to,
    errorMessage: "Não foi possível carregar o relatório de Tráfego Digital.",
  });
}

export async function fetchProductInsightsReport(
  brandId: string,
  options?: {
    from?: string | null;
    to?: string | null;
    decision?: ProductDecisionAction | "all";
    classification?: ProductInsightClassification | "all";
    productType?: string | "all";
    sort?: ProductInsightSort;
  },
): Promise<ProductInsightsReport> {
  return fetchBrandReportFromApi<ProductInsightsReport>(brandId, "product-insights", {
    from: options?.from,
    to: options?.to,
    extraParams: {
      decision: options?.decision ?? null,
      classification: options?.classification ?? null,
      productType: options?.productType ?? null,
      sort: options?.sort ?? null,
    },
    errorMessage: "Não foi possível carregar os insights de produtos.",
  });
}

export async function fetchCatalogReport(
  brandId: string,
  options?: {
    from?: string | null;
    to?: string | null;
    search?: string;
    status?: "all" | "sold" | "unsold";
    productType?: string | "all";
    collection?: string | "all";
  },
): Promise<CatalogReport> {
  return fetchBrandReportFromApi<CatalogReport>(brandId, "catalog", {
    from: options?.from,
    to: options?.to,
    extraParams: {
      search: options?.search ?? null,
      status: options?.status ?? null,
      productType: options?.productType ?? null,
      collection: options?.collection ?? null,
    },
    errorMessage: "Não foi possível carregar o catálogo da marca.",
  });
}

export async function fetchSanitizationReport(
  brandId: string,
): Promise<SanitizationReport> {
  return fetchBrandReportFromApi<SanitizationReport>(brandId, "sanitization", {
    errorMessage: "Não foi possível carregar o relatório de saneamento.",
  });
}

export async function fetchCommandCenterReport(
  brandId: string,
  from?: string | null,
  to?: string | null,
): Promise<ManagementSnapshotV2> {
  return fetchBrandReportFromApi<ManagementSnapshotV2>(brandId, "command-center", {
    from,
    to,
    errorMessage: "Não foi possível carregar o Centro de Comando.",
  });
}

export async function fetchFinanceHubReport(
  brandId: string,
  from?: string | null,
  to?: string | null,
): Promise<FinanceHubReport> {
  return fetchBrandReportFromApi<FinanceHubReport>(brandId, "finance-hub", {
    from,
    to,
    errorMessage: "Não foi possível carregar o hub Financeiro.",
  });
}

export async function fetchAcquisitionHubReport(
  brandId: string,
  from?: string | null,
  to?: string | null,
): Promise<AcquisitionHubReport> {
  return fetchBrandReportFromApi<AcquisitionHubReport>(brandId, "acquisition-hub", {
    from,
    to,
    errorMessage: "Não foi possível carregar o hub de Aquisição.",
  });
}

export async function fetchOfferHubReport(
  brandId: string,
  from?: string | null,
  to?: string | null,
): Promise<OfferHubReport> {
  return fetchBrandReportFromApi<OfferHubReport>(brandId, "offer-hub", {
    from,
    to,
    errorMessage: "Não foi possível carregar o hub de Oferta.",
  });
}

export async function updateExecutiveActionQueueItem(
  brandId: string,
  input: {
    actionKey: string;
    status: ExecutiveActionStatus;
    reviewAt?: string | null;
    domain: "cash" | "acquisition" | "offer" | "operations";
    from?: string | null;
    to?: string | null;
  },
) {
  const accessToken = await getValidAccessToken();
  const response = await fetch(
    `/api/admin/brands/${encodeURIComponent(brandId)}/reports/command-center`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
      body: JSON.stringify(input),
    },
  );

  const payload = await readJsonResponse<{ error?: string }>(response);
  if (!response.ok) {
    throw new Error(
      payload?.error || "Não foi possível atualizar a fila executiva desta marca.",
    );
  }
}

async function readJsonResponse<T>(response: Response): Promise<(T & { error?: string }) | null> {
  const raw = await response.text();
  if (!raw.trim()) {
    return null;
  }

  try {
    return JSON.parse(raw) as T & { error?: string };
  } catch {
    throw new Error("A resposta do servidor veio em formato inválido.");
  }
}

function toImportErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Falha inesperada ao importar o arquivo.";
}

function toIsoTimestamp(value: string) {
  return value ? `${value}T00:00:00` : null;
}

function toIsoDate(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function normalizeMatchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function deriveOrderItemsSku(item: OrderItem) {
  return `${item.productName}__${item.productSpecs ?? "sem-especificacao"}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 255);
}

function mapLatestImportFiles(
  rows: Array<{
    file_type: string;
    file_name: string;
    created_at: string;
    records_processed: number | null;
    records_inserted: number | null;
  }>,
): Partial<Record<CsvFileKind, ImportedFileInfo>> {
  return rows.reduce((acc, row) => {
    const kind = row.file_type as CsvFileKind;
    const current: ImportedFileInfo = acc[kind] ?? {
      kind,
      totalRuns: 0,
      totalRows: 0,
      totalInserted: 0,
      lastImportedAt: row.created_at,
      runs: [],
    };

    current.totalRuns += 1;
    current.totalRows += row.records_processed ?? 0;
    current.totalInserted += row.records_inserted ?? 0;
    current.lastImportedAt =
      current.lastImportedAt > row.created_at ? current.lastImportedAt : row.created_at;
    current.runs.push({
      fileName: row.file_name,
      importedAt: row.created_at,
      rowCount: row.records_processed ?? 0,
      insertedCount: row.records_inserted ?? 0,
    });
    current.runs.sort((left, right) => right.importedAt.localeCompare(left.importedAt));
    acc[kind] = current;
    return acc;
  }, {} as Partial<Record<CsvFileKind, ImportedFileInfo>>);
}

function resolveSanitizationStatus(value: string | null | undefined, isIgnored?: boolean) {
  if (value === "PENDING" || value === "KEPT" || value === "IGNORED") {
    return value satisfies SanitizationDecision;
  }
  return isIgnored ? "IGNORED" : "PENDING";
}

function resolveMediaSource(
  row: {
    delivery?: string | null;
  },
): MediaDataSource {
  const delivery = row.delivery?.toLowerCase().trim();
  if (delivery === "api") {
    return "api";
  }

  return "manual_csv";
}

function resolveCommercialOrderValue(row: {
  gross_revenue?: number | null;
  net_revenue?: number | null;
}) {
  const grossRevenue = Number(row.gross_revenue ?? 0);
  const netRevenue = Number(row.net_revenue ?? 0);

  if (grossRevenue > 0 && netRevenue > 0) {
    return Math.max(grossRevenue, netRevenue);
  }

  if (grossRevenue > 0) {
    return grossRevenue;
  }

  return netRevenue;
}

function buildMediaMergeKey(row: Pick<MediaRow, "date" | "campaignName" | "adsetName" | "adName">) {
  return [
    row.date ?? "",
    row.campaignName ?? "",
    row.adsetName ?? "",
    row.adName ?? "",
  ].join("::");
}

type CatalogSnapshot = Omit<CatalogProduct, "sourcePresence">;

type StoredCatalogAttributes = {
  catalogSource?: "manual_feed" | "meta_catalog";
  externalCatalogId?: string | null;
  description?: string;
  additionalImageUrls?: string[];
  availability?: string;
  condition?: string;
  mpn?: string;
  googleProductCategory?: string;
  fbProductCategory?: string;
  brand?: string;
  productType?: string;
  collections?: string[];
  keywords?: string[];
  color?: string;
  gender?: string;
  material?: string;
  ageGroup?: string;
  size?: string;
  sourcePresence?: {
    manualFeed?: boolean;
    metaCatalog?: boolean;
  };
  sourceSnapshots?: {
    manualFeed?: CatalogSnapshot;
    metaCatalog?: CatalogSnapshot;
  };
};

function normalizeCatalogSnapshot(
  product: CatalogProduct,
  source: "manual_feed" | "meta_catalog",
): CatalogSnapshot {
  return {
    id: String(product.id ?? "").trim(),
    title: product.title?.trim() ?? "",
    description: product.description?.trim() || undefined,
    imageUrl: product.imageUrl?.trim() || undefined,
    additionalImageUrls: (product.additionalImageUrls ?? [])
      .map((value) => value.trim())
      .filter(Boolean),
    link: product.link?.trim() || undefined,
    price: Number(product.price ?? 0),
    salePrice:
      product.salePrice === null || product.salePrice === undefined
        ? null
        : Number(product.salePrice ?? 0),
    availability: product.availability?.trim() || undefined,
    condition: product.condition?.trim() || undefined,
    mpn: product.mpn?.trim() || undefined,
    googleProductCategory: product.googleProductCategory?.trim() || undefined,
    fbProductCategory: product.fbProductCategory?.trim() || undefined,
    brand: product.brand?.trim() || undefined,
    productType: product.productType?.trim() || undefined,
    collections: (product.collections ?? []).map((value) => value.trim()).filter(Boolean),
    keywords: (product.keywords ?? []).map((value) => value.trim()).filter(Boolean),
    color: product.color?.trim() || undefined,
    gender: product.gender?.trim() || undefined,
    material: product.material?.trim() || undefined,
    ageGroup: product.ageGroup?.trim() || undefined,
    size: product.size?.trim() || undefined,
    dataSource: source,
    externalCatalogId: product.externalCatalogId?.trim() || null,
  };
}

function serializeCatalogAttributes(
  effectiveSnapshot: CatalogSnapshot,
  sourcePresence: { manualFeed: boolean; metaCatalog: boolean },
  sourceSnapshots: {
    manualFeed?: CatalogSnapshot;
    metaCatalog?: CatalogSnapshot;
  },
) {
  return {
    catalogSource: effectiveSnapshot.dataSource ?? "manual_feed",
    externalCatalogId: effectiveSnapshot.externalCatalogId ?? null,
    description: effectiveSnapshot.description,
    additionalImageUrls: effectiveSnapshot.additionalImageUrls ?? [],
    availability: effectiveSnapshot.availability,
    condition: effectiveSnapshot.condition,
    mpn: effectiveSnapshot.mpn,
    googleProductCategory: effectiveSnapshot.googleProductCategory,
    fbProductCategory: effectiveSnapshot.fbProductCategory,
    brand: effectiveSnapshot.brand,
    productType: effectiveSnapshot.productType,
    collections: effectiveSnapshot.collections ?? [],
    keywords: effectiveSnapshot.keywords ?? [],
    color: effectiveSnapshot.color,
    gender: effectiveSnapshot.gender,
    material: effectiveSnapshot.material,
    ageGroup: effectiveSnapshot.ageGroup,
    size: effectiveSnapshot.size,
    sourcePresence: {
      manualFeed: sourcePresence.manualFeed,
      metaCatalog: sourcePresence.metaCatalog,
    },
    sourceSnapshots,
  } satisfies StoredCatalogAttributes;
}

function parseStoredCatalogAttributes(attributes: unknown): StoredCatalogAttributes {
  if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) {
    return {};
  }

  return attributes as StoredCatalogAttributes;
}

function pickEffectiveCatalogSnapshot(sourceSnapshots: {
  manualFeed?: CatalogSnapshot;
  metaCatalog?: CatalogSnapshot;
}) {
  return sourceSnapshots.metaCatalog ?? sourceSnapshots.manualFeed ?? null;
}

async function fetchCatalogRowsByBrand(
  db: SupabaseClient,
  brandId: string,
) {
  return fetchAllRows(async (from, to) =>
    db
      .from("products")
      .select("brand_id, sku, title, price, sale_price, image_url, product_url, attributes")
      .eq("brand_id", brandId)
      .range(from, to),
  );
}

async function fetchBrandHeader(brandId: string) {
  const result = await supabase
    .from("brands")
    .select("id, name, created_at, updated_at, plan_tier, feature_flags")
    .eq("id", brandId)
    .single();

  if (result.error && isMissingBrandGovernanceSchemaError(result.error)) {
    const fallback = await supabase
      .from("brands")
      .select("id, name, created_at, updated_at")
      .eq("id", brandId)
      .single();

    if (fallback.error) {
      return {
        data: null,
        error: fallback.error,
      };
    }

    return {
      data: {
        ...fallback.data,
        plan_tier: null,
        feature_flags: null,
      },
      error: null,
    };
  }

  return result;
}

export async function fetchBrandDataset(
  brandId: string,
  options?: {
    scope?: "core" | "full";
  },
) {
  const scope = options?.scope ?? "full";
  const shouldLoadFull = scope === "full";
  const shouldLoadOperational = shouldLoadFull;
  const [
    brandResult,
    productsResult,
    ordersResult,
    orderItemsResult,
    salesLinesResult,
    mediaResult,
    cmvResult,
    checkpointResult,
    expenseCategoriesResult,
    expensesResult,
    integrationsResult,
    ga4DailyPerformanceResult,
    ga4ItemDailyPerformanceResult,
    importLogsResult,
    anomalyReviewsResult,
    ] = await Promise.all([
    fetchBrandHeader(brandId),
    shouldLoadFull
      ? fetchAllRows(async (from, to) =>
          supabase
            .from("products")
            .select("sku, title, image_url, product_url, price, sale_price, attributes")
            .eq("brand_id", brandId)
            .range(from, to),
        )
      : Promise.resolve([]),
    shouldLoadOperational
      ? fetchAllRows(async (from, to) =>
          supabase
            .from("orders")
            .select(
              "id, order_number, order_date, payment_method, payment_status, customer_name, items_in_order, gross_revenue, net_revenue, discount, commission_value, source, tracking_url, shipping_state, coupon_name, is_ignored, ignore_reason, ignored_by, ignored_at, sanitization_status, sanitization_note, sanitized_at, sanitized_by",
            )
            .eq("brand_id", brandId)
            .range(from, to),
        )
      : Promise.resolve([]),
    shouldLoadOperational
      ? fetchAllRows(async (from, to) =>
          supabase
            .from("order_items")
            .select(
              "id, order_number, order_date, customer_name, sku, product_name, product_specs, product_type, quantity, gross_value, unit_price, cmv_unit_applied, cmv_total_applied, cmv_rule_type, cmv_rule_label, is_ignored, ignore_reason",
            )
            .eq("brand_id", brandId)
            .range(from, to),
        )
      : Promise.resolve([]),
    shouldLoadFull
      ? fetchAllRows(async (from, to) =>
          supabase
            .from("sales_lines")
            .select(
              "id, order_number, order_date, product_id, product_name, quantity, unit_price, order_discount_value, shipping_value, order_status, sku, is_ignored, ignore_reason",
            )
            .eq("brand_id", brandId)
            .range(from, to),
        )
      : Promise.resolve([]),
    shouldLoadOperational
      ? fetchAllRows(async (from, to) =>
          supabase
            .from("media_performance")
            .select(
              "id, date, report_start, report_end, row_hash, campaign_name, adset_name, account_name, ad_name, platform, placement, device_platform, delivery, reach, impressions, clicks_all, spend, purchases, conversion_value, link_clicks, ctr_all, ctr_link, add_to_cart, is_ignored, ignore_reason, ignored_by, ignored_at, sanitization_status, sanitization_note, sanitized_at, sanitized_by",
            )
            .eq("brand_id", brandId)
            .range(from, to),
        )
      : Promise.resolve([]),
    shouldLoadFull
      ? fetchAllRows(async (from, to) =>
          supabase
            .from("cmv_history")
            .select("id, match_type, match_value, match_label, cmv_unit, source, valid_from, valid_to, updated_at")
            .eq("brand_id", brandId)
            .order("valid_from", { ascending: false })
            .range(from, to),
        )
      : Promise.resolve([]),
    shouldLoadFull
      ? fetchAllRows(async (from, to) =>
          supabase
            .from("cmv_checkpoints")
            .select("id, created_at, note, items_updated, unmatched_items")
            .eq("brand_id", brandId)
            .order("created_at", { ascending: false })
            .range(from, to),
        )
      : Promise.resolve([]),
    supabase
      .from("expense_categories")
      .select("id, name, color, is_system, brand_id")
      .or(`brand_id.is.null,brand_id.eq.${brandId}`)
      .order("name"),
    supabase
      .from("brand_expenses")
      .select("id, category_id, description, amount, incurred_on, expense_categories(name)")
      .eq("brand_id", brandId)
      .order("incurred_on", { ascending: false }),
    supabase
      .from("brand_integrations")
      .select("id, provider, mode, settings, last_sync_at, last_sync_status, last_sync_error")
      .eq("brand_id", brandId)
      .order("provider"),
    shouldLoadFull
      ? fetchAllRows(async (from, to) =>
          supabase
            .from("ga4_daily_performance")
            .select(
              "id, date, source_medium, campaign_name, landing_page, sessions, total_users, page_views, add_to_carts, begin_checkouts, purchases, purchase_revenue, last_synced_at",
            )
            .eq("brand_id", brandId)
            .order("date", { ascending: true })
            .range(from, to),
        )
      : Promise.resolve([]),
    shouldLoadFull
      ? fetchAllRows(async (from, to) =>
          supabase
            .from("ga4_item_daily_performance")
            .select(
              "id, date, item_id, item_name, item_brand, item_category, item_views, add_to_carts, checkouts, ecommerce_purchases, item_purchase_quantity, item_revenue, cart_to_view_rate, purchase_to_view_rate, last_synced_at",
            )
            .eq("brand_id", brandId)
            .order("date", { ascending: true })
            .range(from, to),
        )
      : Promise.resolve([]),
    shouldLoadFull
      ? fetchAllRows(async (from, to) =>
          supabase
            .from("import_logs")
            .select("file_type, file_name, created_at, records_processed, records_inserted")
            .eq("brand_id", brandId)
            .eq("status", "SUCCESS")
            .order("created_at", { ascending: false })
            .range(from, to),
        )
      : Promise.resolve([]),
    shouldLoadOperational
      ? fetchAllRows(async (from, to) =>
          supabase
            .from("anomaly_reviews")
            .select("*")
            .eq("brand_id", brandId)
            .order("reviewed_at", { ascending: false })
            .range(from, to),
        )
      : Promise.resolve([]),
  ]);

  if (!brandResult.data) {
    throw new Error("Marca não encontrada.");
  }

  if (expenseCategoriesResult.error) {
    throw expenseCategoriesResult.error;
  }

  if (expensesResult.error) {
    throw expensesResult.error;
  }

  if (integrationsResult.error) {
    throw integrationsResult.error;
  }

  const ga4DailyPerformance: Ga4DailyPerformanceRow[] =
    ga4DailyPerformanceResult.map((row) => ({
      id: row.id,
      date: row.date,
      sourceMedium: row.source_medium ?? "",
      campaignName: row.campaign_name ?? "",
      landingPage: row.landing_page ?? "",
      sessions: row.sessions ?? 0,
      totalUsers: row.total_users ?? 0,
      pageViews: row.page_views ?? 0,
      addToCarts: row.add_to_carts ?? 0,
      beginCheckouts: row.begin_checkouts ?? 0,
      purchases: row.purchases ?? 0,
      purchaseRevenue: Number(row.purchase_revenue ?? 0),
      lastSyncedAt: row.last_synced_at ?? null,
    }));

  const ga4ItemDailyPerformance: Ga4ItemDailyPerformanceRow[] =
    ga4ItemDailyPerformanceResult.map((row) => ({
      id: row.id,
      date: row.date,
      itemId: row.item_id ?? "",
      itemName: row.item_name ?? "",
      itemBrand: row.item_brand ?? "",
      itemCategory: row.item_category ?? "",
      itemViews: row.item_views ?? 0,
      addToCarts: row.add_to_carts ?? 0,
      checkouts: row.checkouts ?? 0,
      ecommercePurchases: row.ecommerce_purchases ?? 0,
      itemPurchaseQuantity: row.item_purchase_quantity ?? 0,
      itemRevenue: Number(row.item_revenue ?? 0),
      cartToViewRate: Number(row.cart_to_view_rate ?? 0),
      purchaseToViewRate: Number(row.purchase_to_view_rate ?? 0),
      lastSyncedAt: row.last_synced_at ?? null,
    }));

  const catalog: CatalogProduct[] =
    productsResult.map((row) => ({
      id: row.sku,
      title: row.title,
      imageUrl: row.image_url,
      additionalImageUrls: Array.isArray(row.attributes?.additionalImageUrls)
        ? row.attributes.additionalImageUrls
        : [],
      link: row.product_url,
      price: Number(row.price ?? 0),
      salePrice: row.sale_price === null ? null : Number(row.sale_price),
      description: row.attributes?.description,
      availability: row.attributes?.availability,
      condition: row.attributes?.condition,
      mpn: row.attributes?.mpn,
      googleProductCategory: row.attributes?.googleProductCategory,
      fbProductCategory: row.attributes?.fbProductCategory,
      brand: row.attributes?.brand,
      productType: row.attributes?.productType,
      collections: Array.isArray(row.attributes?.collections) ? row.attributes.collections : [],
      keywords: Array.isArray(row.attributes?.keywords) ? row.attributes.keywords : [],
      color: row.attributes?.color,
      gender: row.attributes?.gender,
      material: row.attributes?.material,
      ageGroup: row.attributes?.ageGroup,
      size: row.attributes?.size,
      dataSource: row.attributes?.catalogSource === "meta_catalog" ? "meta_catalog" : "manual_feed",
      externalCatalogId:
        typeof row.attributes?.externalCatalogId === "string"
          ? row.attributes.externalCatalogId
          : null,
      sourcePresence: {
        manualFeed: Boolean(
          row.attributes?.sourcePresence?.manualFeed ?? row.attributes?.catalogSource !== "meta_catalog",
        ),
        metaCatalog: Boolean(
          row.attributes?.sourcePresence?.metaCatalog ?? row.attributes?.catalogSource === "meta_catalog",
        ),
      },
    }));

  const paidOrders: PaidOrder[] =
    ordersResult.map((row) => ({
      id: row.id,
      orderNumber: row.order_number,
      orderDate: toIsoDate(row.order_date),
      paymentMethod: row.payment_method ?? "",
      paymentStatus: row.payment_status ?? "",
      customerName: row.customer_name ?? "",
      itemsInOrder: row.items_in_order ?? 0,
      // Parte do histórico traz `gross_revenue` zerado. Quando os dois existem,
      // usamos o maior valor para representar o faturado comercial exportado pela INK.
      orderValue: resolveCommercialOrderValue(row),
      discountValue: Number(row.discount ?? 0),
      commissionValue: Number(row.commission_value ?? 0),
      couponName: row.coupon_name ?? null,
      source: row.source ?? "",
      trackingUrl: row.tracking_url ?? undefined,
      shippingState: row.shipping_state ?? undefined,
      isIgnored: Boolean(row.is_ignored),
      ignoreReason: row.ignore_reason ?? null,
      sanitizationStatus: resolveSanitizationStatus(row.sanitization_status, row.is_ignored),
      sanitizationNote: row.sanitization_note ?? null,
      sanitizedAt: row.sanitized_at ?? row.ignored_at ?? null,
      sanitizedBy: row.sanitized_by ?? row.ignored_by ?? null,
    }));

  const orderItems: OrderItem[] =
    orderItemsResult.map((row) => ({
      id: row.id,
      orderNumber: row.order_number,
      orderDate: toIsoDate(row.order_date),
      customerName: row.customer_name ?? undefined,
      sku: row.sku ?? undefined,
      productName: row.product_name ?? row.order_number,
      productSpecs: row.product_specs ?? undefined,
      productType: row.product_type ?? null,
      quantity: row.quantity ?? 0,
      grossValue: Number(row.gross_value ?? 0),
      cmvUnitApplied: Number(row.cmv_unit_applied ?? 0),
      cmvTotalApplied: Number(row.cmv_total_applied ?? 0),
      cmvRuleType: row.cmv_rule_type ?? null,
      cmvRuleLabel: row.cmv_rule_label ?? null,
      isIgnored: Boolean(row.is_ignored),
      ignoreReason: row.ignore_reason ?? null,
    }));

  const salesLines: SalesLine[] =
    salesLinesResult.map((row) => ({
      id: row.id,
      orderNumber: row.order_number,
      orderDate: toIsoDate(row.order_date),
      productId: row.product_id,
      productName: row.product_name,
      quantity: row.quantity ?? 0,
      unitPrice: Number(row.unit_price ?? 0),
      orderDiscountValue: Number(row.order_discount_value ?? 0),
      shippingValue: Number(row.shipping_value ?? 0),
      orderStatus: row.order_status ?? "",
      sku: row.sku ?? undefined,
      isIgnored: Boolean(row.is_ignored),
      ignoreReason: row.ignore_reason ?? null,
    }));

  const media: MediaRow[] =
    mediaResult.map((row) => ({
      id: row.id,
      rowHash: row.row_hash ?? null,
      date: row.date ?? row.report_start ?? "",
      campaignName: row.campaign_name ?? "",
      adsetName: row.adset_name ?? "",
      accountName: row.account_name ?? "",
      adName: row.ad_name ?? "",
      platform: row.platform ?? "",
      placement: row.placement ?? "",
      devicePlatform: row.device_platform ?? "",
      delivery: row.delivery ?? "",
      reach: row.reach ?? 0,
      impressions: row.impressions ?? 0,
      clicksAll: row.clicks_all ?? 0,
      spend: Number(row.spend ?? 0),
      purchases: row.purchases ?? 0,
      purchaseValue: Number(row.conversion_value ?? 0),
      linkClicks: row.link_clicks ?? 0,
      ctrAll: Number(row.ctr_all ?? 0),
      ctrLink: Number(row.ctr_link ?? 0),
      addToCart: row.add_to_cart ?? 0,
      isIgnored: Boolean(row.is_ignored),
      ignoreReason: row.ignore_reason ?? null,
      sanitizationStatus: resolveSanitizationStatus(row.sanitization_status, row.is_ignored),
      sanitizationNote: row.sanitization_note ?? null,
      sanitizedAt: row.sanitized_at ?? row.ignored_at ?? null,
      sanitizedBy: row.sanitized_by ?? row.ignored_by ?? null,
      dataSource: resolveMediaSource(row),
    }));

  const cmvEntries =
    cmvResult.map((row) => ({
      id: row.id,
      matchType: row.match_type as CmvMatchType,
      matchValue: row.match_value,
      matchLabel: row.match_label,
      unitCost: Number(row.cmv_unit ?? 0),
      source: row.source ?? "manual",
      validFrom: row.valid_from,
      validTo: row.valid_to ?? null,
      updatedAt: row.updated_at,
    }));

  const cmvCheckpoints: CmvCheckpoint[] =
    checkpointResult.map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      note: row.note ?? null,
      itemsUpdated: row.items_updated ?? 0,
      unmatchedItems: row.unmatched_items ?? 0,
    }));

  const expenseCategories: ExpenseCategory[] =
    (expenseCategoriesResult.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      color: row.color ?? "#7C8DB5",
      isSystem: Boolean(row.is_system),
      isActive: true,
    }));

  const expenses: BrandExpense[] =
    (expensesResult.data ?? []).map((row) => ({
      id: row.id,
      categoryId: row.category_id,
      categoryName:
        Array.isArray(row.expense_categories)
          ? row.expense_categories[0]?.name ?? "Sem categoria"
          : (row.expense_categories as { name?: string } | null)?.name ?? "Sem categoria",
      incurredOn: row.incurred_on,
      amount: Number(row.amount ?? 0),
      description: row.description ?? "",
    }));

  const integrations: BrandIntegrationConfig[] =
    (integrationsResult.data ?? []).map((row) => ({
      id: row.id,
      provider: row.provider,
      mode: row.mode,
      settings:
        row.settings && typeof row.settings === "object" && !Array.isArray(row.settings)
          ? row.settings
          : {},
      lastSyncAt: row.last_sync_at ?? null,
      lastSyncStatus: row.last_sync_status ?? "idle",
      lastSyncError: row.last_sync_error ?? null,
    })) as BrandIntegrationConfig[];

  const sanitizationReviews: SanitizationReview[] =
    anomalyReviewsResult.map((row) => ({
      id: row.id,
      sourceTable: row.source_table,
      sourceRowId: row.source_row_id,
      sourceKey: "source_key" in row ? (row.source_key ?? null) : null,
      anomalyType: row.anomaly_type,
      action:
        row.action === "KEPT" || row.action === "IGNORED" || row.action === "PENDING"
          ? row.action
          : row.action?.toUpperCase?.() === "IGNORED"
            ? "IGNORED"
            : row.action?.toUpperCase?.() === "KEPT"
              ? "KEPT"
              : "PENDING",
      reason: row.reason ?? null,
      reviewedBy: row.reviewed_by ?? null,
      reviewedAt: row.reviewed_at,
    }));

  const metaIntegration = integrations.find((integration) => integration.provider === "meta");
  const apiMedia = media.filter((row) => row.dataSource === "api");
  const manualMedia = media.filter((row) => row.dataSource === "manual_csv");
  const effectiveMedia = (() => {
    if (metaIntegration?.mode === "disabled") {
      return [];
    }

    if (metaIntegration?.mode !== "api") {
      return manualMedia;
    }

    if (!apiMedia.length) {
      return metaIntegration.settings.manualFallback ? manualMedia : [];
    }

    if (!metaIntegration.settings.manualFallback) {
      return apiMedia;
    }

    const apiKeys = new Set(apiMedia.map((row) => buildMediaMergeKey(row)));
    const merged = [
      ...manualMedia.filter((row) => !apiKeys.has(buildMediaMergeKey(row))),
      ...apiMedia,
    ];

    return merged.sort((left, right) => {
      const dateCompare = left.date.localeCompare(right.date);
      if (dateCompare !== 0) {
        return dateCompare;
      }

      return buildMediaMergeKey(left).localeCompare(buildMediaMergeKey(right));
    });
  })();

  return {
    id: brandResult.data.id,
    name: brandResult.data.name,
    createdAt: brandResult.data.created_at,
    updatedAt: brandResult.data.updated_at,
    governance: resolveBrandGovernance({
      brandId: brandResult.data.id,
      brandName: brandResult.data.name,
      planTier: brandResult.data.plan_tier,
      featureFlags: brandResult.data.feature_flags,
    }),
    hydration: {
      catalogLoaded: shouldLoadFull,
      salesLinesLoaded: shouldLoadFull,
      ga4ItemDailyLoaded: shouldLoadFull,
    },
    files: mapLatestImportFiles(importLogsResult),
    catalog,
    paidOrders,
    orderItems,
    salesLines,
    media: effectiveMedia,
    cmvEntries,
    cmvCheckpoints,
    expenseCategories,
    expenses,
    integrations,
    ga4DailyPerformance,
    ga4ItemDailyPerformance,
    sanitizationReviews,
  } satisfies BrandDataset;
}

export async function createBrandIfNeeded(
  brandName: string,
  existingBrands: Array<{ id: string; name: string }>,
) {
  const normalized = brandName.trim().toLowerCase();
  const existing = existingBrands.find(
    (brand) => brand.name.trim().toLowerCase() === normalized,
  );
  if (existing) {
    return existing.id;
  }

  const { data, error } = await supabase.rpc("create_brand", {
    p_name: brandName.trim(),
  });

  if (error) {
    throw error;
  }

  return data as string;
}

async function writeImportLog(
  brandId: string,
  userId: string,
  fileInfo: ImportRunInfo,
  status: "SUCCESS" | "FAILED",
  recordsInserted: number,
  errorMessage?: string,
) {
  const { error } = await supabase.from("import_logs").insert({
    brand_id: brandId,
    user_id: userId,
    file_name: fileInfo.fileName,
    file_type: fileInfo.kind,
    status,
    records_processed: fileInfo.rowCount,
    records_inserted: recordsInserted,
    records_updated: 0,
    error_message: errorMessage ?? null,
    completed_at: new Date().toISOString(),
  });

  if (error) {
    throw error;
  }
}

async function runImportBlock(
  brandId: string,
  userId: string,
  fileInfo: ImportRunInfo,
  block: () => Promise<number>,
) {
  try {
    const recordsInserted = await block();
    await writeImportLog(brandId, userId, fileInfo, "SUCCESS", recordsInserted);
  } catch (error) {
    const errorMessage = toImportErrorMessage(error);
    try {
      await writeImportLog(
        brandId,
        userId,
        fileInfo,
        "FAILED",
        0,
        errorMessage,
      );
    } catch {
      // If logging fails, preserve the original import error.
    }
    throw error;
  }
}

export async function replaceCatalogProductsBySource(
  db: SupabaseClient,
  brandId: string,
  catalog: CatalogProduct[],
  source: "manual_feed" | "meta_catalog",
) {
  const sourceKey = source === "meta_catalog" ? "metaCatalog" : "manualFeed";
  const incomingMap = new Map<string, CatalogSnapshot>();
  dedupeByKey(
    catalog
      .map((product) => normalizeCatalogSnapshot(product, source))
      .filter((product) => product.id),
    (row) => [brandId, row.id].join("::"),
  ).forEach((product) => {
    incomingMap.set(product.id, product);
  });

  const existingRows = await fetchCatalogRowsByBrand(db, brandId);
  const existingMap = new Map(existingRows.map((row) => [String(row.sku ?? "").trim(), row]));

  const rowsToUpsert: Array<{
    brand_id: string;
    sku: string;
    title: string;
    price: number;
    sale_price: number | null;
    image_url: string | undefined;
    product_url: string | undefined;
    attributes: StoredCatalogAttributes;
  }> = [];
  const skusToDelete: string[] = [];

  const allSkus = new Set<string>([...existingMap.keys(), ...incomingMap.keys()]);

  allSkus.forEach((sku) => {
    const incoming = incomingMap.get(sku);
    const existing = existingMap.get(sku);
    const existingAttributes = parseStoredCatalogAttributes(existing?.attributes);
    const sourceSnapshots: {
      manualFeed?: CatalogSnapshot;
      metaCatalog?: CatalogSnapshot;
    } = {
      manualFeed: existingAttributes.sourceSnapshots?.manualFeed,
      metaCatalog: existingAttributes.sourceSnapshots?.metaCatalog,
    };

    if (incoming) {
      sourceSnapshots[sourceKey] = incoming;
    } else {
      delete sourceSnapshots[sourceKey];
    }

    const effectiveSnapshot = pickEffectiveCatalogSnapshot(sourceSnapshots);
    if (!effectiveSnapshot) {
      if (existing) {
        skusToDelete.push(sku);
      }
      return;
    }

    rowsToUpsert.push({
      brand_id: brandId,
      sku,
      title: effectiveSnapshot.title,
      price: Number(effectiveSnapshot.price ?? 0),
      sale_price:
        effectiveSnapshot.salePrice === undefined ? null : effectiveSnapshot.salePrice,
      image_url: effectiveSnapshot.imageUrl,
      product_url: effectiveSnapshot.link,
      attributes: serializeCatalogAttributes(
        effectiveSnapshot,
        {
          manualFeed: Boolean(sourceSnapshots.manualFeed),
          metaCatalog: Boolean(sourceSnapshots.metaCatalog),
        },
        sourceSnapshots,
      ),
    });
  });

  if (skusToDelete.length) {
    for (const chunk of chunkArray(skusToDelete, 200)) {
      const { error } = await db
        .from("products")
        .delete()
        .eq("brand_id", brandId)
        .in("sku", chunk);
      if (error) {
        throw error;
      }
    }
  }

  if (rowsToUpsert.length) {
    for (const chunk of chunkArray(rowsToUpsert)) {
      const { error } = await db
        .from("products")
        .upsert(chunk, { onConflict: "brand_id,sku" });
      if (error) {
        throw error;
      }
    }
  }

  return {
    total: rowsToUpsert.length,
    inserted: rowsToUpsert.filter((row) => !existingMap.has(row.sku)).length,
    updated: rowsToUpsert.filter((row) => existingMap.has(row.sku)).length,
    deleted: skusToDelete.length,
  };
}

async function replaceProducts(
  brandId: string,
  catalog: CatalogProduct[],
) {
  const result = await replaceCatalogProductsBySource(
    supabase,
    brandId,
    catalog.map((product) => ({
      ...product,
      dataSource: "manual_feed",
    })),
    "manual_feed",
  );

  return result.total;
}

async function upsertOrders(
  brandId: string,
  paidOrders: PaidOrder[],
) {
  const orderNumbers = [...new Set(paidOrders.map((order) => order.orderNumber))];
  const existingRows = orderNumbers.length
    ? await fetchAllRows(async (from, to) =>
        supabase
          .from("orders")
          .select(
            "order_number, is_ignored, ignore_reason, ignored_by, ignored_at, sanitization_status, sanitization_note, sanitized_at, sanitized_by",
          )
          .eq("brand_id", brandId)
          .in("order_number", orderNumbers)
          .range(from, to),
      )
    : [];
  const existingMap = new Map(existingRows.map((row) => [row.order_number, row]));

  const rows = dedupeByKey(
    paidOrders.map((order) => {
      const existing = existingMap.get(order.orderNumber);
      return {
        brand_id: brandId,
        order_number: order.orderNumber,
        order_date: toIsoTimestamp(order.orderDate),
        customer_name: order.customerName,
        discount: order.discountValue,
        net_revenue: order.orderValue,
        payment_status: order.paymentStatus,
        source: order.source,
        tracking_code: order.trackingUrl ?? null,
        payment_method: order.paymentMethod,
        items_in_order: order.itemsInOrder,
        coupon_name: order.couponName ?? null,
        commission_value: order.commissionValue,
        shipping_state: order.shippingState ?? null,
        shipping_street: null,
        tracking_url: order.trackingUrl ?? null,
        is_ignored: existing?.is_ignored ?? false,
        ignore_reason: existing?.ignore_reason ?? null,
        ignored_by: existing?.ignored_by ?? null,
        ignored_at: existing?.ignored_at ?? null,
        sanitization_status: existing?.sanitization_status ?? "PENDING",
        sanitization_note: existing?.sanitization_note ?? null,
        sanitized_at: existing?.sanitized_at ?? null,
        sanitized_by: existing?.sanitized_by ?? null,
      };
    }),
    (row) => [row.brand_id, row.order_number].join("::"),
  );

  for (const chunk of chunkArray(rows)) {
    const { error } = await supabase
      .from("orders")
      .upsert(chunk, { onConflict: "brand_id,order_number" });
    if (error) {
      throw error;
    }
  }

  return rows.length;
}

async function replaceOrderItems(
  brandId: string,
  orderItems: OrderItem[],
) {
  const rows = dedupeByKey(
    orderItems,
    (item) =>
      [
        brandId,
        item.orderNumber,
        deriveOrderItemsSku(item),
        item.productName,
        item.productSpecs ?? "",
        item.orderDate,
      ].join("::"),
  );

  const orderNumbers = [...new Set(orderItems.map((item) => item.orderNumber))];
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("id, order_number, is_ignored, ignore_reason, ignored_by, ignored_at")
    .eq("brand_id", brandId)
    .in("order_number", orderNumbers);

  if (ordersError) {
    throw ordersError;
  }

  const orderMap = new Map(orders.map((row) => [row.order_number, row.id]));
  const orderStateMap = new Map(
    orders.map((row) => [
      row.order_number,
      {
        isIgnored: (row as { is_ignored?: boolean }).is_ignored ?? false,
        ignoreReason: (row as { ignore_reason?: string | null }).ignore_reason ?? null,
        ignoredBy: (row as { ignored_by?: string | null }).ignored_by ?? null,
        ignoredAt: (row as { ignored_at?: string | null }).ignored_at ?? null,
      },
    ]),
  );
  if (!orderItems.every((item) => orderMap.has(item.orderNumber))) {
    throw new Error(
      "Importe Lista de Pedidos.csv antes de Lista de Itens.csv para vincular os pedidos.",
    );
  }

  const rowsToInsert = rows.map((item) => {
    const orderState = orderStateMap.get(item.orderNumber);
    return {
      brand_id: brandId,
      order_id: orderMap.get(item.orderNumber),
      order_number: item.orderNumber,
      order_date: toIsoTimestamp(item.orderDate),
      customer_name: item.customerName ?? null,
      sku: deriveOrderItemsSku(item),
      product_name: item.productName,
      product_specs: item.productSpecs ?? null,
      product_type: item.productType ?? null,
      quantity: item.quantity,
      gross_value: item.grossValue,
      unit_price: item.quantity ? item.grossValue / item.quantity : item.grossValue,
      cmv_unit_applied: item.cmvUnitApplied ?? 0,
      cmv_total_applied: item.cmvTotalApplied ?? 0,
      cmv_rule_type: item.cmvRuleType ?? null,
      cmv_rule_value: null,
      cmv_rule_label: item.cmvRuleLabel ?? null,
      cmv_applied_at: null,
      cmv_checkpoint_id: null,
      is_ignored: orderState?.isIgnored ?? false,
      ignore_reason: orderState?.ignoreReason ?? null,
      ignored_by: orderState?.ignoredBy ?? null,
      ignored_at: orderState?.ignoredAt ?? null,
    };
  });

  for (const chunk of chunkArray(orderNumbers)) {
    const { error: deleteError } = await supabase
      .from("order_items")
      .delete()
      .eq("brand_id", brandId)
      .in("order_number", chunk);
    if (deleteError) {
      throw deleteError;
    }
  }

  for (const chunk of chunkArray(rowsToInsert)) {
    const { error } = await supabase.from("order_items").insert(chunk);
    if (error) {
      throw error;
    }
  }

  return rowsToInsert.length;
}

async function replaceSalesLines(
  brandId: string,
  salesLines: SalesLine[],
) {
  const rows = dedupeByKey(
    salesLines.map((line) => ({
      brand_id: brandId,
      order_number: line.orderNumber,
      order_date: toIsoTimestamp(line.orderDate),
      product_id: line.productId,
      product_name: line.productName,
      quantity: line.quantity,
      unit_price: line.unitPrice,
      order_discount_value: line.orderDiscountValue,
      shipping_value: line.shippingValue,
      order_status: line.orderStatus,
      sku: line.sku ?? null,
      is_ignored: false,
      ignore_reason: null,
    })),
    (row) =>
      [
        row.brand_id,
        row.order_number,
        row.product_id,
        row.product_name,
        row.quantity,
        row.unit_price,
        row.order_discount_value,
        row.shipping_value,
        row.order_status,
        row.sku ?? "",
      ].join("::"),
  );

  const orderNumbers = [...new Set(salesLines.map((line) => line.orderNumber))];
  const existingOrders = orderNumbers.length
    ? await fetchAllRows(async (from, to) =>
        supabase
          .from("orders")
          .select("order_number, is_ignored, ignore_reason, ignored_by, ignored_at")
          .eq("brand_id", brandId)
          .in("order_number", orderNumbers)
          .range(from, to),
      )
    : [];
  const orderStateMap = new Map(
    existingOrders.map((row) => [
      row.order_number,
      {
        isIgnored: row.is_ignored ?? false,
        ignoreReason: row.ignore_reason ?? null,
        ignoredBy: row.ignored_by ?? null,
        ignoredAt: row.ignored_at ?? null,
      },
    ]),
  );
  const rowsToInsert = rows.map((row) => {
    const orderState = orderStateMap.get(row.order_number);
    return {
      ...row,
      is_ignored: orderState?.isIgnored ?? false,
      ignore_reason: orderState?.ignoreReason ?? null,
      ignored_by: orderState?.ignoredBy ?? null,
      ignored_at: orderState?.ignoredAt ?? null,
    };
  });

  for (const chunk of chunkArray(orderNumbers)) {
    const { error: deleteError } = await supabase
      .from("sales_lines")
      .delete()
      .eq("brand_id", brandId)
      .in("order_number", chunk);
    if (deleteError) {
      throw deleteError;
    }
  }

  for (const chunk of chunkArray(rowsToInsert)) {
    const { error } = await supabase.from("sales_lines").insert(chunk);
    if (error) {
      throw error;
    }
  }

  return rowsToInsert.length;
}

async function replaceMedia(
  brandId: string,
  media: MediaRow[],
) {
  const rows = dedupeByKey(
    media.map((row) => ({
      report_start: row.date,
      report_end: row.date,
      campaign_name: row.campaignName,
      adset_name: row.adsetName,
      ad_name: row.adName,
      account_name: row.accountName,
      platform: row.platform || "meta_ads",
      placement: row.placement || "all",
      device_platform: row.devicePlatform || "all",
      delivery: row.delivery || "csv",
      reach: row.reach,
      impressions: row.impressions,
      clicks_all: row.clicksAll,
      link_clicks: row.linkClicks,
      spend: row.spend,
      purchases: row.purchases,
      revenue: row.purchaseValue,
      ctr_all: row.ctrAll,
      ctr_link: row.ctrLink,
      add_to_cart: row.addToCart,
    })),
    (row) =>
      [
        brandId,
        row.report_start,
        row.campaign_name,
        row.adset_name,
        row.ad_name,
      ].join("::"),
  );

  const result = await ingestMetaRaw(brandId, rows);
  return (result.inserted ?? 0) + (result.updated ?? 0);
}

async function replaceCmvRulesFromBase(
  brandId: string,
  cmvBase: Array<{
    productName: string;
    sku: string;
    productType: string;
    unitCost: number;
  }>,
) {
  const timestamp = new Date().toISOString();
  const baselineValidFrom = "2000-01-01T00:00:00.000Z";
  const productRules = dedupeByKey(
    cmvBase
      .filter((row) => row.productName && Number.isFinite(row.unitCost))
      .map((row) => ({
        brand_id: brandId,
        sku: normalizeMatchValue(row.productName),
        cmv_unit: row.unitCost,
        valid_from: baselineValidFrom,
        valid_to: null,
        match_type: "PRODUCT" as CmvMatchType,
        match_value: normalizeMatchValue(row.productName),
        match_label: row.productName.trim(),
        source: "cmv_produtos_import",
      })),
    (row) => `${row.match_type}::${row.match_value}`,
  );

  const typeRules = dedupeByKey(
    cmvBase
      .filter((row) => row.productType && Number.isFinite(row.unitCost))
      .map((row) => ({
        brand_id: brandId,
        sku: normalizeMatchValue(row.productType),
        cmv_unit: row.unitCost,
        valid_from: baselineValidFrom,
        valid_to: null,
        match_type: "TYPE" as CmvMatchType,
        match_value: normalizeMatchValue(row.productType),
        match_label: row.productType.trim(),
        source: "cmv_produtos_import",
      })),
    (row) => `${row.match_type}::${row.match_value}`,
  );

  const skuRules = dedupeByKey(
    cmvBase
      .filter((row) => row.sku && Number.isFinite(row.unitCost))
      .map((row) => ({
        brand_id: brandId,
        sku: normalizeMatchValue(row.sku),
        cmv_unit: row.unitCost,
        valid_from: baselineValidFrom,
        valid_to: null,
        match_type: "SKU" as CmvMatchType,
        match_value: normalizeMatchValue(row.sku),
        match_label: row.sku.trim(),
        source: "cmv_produtos_import",
      })),
    (row) => `${row.match_type}::${row.match_value}`,
  );

  const nextRules = [...productRules, ...typeRules, ...skuRules];
  if (!nextRules.length) {
    return 0;
  }

  const { data: currentRules, error: currentRulesError } = await supabase
    .from("cmv_history")
    .select("id, match_type, match_value")
    .eq("brand_id", brandId)
    .is("valid_to", null);

  if (currentRulesError) {
    throw currentRulesError;
  }

  const ruleKeys = new Set(nextRules.map((rule) => `${rule.match_type}::${rule.match_value}`));
  const idsToClose = (currentRules ?? [])
    .filter((row) => ruleKeys.has(`${row.match_type}::${row.match_value}`))
    .map((row) => row.id);

  for (const chunk of chunkArray(idsToClose)) {
    const { error } = await supabase
      .from("cmv_history")
      .update({ valid_to: timestamp, updated_at: timestamp })
      .in("id", chunk);
    if (error) {
      throw error;
    }
  }

  for (const chunk of chunkArray(nextRules)) {
    const { error } = await supabase.from("cmv_history").insert(chunk);
    if (error) {
      throw error;
    }
  }

  return nextRules.length;
}

export async function importFilesToBrand(
  brandId: string,
  files: File[],
  userId: string,
) {
  const parsedFiles = await Promise.all(files.map((file) => parseUploadedCsv(file)));
  const priority: Record<CsvFileKind, number> = {
    lista_pedidos: 0,
    feed: 1,
    cmv_produtos: 2,
    lista_itens: 3,
    pedidos_pagos: 4,
    meta: 5,
  };
  parsedFiles.sort((a, b) => priority[a.kind] - priority[b.kind]);

  for (const parsed of parsedFiles) {
    switch (parsed.kind) {
      case "feed":
        await runImportBlock(brandId, userId, parsed.fileInfo, () =>
          replaceProducts(brandId, parsed.payload.catalog ?? []),
        );
        break;

      case "cmv_produtos":
        await runImportBlock(brandId, userId, parsed.fileInfo, () =>
          replaceCmvRulesFromBase(brandId, parsed.payload.cmvBase ?? []),
        );
        break;

      // --- Lista de Pedidos: base financeira do pedido (Receita Bruta / Desconto / RLD)
      case "lista_pedidos": {
        const paidOrders = parsed.payload.paidOrders ?? [];
        await runImportBlock(brandId, userId, parsed.fileInfo, () =>
          upsertOrders(brandId, paidOrders),
        );
        break;
      }

      // --- Lista de Itens: itens reais com CMV resolvido no banco (§7)
      case "lista_itens": {
        const orderItems = parsed.payload.orderItems ?? [];
        await runImportBlock(brandId, userId, parsed.fileInfo, () =>
          replaceOrderItems(brandId, orderItems),
        );
        break;
      }

      // --- Pedidos Pagos (CSV alternativo financeiro): tratado como ingestão de pedidos
      case "pedidos_pagos": {
        const salesLines = parsed.payload.salesLines ?? [];
        await runImportBlock(brandId, userId, parsed.fileInfo, () =>
          replaceSalesLines(brandId, salesLines),
        );
        break;
      }

      // --- Meta Export: ingestão idempotente com hash por campanha+data (§8)
      case "meta": {
        const mediaRows = parsed.payload.media ?? [];
        await runImportBlock(brandId, userId, parsed.fileInfo, () =>
          replaceMedia(brandId, mediaRows),
        );
        break;
      }
    }
  }

  // Aplica checkpoint de CMV automaticamente após qualquer ingestão
  await applyCmvCheckpoint(brandId, "Checkpoint automático após importação");
}

export async function setCurrentCmv(brandId: string, sku: string, unitCost: number) {
  const { data, error } = await supabase.rpc("set_cmv_rule", {
    p_brand_id: brandId,
    p_match_type: "PRODUCT",
    p_match_value: sku,
    p_match_label: sku,
    p_cmv_unit: unitCost,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function saveCmvRule(
  brandId: string,
  matchType: CmvMatchType,
  matchValue: string,
  matchLabel: string,
  unitCost: number,
  validFrom?: string,
) {
  const { data, error } = await supabase.rpc("set_cmv_rule", {
    p_brand_id: brandId,
    p_match_type: matchType,
    p_match_value: matchValue,
    p_match_label: matchLabel,
    p_cmv_unit: unitCost,
    p_valid_from: validFrom ? `${validFrom}T00:00:00` : null,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function applyCmvCheckpoint(brandId: string, note?: string, createdAt?: string) {
  const { data, error } = await supabase.rpc("apply_cmv_checkpoint", {
    p_brand_id: brandId,
    p_note: note ?? null,
    p_created_at: createdAt ? `${createdAt}T00:00:00` : null,
  });


  if (error) {
    throw error;
  }

  return data;
}

export async function setMediaSanitizationState(
  mediaRowId: string,
  status: SanitizationDecision,
  note?: string,
) {
  const { data, error } = await supabase.rpc("set_media_sanitization_state", {
    p_row_id: mediaRowId,
    p_status: status,
    p_note: note ?? null,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function setOrderSanitizationState(
  brandId: string,
  orderNumber: string,
  status: SanitizationDecision,
  note?: string,
) {
  const { data, error } = await supabase.rpc("set_order_sanitization_state", {
    p_brand_id: brandId,
    p_order_number: orderNumber,
    p_status: status,
    p_note: note ?? null,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function setMediaIgnoreState(
  mediaRowId: string,
  isIgnored: boolean,
  reason?: string,
) {
  return setMediaSanitizationState(mediaRowId, isIgnored ? "IGNORED" : "PENDING", reason);
}

export async function setOrderIgnoreState(
  brandId: string,
  orderNumber: string,
  isIgnored: boolean,
  reason?: string,
) {
  return setOrderSanitizationState(
    brandId,
    orderNumber,
    isIgnored ? "IGNORED" : "PENDING",
    reason,
  );
}

export async function createExpenseCategory(
  brandId: string,
  name: string,
  color = "#7C8DB5",
) {
  const { data, error } = await supabase
    .from("expense_categories")
    .insert({
      brand_id: brandId,
      name: name.trim(),
      color,
      is_system: false,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data.id as string;
}

export async function updateExpenseCategory(
  categoryId: string,
  name: string,
  color: string,
) {
  const { data, error } = await supabase
    .from("expense_categories")
    .update({
      name: name.trim(),
      color,
    })
    .eq("id", categoryId)
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data.id as string;
}

export async function createBrandExpense(
  brandId: string,
  categoryId: string,
  description: string,
  amount: number,
  incurredOn: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from("brand_expenses")
    .insert({
      brand_id: brandId,
      category_id: categoryId,
      description: description.trim(),
      amount,
      incurred_on: incurredOn,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data.id as string;
}

export async function updateBrandExpense(
  expenseId: string,
  categoryId: string,
  description: string,
  amount: number,
  incurredOn: string,
) {
  const { data, error } = await supabase
    .from("brand_expenses")
    .update({
      category_id: categoryId,
      description: description.trim(),
      amount,
      incurred_on: incurredOn,
    })
    .eq("id", expenseId)
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data.id as string;
}

export async function deleteBrandExpense(expenseId: string) {
  const { error } = await supabase
    .from("brand_expenses")
    .delete()
    .eq("id", expenseId);

  if (error) {
    throw error;
  }
}
export async function fetchDailyMetrics(brandId: string, from?: string, to?: string) {
  const { data, error } = await supabase.rpc("get_daily_metrics", {
    p_brand_id: brandId,
    p_from: from || null,
    p_to: to || null,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function fetchMonthlyDre(brandId: string, yearMonth?: string) {
  const { data, error } = await supabase.rpc("get_dre_monthly", {
    p_brand_id: brandId,
    p_yearmonth: yearMonth || null,
  });

  if (error) {
    throw error;
  }

  return data;
}
