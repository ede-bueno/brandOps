import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { APP_ROUTES } from "@/lib/brandops/routes";
import { normalizeFinancialReportPayload } from "@/lib/brandops/server/financial-report";
import {
  buildMediaReport,
  normalizeMediaReportPayload,
} from "@/lib/brandops/server/media-report";
import { buildProductInsightsReport } from "@/lib/brandops/server/product-insights";
import { normalizeSalesDetailReportPayload } from "@/lib/brandops/server/sales-report";
import { buildSanitizationReport } from "@/lib/brandops/server/sanitization-report";
import { normalizeTrafficReportPayload } from "@/lib/brandops/server/traffic-report";
import type {
  AcquisitionHubReport,
  AnnualDreReport,
  BrandIntegrationConfig,
  CatalogReport,
  ExecutiveActionItem,
  ExecutiveActionStatus,
  FinanceHubReport,
  ManagementAcquisitionSnapshot,
  ManagementCashDrivers,
  ManagementContextV2,
  ManagementEvidenceLink,
  ManagementKpiDockItem,
  ManagementOfferSnapshot,
  ManagementOperationalRisks,
  ManagementRiskItem,
  ManagementSnapshotV2,
  ManagementSourceHealthItem,
  ManagementStatusCard,
  MediaReport,
  OfferHubReport,
  OrderItem,
  ProductInsightsReport,
  SalesDetailReport,
  SanitizationReport,
  TrafficReport,
} from "@/lib/brandops/types";

type IntegrationRow = {
  id: string;
  provider: BrandIntegrationConfig["provider"];
  mode: BrandIntegrationConfig["mode"];
  settings: BrandIntegrationConfig["settings"] | null;
  last_sync_at: string | null;
  last_sync_status: BrandIntegrationConfig["lastSyncStatus"] | null;
  last_sync_error: string | null;
};

type ProductInsightsBaseRow = {
  item_id: string;
  item_name: string;
  item_brand: string | null;
  item_category: string | null;
  item_views: number | null;
  add_to_carts: number | null;
  checkouts: number | null;
  ecommerce_purchases: number | null;
  item_purchase_quantity: number | null;
  item_revenue: number | null;
};

type ProductInsightsTrendRow = ProductInsightsBaseRow & {
  date: string;
};

type QueueRow = {
  action_key: string;
  status: ExecutiveActionStatus;
  review_at: string | null;
};

type QueuePersistenceError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

type ManagementDataBundle = {
  context: ManagementContextV2;
  integrations: BrandIntegrationConfig[];
  financial: AnnualDreReport;
  media: MediaReport;
  traffic: TrafficReport;
  sales: SalesDetailReport;
  productInsights: ProductInsightsReport;
  catalog: CatalogReport;
  sanitization: SanitizationReport;
};

const PAGE_SIZE = 1000;

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const integerFormatter = new Intl.NumberFormat("pt-BR");

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function periodKey(from?: string | null, to?: string | null) {
  return `${from ?? "all"}:${to ?? "all"}`;
}

function isMissingExecutiveQueueTable(error: QueuePersistenceError | null | undefined) {
  if (!error) {
    return false;
  }

  const message = [error.message, error.details, error.hint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    error.code === "42P01" ||
    message.includes("atlas_executive_action_queue") ||
    message.includes("could not find the table") ||
    message.includes("does not exist")
  );
}

