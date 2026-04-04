import { NextResponse } from "next/server";
import { requireBrandAccess } from "@/lib/brandops/admin";
import {
  buildProductInsightsReport,
} from "@/lib/brandops/server/product-insights";
import type {
  Ga4ItemDailyPerformanceRow,
  OrderItem,
  ProductDecisionAction,
  ProductInsightClassification,
  ProductInsightSort,
} from "@/lib/brandops/types";

function parseDateParam(value: string | null) {
  if (!value) {
    return null;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function parseDecisionParam(value: string | null): ProductDecisionAction | "all" | null {
  if (!value) {
    return null;
  }

  if (value === "all") {
    return value;
  }

  return value === "scale_now" || value === "boost_traffic" || value === "review_listing" || value === "watch"
    ? value
    : null;
}

function parseClassificationParam(value: string | null): ProductInsightClassification | "all" | null {
  if (!value) {
    return null;
  }

  if (value === "all") {
    return value;
  }

  return value === "validated" || value === "opportunity" || value === "low_traffic" || value === "review"
    ? value
    : null;
}

function parseSortParam(value: string | null): ProductInsightSort | null {
  if (!value) {
    return null;
  }

  return value === "priority" ||
    value === "views" ||
    value === "addToCartRate" ||
    value === "realUnitsSold" ||
    value === "viewGrowth"
    ? value
    : null;
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
  const dayCount = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1,
  );

  const previousEnd = new Date(start);
  previousEnd.setDate(previousEnd.getDate() - 1);
  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousStart.getDate() - (dayCount - 1));

  return {
    from: previousStart.toISOString().slice(0, 10),
    to: previousEnd.toISOString().slice(0, 10),
  };
}

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

function mapGa4ItemSummaryRow(
  row: ProductInsightsBaseRow,
  date: string,
): Ga4ItemDailyPerformanceRow {
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

function mapGa4ItemTrendRow(row: ProductInsightsTrendRow): Ga4ItemDailyPerformanceRow {
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

async function resolveCurrentWindow(
  supabase: Awaited<ReturnType<typeof requireBrandAccess>>["supabase"],
  brandId: string,
  from: string | null,
  to: string | null,
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

function mapOrderItem(row: {
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ brandId: string }> },
) {
  try {
    const { brandId } = await params;
    const { supabase } = await requireBrandAccess(request, brandId);
    const url = new URL(request.url);
    const from = parseDateParam(url.searchParams.get("from"));
    const to = parseDateParam(url.searchParams.get("to"));
    const decision = parseDecisionParam(url.searchParams.get("decision"));
    const classification = parseClassificationParam(url.searchParams.get("classification"));
    const productType = url.searchParams.get("productType")?.trim() || null;
    const sort = parseSortParam(url.searchParams.get("sort"));

    const currentWindow = await resolveCurrentWindow(supabase, brandId, from, to);
    const previousWindow = resolvePreviousWindow(currentWindow);

    const [{ data: currentBaseRows, error: currentBaseError }, { data: currentTrendRows, error: currentTrendError }] =
      await Promise.all([
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
      ]);

    if (currentBaseError) {
      throw currentBaseError;
    }

    if (currentTrendError) {
      throw currentTrendError;
    }

    const previousResult =
      previousWindow.from && previousWindow.to
        ? await supabase.rpc("get_product_insights_base", {
            p_brand_id: brandId,
            p_from: previousWindow.from,
            p_to: previousWindow.to,
          })
        : { data: [], error: null };

    if (previousResult.error) {
      throw previousResult.error;
    }

    const { data: orderSignalRows, error: orderSignalError } = await supabase.rpc(
      "get_product_order_signals",
      {
        p_brand_id: brandId,
        p_from: from,
        p_to: to,
      },
    );

    if (orderSignalError) {
      throw orderSignalError;
    }

    const currentRows = (currentBaseRows ?? []).map((row: ProductInsightsBaseRow) =>
      mapGa4ItemSummaryRow(row, currentWindow.to ?? currentWindow.from ?? "1900-01-01"),
    );
    const trendRows = (currentTrendRows ?? []).map((row: ProductInsightsTrendRow) =>
      mapGa4ItemTrendRow(row),
    );

    return NextResponse.json(
      buildProductInsightsReport(
        trendRows.length ? trendRows : currentRows,
        (orderSignalRows ?? []).map(mapOrderItem),
        (previousResult.data ?? []).map((row: ProductInsightsBaseRow) =>
          mapGa4ItemSummaryRow(
            row,
            previousWindow.to ?? previousWindow.from ?? "1900-01-01",
          ),
        ),
        {
          from,
          to,
          decision,
          classification,
          productType: productType || null,
          sort,
        },
      ));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível montar o relatório de insights de produtos.",
      },
      { status: 400 },
    );
  }
}
