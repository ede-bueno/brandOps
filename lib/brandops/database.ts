import { parseUploadedCsv } from "@/lib/brandops/csv";
import { supabase } from "@/lib/supabase";
import {
  ingestMetaRaw,
  ingestOrderLines,
  ingestOrdersPaid,
  type MetaRowPayload,
  type OrderLinePayload,
  type OrderPayload,
} from "@/lib/brandops/canonical-ingest";
import type {
  BrandExpense,
  BrandDataset,
  CatalogProduct,
  CmvCheckpoint,
  CmvMatchType,
  CsvFileKind,
  ExpenseCategory,
  ImportedFileInfo,
  MediaRow,
  OrderItem,
  PaidOrder,
  SalesLine,
  UserProfile,
} from "./types";

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
  }>,
): Partial<Record<CsvFileKind, ImportedFileInfo>> {
  return rows.reduce((acc, row) => {
    const kind = row.file_type as CsvFileKind;
    if (acc[kind]) {
      return acc;
    }
    acc[kind] = {
      kind,
      fileName: row.file_name,
      importedAt: row.created_at,
      rowCount: row.records_processed ?? 0,
    };
    return acc;
  }, {} as Partial<Record<CsvFileKind, ImportedFileInfo>>);
}

export async function fetchUserProfile(userId: string) {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, email, full_name, role")
    .eq("id", userId)
    .single();

  if (error) {
    throw error;
  }

  return {
    id: data.id,
    email: data.email,
    fullName: data.full_name,
    role: data.role,
  } satisfies UserProfile;
}

export async function fetchAccessibleBrands() {
  const { data, error } = await supabase
    .from("brands")
    .select("id, name, created_at, updated_at")
    .order("name");

  if (error) {
    throw error;
  }

  return data;
}