function buildFreshnessLabel(timestamp: string | null | undefined) {
  if (!timestamp) {
    return "sem sync registrada";
  }

  return `sync ${timestamp.slice(0, 10)}`;
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

async function loadBrandName(supabase: SupabaseClient, brandId: string) {
  const { data, error } = await supabase
    .from("brands")
    .select("name")
    .eq("id", brandId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.name ?? "Marca ativa";
}

async function loadIntegrations(
  supabase: SupabaseClient,
  brandId: string,
): Promise<BrandIntegrationConfig[]> {
  const rows = await fetchAllRows<IntegrationRow>(async (from, to) =>
    supabase
      .from("brand_integrations")
      .select("id, provider, mode, settings, last_sync_at, last_sync_status, last_sync_error")
      .eq("brand_id", brandId)
      .order("provider")
      .range(from, to),
  );

  return rows.map((row) => ({
    id: row.id,
    provider: row.provider,
    mode: row.mode,
    settings: row.settings ?? {},
    lastSyncAt: row.last_sync_at,
    lastSyncStatus: row.last_sync_status ?? "idle",
    lastSyncError: row.last_sync_error,
  }));
}

function needsMediaFallback(report: MediaReport) {
  if (report.summary.impressions <= 0) {
    return false;
  }

  if (report.summary.clicksAll > 0 && report.summary.ctrAll <= 0) {
    return true;
  }

  if (report.summary.linkClicks > 0 && report.summary.ctrLink <= 0) {
    return true;
  }

  return report.campaigns.some(
    (campaign) =>
      campaign.impressions > 0 &&
      ((campaign.clicksAll > 0 && campaign.ctrAll <= 0) ||
        (campaign.linkClicks > 0 && campaign.ctrLink <= 0)),
  );
}

async function loadFinancialReport(
  supabase: SupabaseClient,
  brandId: string,
  from?: string | null,
  to?: string | null,
) {
  const { data, error } = await supabase.rpc("get_financial_report", {
    p_brand_id: brandId,
    p_from: from ?? null,
    p_to: to ?? null,
  });

  if (error) {
    throw error;
  }

  return normalizeFinancialReportPayload(data);
}

async function loadMediaReport(
  supabase: SupabaseClient,
  brandId: string,
  integrations: BrandIntegrationConfig[],
  from?: string | null,
  to?: string | null,
) {
  const integration = integrations.find((item) => item.provider === "meta");
  const { data, error } = await supabase.rpc("get_media_report", {
    p_brand_id: brandId,
    p_from: from ?? null,
    p_to: to ?? null,
  });

  if (!error) {
    const report = normalizeMediaReportPayload(data);
    if (!needsMediaFallback(report)) {
      return report;
    }
  }

  const mediaRows = await fetchAllRows(async (pageFrom, pageTo) =>
    supabase
      .from("media_performance")
      .select(
        "id, report_start, date, campaign_name, adset_name, ad_name, delivery, reach, impressions, clicks_all, link_clicks, spend, purchases, conversion_value, is_ignored",
      )
      .eq("brand_id", brandId)
      .range(pageFrom, pageTo),
  );

  return buildMediaReport(mediaRows, {
    mode: integration?.mode ?? "manual_csv",
    manualFallback: Boolean(integration?.settings.manualFallback),
    from,
    to,
  });
}

async function loadTrafficReport(
  supabase: SupabaseClient,
  brandId: string,
  from?: string | null,
  to?: string | null,
) {
  const { data, error } = await supabase.rpc("get_traffic_report", {
    p_brand_id: brandId,
    p_from: from ?? null,
    p_to: to ?? null,
  });

  if (error) {
    throw error;
  }

  return normalizeTrafficReportPayload(data);
}

async function loadSalesReport(
  supabase: SupabaseClient,
  brandId: string,
  from?: string | null,
  to?: string | null,
) {
  const { data, error } = await supabase.rpc("get_sales_detail_report", {
    p_brand_id: brandId,
    p_from: from ?? null,
    p_to: to ?? null,
  });

  if (error) {
    throw error;
  }

  return normalizeSalesDetailReportPayload(data, {
    from,
    to,
  });
}

function mapGa4ItemSummaryRow(row: ProductInsightsBaseRow, date: string) {
  return {
    id: `${row.item_id}:${date}`,
    date,
    itemId: row.item_id,
    itemName: row.item_name,
    itemBrand: row.item_brand ?? "",
    itemCategory: row.item_category ?? "",
    itemViews: row.item_views ?? 0,
    addToCarts: row.add_to_carts ?? 0,
    checkouts: row.checkouts ?? 0,
    ecommercePurchases: row.ecommerce_purchases ?? 0,
    itemPurchaseQuantity: row.item_purchase_quantity ?? 0,
    itemRevenue: row.item_revenue ?? 0,
    cartToViewRate: 0,
    purchaseToViewRate: 0,
    lastSyncedAt: null,
  };
}

function mapGa4ItemTrendRow(row: ProductInsightsTrendRow) {
  return {
    id: `${row.item_id}:${row.date}`,
    date: row.date,
    itemId: row.item_id,
    itemName: row.item_name,
    itemBrand: row.item_brand ?? "",
    itemCategory: row.item_category ?? "",
    itemViews: row.item_views ?? 0,
    addToCarts: row.add_to_carts ?? 0,
    checkouts: row.checkouts ?? 0,
    ecommercePurchases: row.ecommerce_purchases ?? 0,
    itemPurchaseQuantity: row.item_purchase_quantity ?? 0,
    itemRevenue: row.item_revenue ?? 0,
    cartToViewRate: 0,
    purchaseToViewRate: 0,
    lastSyncedAt: null,
  };
}

function mapOrderSignal(row: {
  sku: string | null;
  product_name: string;
  product_specs: string | null;
  product_type: string | null;
  quantity: number | null;
  gross_value: number | null;
}): OrderItem {
  return {
    orderNumber: "",
    orderDate: "",
    sku: row.sku ?? undefined,
    productName: row.product_name,
    productSpecs: row.product_specs ?? undefined,
    productType: row.product_type,
    quantity: row.quantity ?? 0,
    grossValue: row.gross_value ?? 0,
    isIgnored: false,
  };
}

function resolvePreviousWindow(range: { from: string | null; to: string | null }) {
  if (!range.from || !range.to) {
    return { from: null as string | null, to: null as string | null };
  }

  const start = new Date(`${range.from}T00:00:00`);
  const end = new Date(`${range.to}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { from: null as string | null, to: null as string | null };
  }

  const dayCount = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1);
  const previousEnd = new Date(start);
  previousEnd.setDate(previousEnd.getDate() - 1);
  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousStart.getDate() - (dayCount - 1));

  return {
    from: previousStart.toISOString().slice(0, 10),
    to: previousEnd.toISOString().slice(0, 10),
  };
}

async function resolveCurrentProductWindow(
  supabase: SupabaseClient,
  brandId: string,
  from?: string | null,
  to?: string | null,
) {
  if (from && to) {
    return { from, to };
  }

  const [{ data: firstRows, error: firstError }, { data: lastRows, error: lastError }] =
    await Promise.all([
      supabase
        .from("ga4_item_daily_performance")
        .select("date")
        .eq("brand_id", brandId)
        .order("date", { ascending: true })
        .limit(1),
      supabase
        .from("ga4_item_daily_performance")
        .select("date")
        .eq("brand_id", brandId)
        .order("date", { ascending: false })
        .limit(1),
    ]);

  if (firstError) {
    throw firstError;
  }

  if (lastError) {
    throw lastError;
  }

  return {
    from: from ?? firstRows?.[0]?.date ?? null,
    to: to ?? lastRows?.[0]?.date ?? null,
  };
}

async function loadProductInsightsReport(
  supabase: SupabaseClient,
  brandId: string,
  from?: string | null,
  to?: string | null,
) {
  const currentWindow = await resolveCurrentProductWindow(supabase, brandId, from, to);
  const previousWindow = resolvePreviousWindow(currentWindow);

  const [
    { data: currentBaseRows, error: currentBaseError },
    { data: currentTrendRows, error: currentTrendError },
    previousResult,
    { data: orderSignalRows, error: orderSignalError },
  ] = await Promise.all([
    supabase.rpc("get_product_insights_base", {
      p_brand_id: brandId,
      p_from: currentWindow.from,
      p_to: currentWindow.to,
    }),
    supabase.rpc("get_product_insights_trends", {
      p_brand_id: brandId,
      p_from: currentWindow.from,
      p_to: currentWindow.to,
    }),
    previousWindow.from && previousWindow.to
      ? supabase.rpc("get_product_insights_base", {
          p_brand_id: brandId,
          p_from: previousWindow.from,
          p_to: previousWindow.to,
        })
      : Promise.resolve({ data: [], error: null }),
    supabase.rpc("get_product_order_signals", {
      p_brand_id: brandId,
      p_from: from ?? null,
      p_to: to ?? null,
    }),
  ]);

  if (currentBaseError) {
    throw currentBaseError;
  }

  if (currentTrendError) {
    throw currentTrendError;
  }

  if (previousResult.error) {
    throw previousResult.error;
  }

  if (orderSignalError) {
    throw orderSignalError;
  }

  const currentRows = (currentBaseRows ?? []).map((row: ProductInsightsBaseRow) =>
    mapGa4ItemSummaryRow(row, currentWindow.to ?? currentWindow.from ?? "1900-01-01"),
  );
  const trendRows = (currentTrendRows ?? []).map((row: ProductInsightsTrendRow) =>
    mapGa4ItemTrendRow(row),
  );

  return buildProductInsightsReport(
    trendRows.length ? trendRows : currentRows,
    (orderSignalRows ?? []).map(mapOrderSignal),
    (previousResult.data ?? []).map((row: ProductInsightsBaseRow) =>
      mapGa4ItemSummaryRow(row, previousWindow.to ?? previousWindow.from ?? "1900-01-01"),
    ),
    {
      from,
      to,
    },
  );
}

async function loadCatalogReport(
  supabase: SupabaseClient,
  brandId: string,
  from?: string | null,
  to?: string | null,
) {
  const { data, error } = await supabase.rpc("get_catalog_report", {
    p_brand_id: brandId,
    p_from: from ?? null,
    p_to: to ?? null,
    p_search: null,
    p_status: "all",
    p_product_type: "all",
    p_collection: "all",
  });

  if (error) {
    throw error;
  }

  return data as CatalogReport;
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

function resolveSanitizationStatus(
  value: "PENDING" | "KEPT" | "IGNORED" | null | undefined,
  isIgnored?: boolean | null,
) {
  if (value === "PENDING" || value === "KEPT" || value === "IGNORED") {
    return value;
  }

  return isIgnored ? "IGNORED" : "PENDING";
}

async function loadSanitizationReport(
  supabase: SupabaseClient,
  brandId: string,
) {
  const [orders, media, reviews] = await Promise.all([
    fetchAllRows(async (from, to) =>
      supabase
        .from("orders")
        .select(
          "id, order_number, order_date, payment_method, payment_status, customer_name, items_in_order, gross_revenue, net_revenue, discount, commission_value, source, tracking_url, shipping_state, coupon_name, is_ignored, ignore_reason, ignored_by, ignored_at, sanitization_status, sanitization_note, sanitized_at, sanitized_by",
        )
        .eq("brand_id", brandId)
        .range(from, to),
    ),
    fetchAllRows(async (from, to) =>
      supabase
        .from("media_performance")
        .select(
          "id, report_start, report_end, row_hash, campaign_name, adset_name, account_name, ad_name, platform, placement, device_platform, delivery, reach, impressions, clicks_all, spend, purchases, conversion_value, link_clicks, ctr_all, ctr_link, add_to_cart, is_ignored, ignore_reason, ignored_by, ignored_at, sanitization_status, sanitization_note, sanitized_at, sanitized_by",
        )
        .eq("brand_id", brandId)
        .range(from, to),
    ),
    fetchAllRows(async (from, to) =>
      supabase
        .from("anomaly_reviews")
        .select(
          "id, source_table, source_row_id, source_key, anomaly_type, action, reason, reviewed_by, reviewed_at",
        )
        .eq("brand_id", brandId)
        .in("source_table", ["media_performance", "orders"])
        .range(from, to),
    ),
  ]);

  return buildSanitizationReport({
    id: brandId,
    name: "",
    createdAt: "",
    updatedAt: "",
    governance: {
      planTier: "starter",
      featureFlags: {
        atlasAi: false,
        atlasCommandCenter: false,
        brandLearning: false,
        geminiModelCatalog: false,
      },
    },
    hydration: {
      catalogLoaded: false,
      salesLinesLoaded: false,
      ga4ItemDailyLoaded: false,
    },
    files: {},
    catalog: [],
    paidOrders: orders.map((row) => ({
      id: row.id,
      orderNumber: row.order_number,
      orderDate: row.order_date.slice(0, 10),
      paymentMethod: row.payment_method ?? "",
      paymentStatus: row.payment_status ?? "",
      customerName: row.customer_name ?? "",
      itemsInOrder: Number(row.items_in_order ?? 0),
      orderValue: resolveCommercialOrderValue(row),
      discountValue: Number(row.discount ?? 0),
      commissionValue: Number(row.commission_value ?? 0),
      couponName: row.coupon_name ?? null,
      source: row.source ?? "INK",
      trackingUrl: row.tracking_url ?? undefined,
      shippingState: row.shipping_state ?? undefined,
      isIgnored: row.is_ignored ?? false,
      ignoreReason: row.ignore_reason ?? null,
      sanitizationStatus: resolveSanitizationStatus(row.sanitization_status, row.is_ignored),
      sanitizationNote: row.sanitization_note ?? null,
      sanitizedAt: row.sanitized_at ?? row.ignored_at ?? null,
      sanitizedBy: row.sanitized_by ?? row.ignored_by ?? null,
    })),
    salesLines: [],
    orderItems: [],
    media: media.map((row) => ({
      id: row.id,
      rowHash: row.row_hash ?? null,
      date: (row.report_start ?? row.report_end ?? "").slice(0, 10),
      campaignName: row.campaign_name ?? "",
      adsetName: row.adset_name ?? "",
      accountName: row.account_name ?? "",
      adName: row.ad_name ?? "",
      platform: row.platform ?? "",
      placement: row.placement ?? "",
      devicePlatform: row.device_platform ?? "",
      delivery: row.delivery ?? "",
      reach: Number(row.reach ?? 0),
      impressions: Number(row.impressions ?? 0),
      clicksAll: Number(row.clicks_all ?? 0),
      spend: Number(row.spend ?? 0),
      purchases: Number(row.purchases ?? 0),
      purchaseValue: Number(row.conversion_value ?? 0),
      linkClicks: Number(row.link_clicks ?? 0),
      ctrAll: Number(row.ctr_all ?? 0),
      ctrLink: Number(row.ctr_link ?? 0),
      addToCart: Number(row.add_to_cart ?? 0),
      isIgnored: row.is_ignored ?? false,
      ignoreReason: row.ignore_reason ?? null,
      sanitizationStatus: resolveSanitizationStatus(row.sanitization_status, row.is_ignored),
      sanitizationNote: row.sanitization_note ?? null,
      sanitizedAt: row.sanitized_at ?? row.ignored_at ?? null,
      sanitizedBy: row.sanitized_by ?? row.ignored_by ?? null,
      dataSource: row.delivery?.toLowerCase() === "api" ? "api" : "manual_csv",
    })),
    cmvEntries: [],
    cmvCheckpoints: [],
    expenseCategories: [],
    expenses: [],
    integrations: [],
    ga4DailyPerformance: [],
    ga4ItemDailyPerformance: [],
    sanitizationReviews: reviews.map((row) => ({
      id: row.id,
      sourceTable: row.source_table,
      sourceRowId: row.source_row_id,
      sourceKey: row.source_key ?? null,
      anomalyType: row.anomaly_type,
      action: row.action,
      reason: row.reason ?? null,
      reviewedBy: row.reviewed_by ?? null,
      reviewedAt: row.reviewed_at,
    })),
  });
}

async function loadQueueRows(
  supabase: SupabaseClient,
  brandId: string,
  from?: string | null,
  to?: string | null,
) {
  const { data, error } = await supabase
    .from("atlas_executive_action_queue")
    .select("action_key, status, review_at")
    .eq("brand_id", brandId)
    .eq("period_key", periodKey(from, to));

  if (error) {
    if (isMissingExecutiveQueueTable(error)) {
      return [];
    }

    throw error;
  }

  return (data ?? []) as QueueRow[];
}

function buildContext(
  brandId: string,
  brandName: string,
  reports: {
    financial: AnnualDreReport;
    media: MediaReport;
    traffic: TrafficReport;
    productInsights: ProductInsightsReport;
    catalog: CatalogReport;
    sales: SalesDetailReport;
    sanitization: SanitizationReport;
  },
  from?: string | null,
  to?: string | null,
): ManagementContextV2 {
  const sourcesWithData = [
    reports.financial.total.paidOrderCount > 0 || reports.financial.months.length > 0,
    reports.media.meta.hasData,
    reports.traffic.meta.hasData,
    reports.productInsights.meta.hasData,
    reports.catalog.meta.hasData,
  ];
  const confidenceScore = Math.round(
    (sourcesWithData.filter(Boolean).length / sourcesWithData.length) * 100,
  );

  return {
    brandId,
    brandName,
    from: from ?? null,
    to: to ?? null,
    generatedAt: new Date().toISOString(),
    confidenceScore,
    confidenceLabel:
      confidenceScore >= 80
        ? "alta confiança"
        : confidenceScore >= 55
          ? "confiança moderada"
          : "confiança em formação",
    hasData: sourcesWithData.some(Boolean),
  };
}

function buildSourceHealth(
  integrations: BrandIntegrationConfig[],
  bundle: ManagementDataBundle,
): ManagementSourceHealthItem[] {
  const metaIntegration = integrations.find((item) => item.provider === "meta");
  const ga4Integration = integrations.find((item) => item.provider === "ga4");
  const metaStatus =
    metaIntegration?.lastSyncStatus === "error"
      ? "error"
      : bundle.media.meta.hasData
        ? "healthy"
        : metaIntegration
          ? "warning"
          : "missing";
  const ga4Status =
    ga4Integration?.lastSyncStatus === "error"
      ? "error"
      : bundle.traffic.meta.hasData
        ? "healthy"
        : ga4Integration
          ? "warning"
          : "missing";
  const catalogStatus =
    bundle.catalog.meta.hasData
      ? "healthy"
      : bundle.catalog.meta.metaCatalogReady
        ? "warning"
        : "missing";
  const opsStatus =
    bundle.sanitization.meta.pendingCount > 0 ? "warning" : "healthy";

  return [
    {
      key: "ink",
      label: "Venda real INK",
      status:
        bundle.financial.total.paidOrderCount > 0 || bundle.financial.months.length > 0
          ? "healthy"
          : "missing",
      freshnessLabel:
        bundle.financial.analysis.latestMonth?.label?.toLowerCase() ?? "sem fechamento disponível",
      detail:
        bundle.financial.total.paidOrderCount > 0
          ? `${integerFormatter.format(bundle.financial.total.paidOrderCount)} pedidos pagos no recorte.`
          : "Ainda não há base comercial suficiente para leitura financeira.",
      href: APP_ROUTES.finance,
    },
    {
      key: "meta",
      label: "Meta Ads",
      status: metaStatus,
      freshnessLabel: buildFreshnessLabel(metaIntegration?.lastSyncAt),
      detail:
        metaIntegration?.lastSyncStatus === "error"
          ? metaIntegration.lastSyncError ?? "A integração Meta falhou no último ciclo."
          : bundle.media.meta.hasData
            ? `${currencyFormatter.format(bundle.media.summary.spend)} investidos com ${bundle.media.summary.attributedRoas.toFixed(2)}x ROAS atribuído.`
            : "Sem massa de mídia confiável no recorte atual.",
      href: APP_ROUTES.acquisition,
    },
    {
      key: "ga4",
      label: "GA4",
      status: ga4Status,
      freshnessLabel: buildFreshnessLabel(ga4Integration?.lastSyncAt),
      detail:
        ga4Integration?.lastSyncStatus === "error"
          ? ga4Integration.lastSyncError ?? "A integração GA4 falhou no último ciclo."
          : bundle.traffic.meta.hasData
            ? `${integerFormatter.format(bundle.traffic.summary.sessions)} sessões e ${currencyFormatter.format(bundle.traffic.summary.purchaseRevenue)} de receita GA4.`
            : "Sem volume suficiente de tráfego para leitura gerencial.",
      href: APP_ROUTES.acquisition,
    },
    {
      key: "catalog",
      label: "Catálogo e portfólio",
      status: catalogStatus,
      freshnessLabel: bundle.catalog.meta.sourceLabel.toLowerCase(),
      detail:
        bundle.catalog.meta.hasData
          ? `${integerFormatter.format(bundle.catalog.summary.totalProducts)} produtos no hub de oferta.`
          : "O catálogo ainda não está pronto para suportar leitura de portfólio.",
      href: APP_ROUTES.offer,
    },
    {
      key: "ops",
      label: "Base operacional",
      status: opsStatus,
      freshnessLabel:
        bundle.sanitization.meta.pendingCount > 0 ? "pedindo revisão" : "sem pendências abertas",
      detail:
        bundle.sanitization.meta.pendingCount > 0
          ? `${integerFormatter.format(bundle.sanitization.meta.pendingCount)} item(ns) aguardam saneamento.`
          : "Integrações e saneamento não estão bloqueando a leitura principal.",
      href: APP_ROUTES.operations,
    },
  ];
}

function buildKpiDock(bundle: ManagementDataBundle): ManagementKpiDockItem[] {
  const { financial, media, traffic, productInsights } = bundle;
  return [
    {
      key: "net-result",
      label: "Resultado operacional",
      value: currencyFormatter.format(financial.total.netResult),
      description: "Resultado final depois de CMV, mídia e despesas.",
      tone: financial.total.netResult >= 0 ? "positive" : "negative",
      href: APP_ROUTES.finance,
    },
    {
      key: "contribution",
      label: "Contribuição pós-mídia",
      value: currencyFormatter.format(financial.total.contributionAfterMedia),
      description: percentFormatter.format(financial.total.contributionMargin),
      tone: financial.total.contributionAfterMedia >= 0 ? "positive" : "warning",
      href: APP_ROUTES.finance,
    },
    {
      key: "roas-gross",
      label: "ROAS financeiro",
      value: `${financial.total.grossRoas.toFixed(2)}x`,
      description: "Venda real INK dividida pelo investimento de mídia.",
      tone: financial.total.grossRoas >= 2 ? "positive" : "warning",
      href: APP_ROUTES.finance,
    },
    {
      key: "sessions",
      label: "Sessões GA4",
      value: integerFormatter.format(traffic.summary.sessions),
      description: "Volume total do recorte para validar aquisição e funil.",
      tone: traffic.summary.sessions > 0 ? "info" : "neutral",
      href: APP_ROUTES.acquisition,
    },
    {
      key: "media-spend",
      label: "Mídia ativa",
      value: currencyFormatter.format(media.summary.spend),
      description: `${media.summary.attributedRoas.toFixed(2)}x de ROAS atribuído na Meta.`,
      tone: media.summary.attributedRoas >= 2 ? "positive" : "warning",
      href: APP_ROUTES.acquisition,
    },
    {
      key: "product-opportunities",
      label: "Estampas prontas",
      value: integerFormatter.format(productInsights.decisions[0]?.count ?? 0),
      description: "Itens classificados para escalar agora no hub de oferta.",
      tone: (productInsights.decisions[0]?.count ?? 0) > 0 ? "positive" : "info",
      href: APP_ROUTES.offer,
    },
  ];
}

function buildCandidateActions(
  bundle: ManagementDataBundle,
  sourceHealth: ManagementSourceHealthItem[],
): ExecutiveActionItem[] {
  const actions: ExecutiveActionItem[] = [];
  const { financial, media, traffic, productInsights, catalog, sanitization } = bundle;
  const topProduct = productInsights.hero.row;
  const catalogRisk = catalog.highlights.uncovered[0] ?? null;
  const mediaScale = media.commandRoom.bestScale;
  const mediaReview = media.commandRoom.priorityReview;

  if (financial.total.netResult < 0 || financial.total.contributionAfterMedia < 0) {
    actions.push({
      id: "cash-recover-margin",
      actionKey: "cash-recover-margin",
      domain: "cash",
      title: "Recuperar margem antes de pensar em escala",
      summary:
        "A operação está devolvendo pressão na contribuição ou no resultado final. O Atlas precisa tratar margem, CMV e gasto antes de abrir mais volume.",
      priority: "critical",
      impact: "Protege caixa e evita amplificar um recorte deficitário.",
      confidence: "high",
      status: "new",
      reviewAt: null,
      sourceRefs: [
        {
          label: "Financeiro",
          detail: `${currencyFormatter.format(financial.total.netResult)} de resultado e ${percentFormatter.format(financial.analysis.shares.variableCostShare)} de custo variável sobre a RLD.`,
          href: APP_ROUTES.finance,
        },
        {
          label: "Aquisição",
          detail: `${currencyFormatter.format(financial.total.mediaSpend)} de mídia no período.`,
          href: APP_ROUTES.acquisition,
        },
      ],
      drilldownHref: APP_ROUTES.finance,
    });
  }

  if (
    mediaReview ||
    (traffic.summary.sessions > 0 && traffic.summary.purchaseRate < 0.008) ||
    media.summary.attributedRoas < 1.8
  ) {
    actions.push({
      id: "acquisition-fix-funnel",
      actionKey: "acquisition-fix-funnel",
      domain: "acquisition",
      title: "Corrigir aquisição antes de subir verba",
      summary:
        "Há sinal de tráfego ou mídia pedindo correção. O próximo passo é isolar se o gargalo está em campanha, landing ou conversão final.",
      priority:
        mediaReview || traffic.summary.purchaseRate < 0.006 ? "high" : "medium",
      impact: "Evita gasto ineficiente e melhora a leitura de escala.",
      confidence:
        traffic.summary.sessions >= 150 || media.summary.spend > 0 ? "high" : "medium",
      status: "new",
      reviewAt: null,
      sourceRefs: [
        {
          label: "Mídia",
          detail:
            mediaReview?.summary ??
            `${media.summary.attributedRoas.toFixed(2)}x de ROAS atribuído no agregado.`,
          href: APP_ROUTES.acquisition,
        },
        {
          label: "Tráfego",
          detail: `${percentFormatter.format(traffic.summary.purchaseRate)} de sessão para compra.`,
          href: APP_ROUTES.acquisition,
        },
      ],
      drilldownHref: APP_ROUTES.acquisition,
    });
  } else if (mediaScale || traffic.analysis.topOpportunity) {
    actions.push({
      id: "acquisition-scale-winner",
      actionKey: "acquisition-scale-winner",
      domain: "acquisition",
      title: "Abrir escala seletiva na aquisição",
      summary:
        "Os sinais de mídia e tráfego mostram uma frente com qualidade suficiente para ganhar distribuição sem cegar o controle.",
      priority: "medium",
      impact: "Acelera receita preservando leitura de qualidade.",
      confidence: mediaScale ? "high" : "medium",
      status: "new",
      reviewAt: null,
      sourceRefs: [
        {
          label: "Mídia",
          detail:
            mediaScale?.summary ??
            `${media.summary.attributedRoas.toFixed(2)}x de ROAS atribuído no período.`,
          href: APP_ROUTES.acquisition,
        },
        {
          label: "Tráfego",
          detail:
            traffic.highlights.topSource?.summary ??
            "Há uma entrada do funil performando acima da média do período.",
          href: APP_ROUTES.acquisition,
        },
      ],
      drilldownHref: APP_ROUTES.acquisition,
    });
  }

  if (topProduct || catalogRisk) {
    actions.push({
      id: "offer-prioritize-portfolio",
      actionKey: "offer-prioritize-portfolio",
      domain: "offer",
      title: topProduct ? `Dar prioridade para ${topProduct.stampName}` : "Reorganizar o portfólio do recorte",
      summary:
        topProduct?.decisionSummary ??
        "O portfólio já mostra quais itens puxam ganho e quais ainda travam cobertura ou conversão.",
      priority:
        topProduct?.decision === "scale_now"
          ? "high"
          : catalogRisk
            ? "medium"
            : "low",
      impact: "Canaliza exposição para o que gera venda real e reduz ruído no catálogo.",
      confidence: topProduct ? topProduct.decisionConfidence : "medium",
      status: "new",
      reviewAt: null,
      sourceRefs: [
        {
          label: "Produto",
          detail:
            topProduct
              ? `${integerFormatter.format(topProduct.realUnitsSold)} unidades reais e ${currencyFormatter.format(topProduct.realGrossRevenue)} de receita bruta.`
              : "O Atlas identificou uma estampa com sinal de distribuição.",
          href: APP_ROUTES.offer,
        },
        {
          label: "Catálogo",
          detail:
            catalogRisk
              ? `${catalogRisk.printName} aparece com baixa cobertura ou sem venda.`
              : `${integerFormatter.format(catalog.summary.totalProducts)} produtos no catálogo ativo.`,
          href: APP_ROUTES.offer,
        },
      ],
      drilldownHref: APP_ROUTES.offer,
    });
  }

  const sourceRisk = sourceHealth.find((item) => item.status === "error");
  if (sanitization.meta.pendingCount > 0 || sourceRisk) {
    actions.push({
      id: "operations-clear-blockers",
      actionKey: "operations-clear-blockers",
      domain: "operations",
      title: "Limpar bloqueios operacionais antes de aprofundar a leitura",
      summary:
        sourceRisk?.detail ??
        `${integerFormatter.format(sanitization.meta.pendingCount)} pendência(s) ainda podem contaminar a tomada de decisão.`,
      priority: sourceRisk ? "high" : "medium",
      impact: "Aumenta a confiança do Atlas e reduz falso positivo na análise.",
      confidence: "high",
      status: "new",
      reviewAt: null,
      sourceRefs: [
        {
          label: "Operações",
          detail:
            sanitization.meta.pendingCount > 0
              ? `${integerFormatter.format(sanitization.meta.pendingCount)} pendência(s) em saneamento.`
              : "Sem pendência estrutural aberta, mas há fonte com erro de sincronização.",
          href: APP_ROUTES.operations,
        },
        {
          label: "Plataforma",
          detail:
            sourceRisk?.label ?? "Revisar integrações, acessos e parâmetros críticos da marca.",
          href: APP_ROUTES.platform,
        },
      ],
      drilldownHref: APP_ROUTES.operations,
    });
  }

  return actions.slice(0, 5);
}

function applyQueueState(actions: ExecutiveActionItem[], persisted: QueueRow[]) {
  const queueByKey = new Map(persisted.map((row) => [row.action_key, row]));

  return actions.map((action) => {
    const stored = queueByKey.get(action.actionKey);
    return stored
      ? {
          ...action,
          status: stored.status,
          reviewAt: stored.review_at ? stored.review_at.slice(0, 10) : null,
        }
      : action;
  });
}

function buildExecutiveStatus(
  bundle: ManagementDataBundle,
  actions: ExecutiveActionItem[],
): ManagementStatusCard {
  const leadAction = actions[0];
  const { financial, traffic, media } = bundle;

  if (financial.total.netResult < 0) {
    return {
      tone: "negative",
      title: "Operação pressionada",
      summary:
        "O recorte atual não sustenta escala porque o resultado final segue negativo depois de mídia, CMV e despesas.",
      highlight: `${currencyFormatter.format(financial.total.netResult)} de resultado operacional.`,
      nextMove: leadAction?.title ?? "Tratar margem e custos primeiro.",
    };
  }

  if (financial.total.contributionAfterMedia < 0 || financial.analysis.shares.variableCostShare > 0.8) {
    return {
      tone: "warning",
      title: "Margem sob pressão",
      summary:
        "A receita existe, mas a estrutura variável está comprimindo o que sobra para a operação.",
      highlight: `${percentFormatter.format(financial.analysis.shares.variableCostShare)} de custo variável sobre a RLD.`,
      nextMove: leadAction?.title ?? "Rever CMV, mídia e mix antes de abrir escala.",
    };
  }

  if (traffic.summary.purchaseRate >= 0.01 && media.summary.attributedRoas >= 2) {
    return {
      tone: "positive",
      title: "Janela favorável para escala seletiva",
      summary:
        "O Atlas encontra base suficiente entre caixa, aquisição e oferta para abrir crescimento com controle.",
      highlight: `${media.summary.attributedRoas.toFixed(2)}x de ROAS atribuído e ${percentFormatter.format(traffic.summary.purchaseRate)} de sessão para compra.`,
      nextMove: leadAction?.title ?? "Priorizar a melhor frente de oferta e aquisição.",
    };
  }

  return {
    tone: "info",
    title: "Operação em observação ativa",
    summary:
      "O recorte atual já permite decidir, mas ainda exige disciplina na prioridade para não dispersar análise.",
    highlight: `${currencyFormatter.format(financial.total.contributionAfterMedia)} de contribuição pós-mídia.`,
    nextMove: leadAction?.title ?? "Avançar pela principal decisão da fila executiva.",
  };
}

function buildCashDrivers(bundle: ManagementDataBundle): ManagementCashDrivers {
  const { financial } = bundle;
  return {
    headline:
      financial.total.netResult >= 0
        ? "Caixa e resultado sustentam a leitura"
        : "Caixa e resultado pedem correção imediata",
    summary:
      financial.total.netResult >= 0
        ? "O financeiro já mostra o que sustenta a operação e o quanto sobra depois de mídia e despesas."
        : "O financeiro mostra que o recorte ainda consome margem demais para o volume atual.",
    dominantMetric: {
      label: "Resultado operacional",
      value: currencyFormatter.format(financial.total.netResult),
      description: "Leitura final depois de CMV, mídia e despesas fixas.",
    },
    drivers: [
      {
        key: "rld",
        label: "Receita líquida disponível",
        value: currencyFormatter.format(financial.total.rld),
        summary: "Base financeira real disponível para sustentar CMV, mídia e estrutura.",
        tone: "info",
        href: APP_ROUTES.finance,
      },
      {
        key: "cmv",
        label: "CMV aplicado",
        value: currencyFormatter.format(financial.total.cmvTotal),
        summary: "Custo histórico dos itens vendidos no recorte.",
        tone: "warning",
        href: APP_ROUTES.finance,
      },
      {
        key: "fixed-expenses",
        label: "Despesas fixas",
        value: currencyFormatter.format(financial.total.fixedExpensesTotal),
        summary:
          financial.analysis.topExpenseCategory?.categoryName ??
          "Sem categoria dominante identificada.",
        tone: "neutral",
        href: APP_ROUTES.finance,
      },
      {
        key: "break-even",
        label: "Meta mensal de RLD",
        value:
          financial.total.breakEvenDisplay !== null
            ? currencyFormatter.format(financial.total.breakEvenDisplay)
            : "N/A",
        summary: financial.total.breakEvenReason,
        tone: financial.total.breakEvenDisplay !== null ? "info" : "warning",
        href: APP_ROUTES.finance,
      },
    ],
    trend: financial.months.slice(-6).map((month) => ({
      label: month.label,
      contributionAfterMedia: month.metrics.contributionAfterMedia,
      netResult: month.metrics.netResult,
    })),
  };
}

function buildAcquisitionSnapshot(
  bundle: ManagementDataBundle,
): ManagementAcquisitionSnapshot {
  const { media, traffic } = bundle;
  return {
    headline:
      media.summary.attributedRoas >= 2 && traffic.summary.purchaseRate >= 0.01
        ? "Aquisição com qualidade para expansão controlada"
        : "Aquisição ainda pede ajuste fino de eficiência",
    summary:
      `${media.analysis.narrativeBody} ${traffic.analysis.narrativeBody}`,
    topOpportunity: traffic.analysis.topOpportunity ?? media.analysis.topOpportunity,
    topRisk: media.analysis.topRisk ?? traffic.analysis.topRisk,
    drivers: [
      {
        key: "meta-roas",
        label: "ROAS Meta atribuído",
        value: `${media.summary.attributedRoas.toFixed(2)}x`,
        summary: "Leitura da plataforma para decidir verba e campanha. Não substitui o financeiro.",
        tone: media.summary.attributedRoas >= 2 ? "positive" : "warning",
        href: APP_ROUTES.acquisition,
      },
      {
        key: "sessions",
        label: "Sessões do funil",
        value: integerFormatter.format(traffic.summary.sessions),
        summary: "Volume disponível para validar canal, landing e monetização.",
        tone: traffic.summary.sessions > 0 ? "info" : "neutral",
        href: APP_ROUTES.acquisition,
      },
      {
        key: "purchase-rate",
        label: "Sessão para compra",
        value: percentFormatter.format(traffic.summary.purchaseRate),
        summary: traffic.signals.purchaseRate.description,
        tone: traffic.summary.purchaseRate >= 0.01 ? "positive" : "warning",
        href: APP_ROUTES.acquisition,
      },
      {
        key: "top-campaign",
        label: "Campanha em foco",
        value: media.highlights.topCampaignBySpend?.campaignName ?? "Sem campanha dominante",
        summary:
          media.highlights.topCampaignBySpend?.summary ??
          "Abra o hub para validar a campanha mais relevante do período.",
        tone: media.commandRoom.priorityReview ? "warning" : "info",
        href: APP_ROUTES.acquisition,
      },
    ],
    trend: media.dailySeries.map((point) => ({
      date: point.date,
      spend: point.spend,
      attributedRevenue: point.purchaseValue,
      sessions:
        traffic.dailySeries.find((trafficPoint) => trafficPoint.date === point.date)?.sessions ?? 0,
      purchaseRevenue:
        traffic.dailySeries.find((trafficPoint) => trafficPoint.date === point.date)
          ?.purchaseRevenue ?? 0,
    })),
  };
}

function buildOfferSnapshot(bundle: ManagementDataBundle): ManagementOfferSnapshot {
  const { sales, productInsights, catalog } = bundle;
  return {
    headline:
      productInsights.analysis.topOpportunity || catalog.highlights.topSellers[0]
        ? "Oferta com oportunidade clara de priorização"
        : "Oferta ainda consolidando sinal suficiente",
    summary:
      `${sales.analysis.narrativeBody} ${productInsights.analysis.narrativeBody}`,
    topOpportunity:
      productInsights.analysis.topOpportunity ?? catalog.analysis.topOpportunity,
    topRisk: productInsights.analysis.topRisk ?? catalog.analysis.topRisk,
    drivers: [
      {
        key: "top-product",
        label: "Produto líder",
        value:
          sales.highlights.topProduct?.productName ??
          productInsights.hero.row?.stampName ??
          "Sem líder dominante",
        summary:
          sales.highlights.topProduct
            ? `${integerFormatter.format(sales.highlights.topProduct.quantity)} unidades e ${currencyFormatter.format(sales.highlights.topProduct.grossRevenue)} de receita bruta.`
            : "O recorte ainda não consolidou um vencedor dominante.",
        tone: sales.highlights.topProduct ? "positive" : "neutral",
        href: APP_ROUTES.offer,
      },
      {
        key: "portfolio-scale",
        label: "Estampas para escalar",
        value: integerFormatter.format(productInsights.decisions[0]?.count ?? 0),
        summary: "Itens classificados para escalar agora no recorte atual.",
        tone: (productInsights.decisions[0]?.count ?? 0) > 0 ? "positive" : "info",
        href: APP_ROUTES.offer,
      },
      {
        key: "catalog-coverage",
        label: "Cobertura do catálogo",
        value: integerFormatter.format(catalog.summary.productsWithGallery),
        summary: `${integerFormatter.format(catalog.summary.totalProducts)} produtos ativos com leitura de galeria.`,
        tone: catalog.summary.productsWithGallery > 0 ? "info" : "warning",
        href: APP_ROUTES.offer,
      },
      {
        key: "real-units",
        label: "Unidades reais",
        value: integerFormatter.format(productInsights.overview.totalRealUnitsSold),
        summary: "Venda real cruzada com os sinais de produto para priorização.",
        tone: productInsights.overview.totalRealUnitsSold > 0 ? "positive" : "neutral",
        href: APP_ROUTES.offer,
      },
    ],
    topProducts: [
      ...(productInsights.featured.slice(0, 2).map((row) => ({
        label: row.stampName,
        value: `${integerFormatter.format(row.realUnitsSold)} unidades`,
        summary: row.decisionSummary,
      })) ?? []),
      ...(catalog.highlights.topSellers.slice(0, 1).map((row) => ({
        label: row.printName,
        value: `${integerFormatter.format(row.unitsSold)} unidades`,
        summary: "Produto do catálogo com maior venda no período.",
      })) ?? []),
    ].slice(0, 3),
  };
}

function buildOperationalRisks(
  bundle: ManagementDataBundle,
  sourceHealth: ManagementSourceHealthItem[],
): ManagementOperationalRisks {
  const risks: ManagementRiskItem[] = [];
  const sourceError = sourceHealth.find((item) => item.status === "error");

  if (bundle.sanitization.meta.pendingCount > 0) {
    risks.push({
      key: "sanitization",
      title: "Saneamento ainda aberto",
      summary: `${integerFormatter.format(bundle.sanitization.meta.pendingCount)} pendência(s) seguem aguardando decisão operacional.`,
      tone: "warning",
      href: APP_ROUTES.operations,
    });
  }

  if (sourceError) {
    risks.push({
      key: "integration-error",
      title: `${sourceError.label} com erro recente`,
      summary: sourceError.detail,
      tone: "negative",
      href: APP_ROUTES.platform,
    });
  }

  if (!risks.length) {
    risks.push({
      key: "operations-clear",
      title: "Base operacional estável",
      summary: "Não há bloqueio estrutural dominante contaminando a leitura gerencial do período.",
      tone: "positive",
      href: APP_ROUTES.operations,
    });
  }

  return {
    headline:
      risks[0]?.tone === "positive"
        ? "Operação sem bloqueio dominante"
        : "Riscos operacionais que precisam entrar na fila",
    summary:
      risks[0]?.tone === "positive"
        ? "A base operacional não é o principal gargalo desta janela."
        : "Antes de aprofundar a análise, corrija os bloqueios que reduzem a confiança do Atlas.",
    items: risks,
  };
}

function buildEvidenceLinks(): ManagementEvidenceLink[] {
  return [
    {
      label: "Financeiro",
      href: APP_ROUTES.finance,
      summary: "DRE, margem, CMV e despesas da verdade financeira.",
    },
    {
      label: "Aquisição",
      href: APP_ROUTES.acquisition,
      summary: "Mídia, tráfego e funil como fonte de auditoria da aquisição.",
    },
    {
      label: "Oferta",
      href: APP_ROUTES.offer,
      summary: "Vendas, produto e catálogo como auditoria do portfólio.",
    },
    {
      label: "Operações",
      href: APP_ROUTES.operations,
      summary: "Integrações, importação e saneamento da base.",
    },
  ];
}

async function loadManagementBundle(
  supabase: SupabaseClient,
  brandId: string,
  from?: string | null,
  to?: string | null,
): Promise<ManagementDataBundle> {
  const [brandName, integrations] = await Promise.all([
    loadBrandName(supabase, brandId),
    loadIntegrations(supabase, brandId),
  ]);

  const [financial, media, traffic, sales, productInsights, catalog, sanitization] =
    await Promise.all([
      loadFinancialReport(supabase, brandId, from, to),
      loadMediaReport(supabase, brandId, integrations, from, to),
      loadTrafficReport(supabase, brandId, from, to),
      loadSalesReport(supabase, brandId, from, to),
      loadProductInsightsReport(supabase, brandId, from, to),
      loadCatalogReport(supabase, brandId, from, to),
      loadSanitizationReport(supabase, brandId),
    ]);

  return {
    context: buildContext(
      brandId,
      brandName,
      { financial, media, traffic, productInsights, catalog, sales, sanitization },
      from,
      to,
    ),
    integrations,
    financial,
    media,
    traffic,
    sales,
    productInsights,
    catalog,
    sanitization,
  };
}

function buildSnapshotFromBundle(
  bundle: ManagementDataBundle,
  queueRows: QueueRow[],
): ManagementSnapshotV2 {
  const sourceHealth = buildSourceHealth(bundle.integrations, bundle);
  const decisionQueue = applyQueueState(buildCandidateActions(bundle, sourceHealth), queueRows);

  return {
    context: bundle.context,
    sourceHealth,
    kpiDock: buildKpiDock(bundle),
    executiveStatus: buildExecutiveStatus(bundle, decisionQueue),
    decisionQueue,
    cashDrivers: buildCashDrivers(bundle),
    acquisitionSnapshot: buildAcquisitionSnapshot(bundle),
    offerSnapshot: buildOfferSnapshot(bundle),
    operationalRisks: buildOperationalRisks(bundle, sourceHealth),
    evidenceLinks: buildEvidenceLinks(),
  };
}

export async function buildManagementSnapshotV2(
  supabase: SupabaseClient,
  brandId: string,
  from?: string | null,
  to?: string | null,
) {
  const bundle = await loadManagementBundle(supabase, brandId, from, to);
  const queueRows = await loadQueueRows(supabase, brandId, from, to);
  return buildSnapshotFromBundle(bundle, queueRows);
}

export async function buildFinanceHubReport(
  supabase: SupabaseClient,
  brandId: string,
  from?: string | null,
  to?: string | null,
): Promise<FinanceHubReport> {
  const bundle = await loadManagementBundle(supabase, brandId, from, to);
  const queueRows = await loadQueueRows(supabase, brandId, from, to);
  const snapshot = buildSnapshotFromBundle(bundle, queueRows);

  return {
    context: snapshot.context,
    sourceHealth: snapshot.sourceHealth.filter((item) =>
      ["ink", "meta", "ops"].includes(item.key),
    ),
    executiveStatus: snapshot.executiveStatus,
    kpiDock: snapshot.kpiDock.filter((item) =>
      ["net-result", "contribution", "roas-gross", "media-spend"].includes(item.key),
    ),
    priorities: snapshot.decisionQueue.filter((item) => item.domain === "cash").slice(0, 3),
    overview: snapshot.cashDrivers,
    financial: bundle.financial,
    sales: bundle.sales,
    evidenceLinks: snapshot.evidenceLinks,
  };
}

export async function buildAcquisitionHubReport(
  supabase: SupabaseClient,
  brandId: string,
  from?: string | null,
  to?: string | null,
): Promise<AcquisitionHubReport> {
  const bundle = await loadManagementBundle(supabase, brandId, from, to);
  const queueRows = await loadQueueRows(supabase, brandId, from, to);
  const snapshot = buildSnapshotFromBundle(bundle, queueRows);

  return {
    context: snapshot.context,
    sourceHealth: snapshot.sourceHealth.filter((item) =>
      ["meta", "ga4", "ops"].includes(item.key),
    ),
    executiveStatus: snapshot.executiveStatus,
    kpiDock: snapshot.kpiDock.filter((item) =>
      ["media-spend", "sessions"].includes(item.key),
    ),
    priorities: snapshot.decisionQueue
      .filter((item) => item.domain === "acquisition" || item.domain === "operations")
      .slice(0, 4),
    overview: snapshot.acquisitionSnapshot,
    media: bundle.media,
    traffic: bundle.traffic,
    evidenceLinks: snapshot.evidenceLinks,
  };
}

export async function buildOfferHubReport(
  supabase: SupabaseClient,
  brandId: string,
  from?: string | null,
  to?: string | null,
): Promise<OfferHubReport> {
  const bundle = await loadManagementBundle(supabase, brandId, from, to);
  const queueRows = await loadQueueRows(supabase, brandId, from, to);
  const snapshot = buildSnapshotFromBundle(bundle, queueRows);

  return {
    context: snapshot.context,
    sourceHealth: snapshot.sourceHealth.filter((item) =>
      ["ink", "catalog", "ops"].includes(item.key),
    ),
    executiveStatus: snapshot.executiveStatus,
    kpiDock: snapshot.kpiDock.filter((item) =>
      ["product-opportunities"].includes(item.key),
    ),
    priorities: snapshot.decisionQueue
      .filter((item) => item.domain === "offer" || item.domain === "operations")
      .slice(0, 4),
    overview: snapshot.offerSnapshot,
    sales: bundle.sales,
    productInsights: bundle.productInsights,
    catalog: bundle.catalog,
    evidenceLinks: snapshot.evidenceLinks,
  };
}

export async function upsertExecutiveActionQueue(
  supabase: SupabaseClient,
  input: {
    brandId: string;
    userId: string;
    actionKey: string;
    domain: ExecutiveActionItem["domain"];
    status: ExecutiveActionStatus;
    reviewAt?: string | null;
    from?: string | null;
    to?: string | null;
  },
) {
  const { error } = await supabase.from("atlas_executive_action_queue").upsert(
    {
      brand_id: input.brandId,
      action_key: input.actionKey,
      period_key: periodKey(input.from, input.to),
      period_from: input.from ?? null,
      period_to: input.to ?? null,
      domain: input.domain,
      status: input.status,
      review_at: input.reviewAt ?? null,
      created_by: input.userId,
      updated_by: input.userId,
    },
    {
      onConflict: "brand_id,period_key,action_key",
    },
  );

  if (error) {
    if (isMissingExecutiveQueueTable(error)) {
      throw new Error(
        "A fila executiva ainda não está persistida neste ambiente. Aplique a migration 20260422110001_brandops_executive_action_queue.sql no Supabase remoto para liberar esse recurso.",
      );
    }

    throw error;
  }
}
