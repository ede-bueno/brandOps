import { NextResponse } from "next/server";
import { requireBrandAccess } from "@/lib/brandops/admin";
import { buildSanitizationReport } from "@/lib/brandops/server/sanitization-report";
import type {
  BrandDataset,
  MediaRow,
  PaidOrder,
  SanitizationReview,
} from "@/lib/brandops/types";

const PAGE_SIZE = 1000;

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

function mapOrder(row: {
  id: string;
  order_number: string;
  order_date: string;
  payment_method: string | null;
  payment_status: string | null;
  customer_name: string | null;
  items_in_order: number | null;
  gross_revenue: number | null;
  net_revenue: number | null;
  discount: number | null;
  commission_value: number | null;
  source: string | null;
  tracking_url: string | null;
  shipping_state: string | null;
  coupon_name: string | null;
  is_ignored: boolean | null;
  ignore_reason: string | null;
  sanitization_status: "PENDING" | "KEPT" | "IGNORED" | null;
  sanitization_note: string | null;
  sanitized_at: string | null;
  sanitized_by: string | null;
}): PaidOrder {
  return {
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
    sanitizationStatus: row.sanitization_status ?? "PENDING",
    sanitizationNote: row.sanitization_note ?? null,
    sanitizedAt: row.sanitized_at ?? null,
    sanitizedBy: row.sanitized_by ?? null,
  };
}

function mapMediaRow(row: {
  id: string;
  report_start: string | null;
  report_end: string | null;
  row_hash: string | null;
  campaign_name: string | null;
  adset_name: string | null;
  account_name: string | null;
  ad_name: string | null;
  platform: string | null;
  placement: string | null;
  device_platform: string | null;
  delivery: string | null;
  reach: number | null;
  impressions: number | null;
  clicks_all: number | null;
  spend: number | null;
  purchases: number | null;
  conversion_value: number | null;
  link_clicks: number | null;
  ctr_all: number | null;
  ctr_link: number | null;
  add_to_cart: number | null;
  is_ignored: boolean | null;
  ignore_reason: string | null;
  sanitization_status: "PENDING" | "KEPT" | "IGNORED" | null;
  sanitization_note: string | null;
  sanitized_at: string | null;
  sanitized_by: string | null;
}): MediaRow {
  return {
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
    sanitizationStatus: row.sanitization_status ?? "PENDING",
    sanitizationNote: row.sanitization_note ?? null,
    sanitizedAt: row.sanitized_at ?? null,
    sanitizedBy: row.sanitized_by ?? null,
    dataSource: row.delivery?.toLowerCase() === "api" ? "api" : "manual_csv",
  };
}

function mapReview(row: {
  id: string;
  source_table: "media_performance" | "orders" | "order_items";
  source_row_id: string;
  source_key: string | null;
  anomaly_type: string;
  action: "PENDING" | "KEPT" | "IGNORED";
  reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string;
}): SanitizationReview {
  return {
    id: row.id,
    sourceTable: row.source_table,
    sourceRowId: row.source_row_id,
    sourceKey: row.source_key ?? null,
    anomalyType: row.anomaly_type,
    action: row.action,
    reason: row.reason ?? null,
    reviewedBy: row.reviewed_by ?? null,
    reviewedAt: row.reviewed_at,
  };
}

function buildBrandDatasetSkeleton(
  brandId: string,
  paidOrders: PaidOrder[],
  media: MediaRow[],
  sanitizationReviews: SanitizationReview[],
): BrandDataset {
  return {
    id: brandId,
    name: "",
    createdAt: "",
    updatedAt: "",
    hydration: {
      catalogLoaded: false,
      salesLinesLoaded: false,
      ga4ItemDailyLoaded: false,
    },
    files: {},
    catalog: [],
    paidOrders,
    salesLines: [],
    orderItems: [],
    media,
    cmvEntries: [],
    cmvCheckpoints: [],
    expenseCategories: [],
    expenses: [],
    integrations: [],
    ga4DailyPerformance: [],
    ga4ItemDailyPerformance: [],
    sanitizationReviews,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ brandId: string }> },
) {
  try {
    const { brandId } = await params;
    const { supabase } = await requireBrandAccess(request, brandId);

    const [orders, media, reviews] = await Promise.all([
      fetchAllRows(async (from, to) =>
        supabase
          .from("orders")
          .select(
            "id, order_number, order_date, payment_method, payment_status, customer_name, items_in_order, gross_revenue, net_revenue, discount, commission_value, source, tracking_url, shipping_state, coupon_name, is_ignored, ignore_reason, sanitization_status, sanitization_note, sanitized_at, sanitized_by",
          )
          .eq("brand_id", brandId)
          .range(from, to),
      ),
      fetchAllRows(async (from, to) =>
        supabase
          .from("media_performance")
          .select(
            "id, report_start, report_end, row_hash, campaign_name, adset_name, account_name, ad_name, platform, placement, device_platform, delivery, reach, impressions, clicks_all, spend, purchases, conversion_value, link_clicks, ctr_all, ctr_link, add_to_cart, is_ignored, ignore_reason, sanitization_status, sanitization_note, sanitized_at, sanitized_by",
          )
          .eq("brand_id", brandId)
          .range(from, to),
      ),
      fetchAllRows(async (from, to) =>
        supabase
          .from("anomaly_reviews")
          .select("id, source_table, source_row_id, source_key, anomaly_type, action, reason, reviewed_by, reviewed_at")
          .eq("brand_id", brandId)
          .in("source_table", ["media_performance", "orders"])
          .range(from, to),
      ),
    ]);

    const dataset = buildBrandDatasetSkeleton(
      brandId,
      orders.map(mapOrder),
      media.map(mapMediaRow),
      reviews.map(mapReview),
    );

    return NextResponse.json(buildSanitizationReport(dataset));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível montar o relatório de saneamento.",
      },
      { status: 400 },
    );
  }
}