export async function fetchBrandDataset(brandId: string) {
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
    importLogsResult,
  ] = await Promise.all([
    supabase
      .from("brands")
      .select("id, name, created_at, updated_at")
      .eq("id", brandId)
      .single(),
    fetchAllRows(async (from, to) =>
      supabase
        .from("products")
        .select("sku, title, image_url, product_url, price, sale_price, attributes")
        .eq("brand_id", brandId)
        .range(from, to),
    ),
    fetchAllRows(async (from, to) =>
      supabase
        .from("orders")
        .select(
          "id, order_number, order_date, payment_method, payment_status, customer_name, items_in_order, net_revenue, discount, commission_value, source, tracking_url, shipping_state, coupon_name, is_ignored, ignore_reason",
        )
        .eq("brand_id", brandId)
        .range(from, to),
    ),
    fetchAllRows(async (from, to) =>
      supabase
        .from("order_items")
        .select(
          "id, order_number, order_date, customer_name, sku, product_name, product_specs, product_type, quantity, gross_value, unit_price, cmv_unit_applied, cmv_total_applied, cmv_rule_type, cmv_rule_label, is_ignored, ignore_reason",
        )
        .eq("brand_id", brandId)
        .range(from, to),
    ),
    fetchAllRows(async (from, to) =>
      supabase
        .from("sales_lines")
        .select(
          "id, order_number, order_date, product_id, product_name, quantity, unit_price, order_discount_value, shipping_value, order_status, sku, is_ignored, ignore_reason",
        )
        .eq("brand_id", brandId)
        .range(from, to),
    ),
    fetchAllRows(async (from, to) =>
      supabase
        .from("media_performance")
        .select(
          "id, date, campaign_name, adset_name, account_name, ad_name, platform, placement, device_platform, delivery, reach, impressions, clicks_all, spend, purchases, conversion_value, link_clicks, ctr_all, ctr_link, add_to_cart, is_ignored, ignore_reason",
        )
        .eq("brand_id", brandId)
        .range(from, to),
    ),
    fetchAllRows(async (from, to) =>
      supabase
        .from("cmv_history")
        .select("id, match_type, match_value, match_label, cmv_unit, source, valid_from, updated_at")
        .eq("brand_id", brandId)
        .is("valid_to", null)
        .range(from, to),
    ),
    fetchAllRows(async (from, to) =>
      supabase
        .from("cmv_checkpoints")
        .select("id, created_at, note, items_updated, unmatched_items")
        .eq("brand_id", brandId)
        .order("created_at", { ascending: false })
        .range(from, to),
    ),
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
    fetchAllRows(async (from, to) =>
      supabase
        .from("import_logs")
        .select("file_type, file_name, created_at, records_processed")
        .eq("brand_id", brandId)
        .eq("status", "SUCCESS")
        .order("created_at", { ascending: false })
        .range(from, to),
    ),
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

  const catalog: CatalogProduct[] =
    productsResult.map((row) => ({
      id: row.sku,
      title: row.title,
      imageUrl: row.image_url,
      link: row.product_url,
      price: Number(row.price ?? 0),
      salePrice: row.sale_price === null ? null : Number(row.sale_price),
      description: row.attributes?.description,
      brand: row.attributes?.brand,
      color: row.attributes?.color,
      gender: row.attributes?.gender,
      material: row.attributes?.material,
      size: row.attributes?.size,
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
      orderValue: Number(row.net_revenue ?? 0),
      discountValue: Number(row.discount ?? 0),
      commissionValue: Number(row.commission_value ?? 0),
      couponName: row.coupon_name ?? null,
      source: row.source ?? "",
      trackingUrl: row.tracking_url ?? undefined,
      shippingState: row.shipping_state ?? undefined,
      isIgnored: Boolean(row.is_ignored),
      ignoreReason: row.ignore_reason ?? null,
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
      date: row.date,
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

  return {
    id: brandResult.data.id,
    name: brandResult.data.name,
    createdAt: brandResult.data.created_at,
    updatedAt: brandResult.data.updated_at,
    files: mapLatestImportFiles(importLogsResult),
    catalog,
    paidOrders,
    orderItems,
    salesLines,
    media,
    cmvEntries,
    cmvCheckpoints,
    expenseCategories,
    expenses,
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
  fileInfo: ImportedFileInfo,
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
  fileInfo: ImportedFileInfo,
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

async function replaceProducts(
  brandId: string,
  catalog: CatalogProduct[],
) {
  const rows = dedupeByKey(
    catalog.map((product) => ({
      brand_id: brandId,
      sku: product.id,
      title: product.title,
      price: product.price,
      sale_price: product.salePrice,
      image_url: product.imageUrl,
      product_url: product.link,
      attributes: {
        description: product.description,
        brand: product.brand,
        color: product.color,
        gender: product.gender,
        material: product.material,
        size: product.size,
      },
    })),
    (row) => [row.brand_id, row.sku].join("::"),
  );

  const { error: deleteError } = await supabase
    .from("products")
    .delete()
    .eq("brand_id", brandId);
  if (deleteError) {
    throw deleteError;
  }

  if (rows.length) {
    for (const chunk of chunkArray(rows)) {
      const { error } = await supabase
        .from("products")
        .upsert(chunk, { onConflict: "brand_id,sku" });
      if (error) {
        throw error;
      }
    }
  }

  return rows.length;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function upsertOrders(
  brandId: string,
  paidOrders: PaidOrder[],
) {
  const rows = dedupeByKey(
    paidOrders.map((order) => ({
      brand_id: brandId,
      order_number: order.orderNumber,
      order_date: toIsoTimestamp(order.orderDate),
      customer_name: order.customerName,
      gross_revenue: order.orderValue + order.discountValue,
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
      is_ignored: false,
      ignore_reason: null,
    })),
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    .select("id, order_number")
    .eq("brand_id", brandId)
    .in("order_number", orderNumbers);

  if (ordersError) {
    throw ordersError;
  }

  const orderMap = new Map(orders.map((row) => [row.order_number, row.id]));
  if (!orderItems.every((item) => orderMap.has(item.orderNumber))) {
    throw new Error(
      "Importe Lista de Pedidos.csv antes de Lista de Itens.csv para vincular os pedidos.",
    );
  }

  const rowsToInsert = rows.map((item) => ({
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
    is_ignored: false,
    ignore_reason: null,
  }));

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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  for (const chunk of chunkArray(rows)) {
    const { error } = await supabase.from("sales_lines").insert(chunk);
    if (error) {
      throw error;
    }
  }

  return rows.length;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function replaceMedia(
  brandId: string,
  media: MediaRow[],
) {
  const rows = dedupeByKey(
    media.map((row) => ({
      brand_id: brandId,
      date: row.date,
      campaign_name: row.campaignName,
      adset_name: row.adsetName,
      account_name: row.accountName,
      ad_name: row.adName,
      platform: row.platform,
      placement: row.placement,
      device_platform: row.devicePlatform,
      delivery: row.delivery,
      spend: row.spend,
      impressions: row.impressions,
      reach: row.reach,
      clicks: row.linkClicks || row.clicksAll,
      clicks_all: row.clicksAll,
      purchases: row.purchases,
      conversion_value: row.purchaseValue,
      link_clicks: row.linkClicks,
      ctr_all: row.ctrAll,
      ctr_link: row.ctrLink,
      add_to_cart: row.addToCart,
      currency: "BRL",
      is_ignored: false,
    })),
    (row) =>
      [
        row.brand_id,
        row.date,
        row.campaign_name,
        row.adset_name,
        row.ad_name,
        row.platform,
        row.placement,
        row.device_platform,
      ].join("::"),
  );

  const { error: deleteError } = await supabase
    .from("media_performance")
    .delete()
    .eq("brand_id", brandId);
  if (deleteError) {
    throw deleteError;
  }

  for (const chunk of chunkArray(rows)) {
    const { error } = await supabase
      .from("media_performance")
      .upsert(chunk, {
        onConflict:
          "brand_id,date,campaign_name,adset_name,ad_name,platform,placement,device_platform",
      });
    if (error) {
      throw error;
    }
  }

  return rows.length;
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
        await runImportBlock(brandId, userId, parsed.fileInfo, async () => {
          const orderPayloads: OrderPayload[] = paidOrders.map((order) => ({
            order_number: order.orderNumber,
            order_date: toIsoTimestamp(order.orderDate) ?? new Date().toISOString(),
            customer_name: order.customerName,
            payment_method: order.paymentMethod,
            net_revenue: order.orderValue,
            discount: order.discountValue,
            items_in_order: order.itemsInOrder,
            coupon_name: order.couponName ?? undefined,
            shipping_state: order.shippingState,
            tracking_url: order.trackingUrl,
          }));
          const result = await ingestOrdersPaid(brandId, orderPayloads);
          return result.inserted + (result.updated ?? 0);
        });
        break;
      }

      // --- Lista de Itens: itens reais com CMV resolvido no banco (§7)
      case "lista_itens": {
        const orderItems = parsed.payload.orderItems ?? [];
        await runImportBlock(brandId, userId, parsed.fileInfo, async () => {
          const linePayloads: OrderLinePayload[] = orderItems.map((item) => ({
            order_number: item.orderNumber,
            order_date: toIsoTimestamp(item.orderDate) ?? new Date().toISOString(),
            customer_name: item.customerName,
            product_name: item.productName,
            product_specs: item.productSpecs,
            sku: deriveOrderItemsSku(item),
            quantity: item.quantity,
            unit_price: item.quantity ? item.grossValue / item.quantity : (item.grossValue ?? 0),
          }));
          const result = await ingestOrderLines(brandId, linePayloads);
          return result.inserted;
        });
        break;
      }

      // --- Pedidos Pagos (CSV alternativo financeiro): tratado como ingestão de pedidos
      case "pedidos_pagos": {
        const salesLines = parsed.payload.salesLines ?? [];
        await runImportBlock(brandId, userId, parsed.fileInfo, async () => {
          const linePayloads: OrderLinePayload[] = salesLines.map((line) => ({
            order_number: line.orderNumber,
            order_date: toIsoTimestamp(line.orderDate) ?? new Date().toISOString(),
            product_name: line.productName,
            sku: line.sku ?? undefined,
            quantity: line.quantity,
            unit_price: line.unitPrice,
          }));
          const result = await ingestOrderLines(brandId, linePayloads);
          return result.inserted;
        });
        break;
      }

      // --- Meta Export: ingestão idempotente com hash por campanha+data (§8)
      case "meta": {
        const mediaRows = parsed.payload.media ?? [];
        await runImportBlock(brandId, userId, parsed.fileInfo, async () => {
          const metaPayloads: MetaRowPayload[] = mediaRows.map((row) => ({
            report_start: row.date,
            report_end: row.date,
            campaign_name: row.campaignName,
            adset_name: row.adsetName,
            ad_name: row.adName,
            account_name: row.accountName,
            impressions: row.impressions,
            clicks_all: row.clicksAll,
            link_clicks: row.linkClicks,
            spend: row.spend,
            purchases: row.purchases,
            revenue: row.purchaseValue,
            ctr_all: row.ctrAll,
            ctr_link: row.ctrLink,
          }));
          const result = await ingestMetaRaw(brandId, metaPayloads);
          return result.inserted + (result.updated ?? 0);
        });
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

export async function setMediaIgnoreState(
  mediaRowId: string,
  isIgnored: boolean,
  reason?: string,
) {
  const { data, error } = await supabase.rpc("set_media_row_ignore_state", {
    p_row_id: mediaRowId,
    p_is_ignored: isIgnored,
    p_reason: reason ?? null,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function setOrderIgnoreState(
  brandId: string,
  orderNumber: string,
  isIgnored: boolean,
  reason?: string,
) {
  const { data, error } = await supabase.rpc("set_order_ignore_state", {
    p_brand_id: brandId,
    p_order_number: orderNumber,
    p_is_ignored: isIgnored,
    p_reason: reason ?? null,
  });

  if (error) {
    throw error;
  }

  return data;
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
