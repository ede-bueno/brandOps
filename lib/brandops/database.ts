import { parseUploadedCsv } from "@/lib/brandops/csv";
import { supabase } from "@/lib/supabase";
import type {
  BrandDataset,
  CatalogProduct,
  CsvFileKind,
  ImportedFileInfo,
  MediaRow,
  OrderItem,
  PaidOrder,
  SalesLine,
  UserProfile,
} from "./types";

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

function toIsoTimestamp(value: string) {
  return value ? `${value}T00:00:00` : null;
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
    importLogsResult,
  ] = await Promise.all([
    supabase
      .from("brands")
      .select("id, name, created_at, updated_at")
      .eq("id", brandId)
      .single(),
    supabase
      .from("products")
      .select("sku, title, image_url, product_url, price, sale_price, attributes")
      .eq("brand_id", brandId),
    supabase
      .from("orders")
      .select(
        "order_number, order_date, payment_method, payment_status, customer_name, items_in_order, net_revenue, discount, commission_value, source, tracking_url, shipping_state, coupon_name",
      )
      .eq("brand_id", brandId),
    supabase
      .from("order_items")
      .select(
        "order_number, order_date, customer_name, product_name, product_specs, quantity, gross_value, unit_price",
      )
      .eq("brand_id", brandId),
    supabase
      .from("sales_lines")
      .select(
        "order_number, order_date, product_id, product_name, quantity, unit_price, order_discount_value, shipping_value, order_status, sku",
      )
      .eq("brand_id", brandId),
    supabase
      .from("media_performance")
      .select(
        "date, campaign_name, adset_name, account_name, ad_name, platform, placement, device_platform, delivery, reach, impressions, clicks_all, spend, purchases, conversion_value, link_clicks, ctr_all, ctr_link, add_to_cart",
      )
      .eq("brand_id", brandId),
    supabase
      .from("cmv_history")
      .select("sku, cmv_unit, updated_at")
      .eq("brand_id", brandId)
      .is("valid_to", null),
    supabase
      .from("import_logs")
      .select("file_type, file_name, created_at, records_processed")
      .eq("brand_id", brandId)
      .eq("status", "SUCCESS")
      .order("created_at", { ascending: false }),
  ]);

  const errors = [
    brandResult.error,
    productsResult.error,
    ordersResult.error,
    orderItemsResult.error,
    salesLinesResult.error,
    mediaResult.error,
    cmvResult.error,
    importLogsResult.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    throw errors[0];
  }

  if (!brandResult.data) {
    throw new Error("Marca não encontrada.");
  }

  const catalog: CatalogProduct[] =
    productsResult.data?.map((row) => ({
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
    })) ?? [];

  const paidOrders: PaidOrder[] =
    ordersResult.data?.map((row) => ({
      orderNumber: row.order_number,
      orderDate: row.order_date?.slice(0, 10) ?? "",
      paymentMethod: row.payment_method ?? "",
      paymentStatus: row.payment_status ?? "",
      customerName: row.customer_name ?? "",
      itemsInOrder: row.items_in_order ?? 0,
      orderValue: Number(row.net_revenue ?? 0),
      discountValue: Number(row.discount ?? 0),
      commissionValue: Number(row.commission_value ?? 0),
      source: row.source ?? "",
      trackingUrl: row.tracking_url ?? undefined,
      shippingState: row.shipping_state ?? undefined,
    })) ?? [];

  const orderItems: OrderItem[] =
    orderItemsResult.data?.map((row) => ({
      orderNumber: row.order_number,
      orderDate: row.order_date?.slice(0, 10) ?? "",
      customerName: row.customer_name ?? undefined,
      productName: row.product_name ?? row.order_number,
      productSpecs: row.product_specs ?? undefined,
      quantity: row.quantity ?? 0,
      grossValue: Number(row.gross_value ?? 0),
    })) ?? [];

  const salesLines: SalesLine[] =
    salesLinesResult.data?.map((row) => ({
      orderNumber: row.order_number,
      orderDate: row.order_date?.slice(0, 10) ?? "",
      productId: row.product_id,
      productName: row.product_name,
      quantity: row.quantity ?? 0,
      unitPrice: Number(row.unit_price ?? 0),
      orderDiscountValue: Number(row.order_discount_value ?? 0),
      shippingValue: Number(row.shipping_value ?? 0),
      orderStatus: row.order_status ?? "",
      sku: row.sku ?? undefined,
    })) ?? [];

  const media: MediaRow[] =
    mediaResult.data?.map((row) => ({
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
    })) ?? [];

  const cmvEntries =
    cmvResult.data?.map((row) => ({
      productId: row.sku,
      productName: row.sku,
      unitCost: Number(row.cmv_unit ?? 0),
      updatedAt: row.updated_at,
    })) ?? [];

  return {
    id: brandResult.data.id,
    name: brandResult.data.name,
    createdAt: brandResult.data.created_at,
    updatedAt: brandResult.data.updated_at,
    files: mapLatestImportFiles(importLogsResult.data ?? []),
    catalog,
    paidOrders,
    orderItems,
    salesLines,
    media,
    cmvEntries,
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

async function insertImportLog(
  brandId: string,
  userId: string,
  fileInfo: ImportedFileInfo,
) {
  const { error } = await supabase.from("import_logs").insert({
    brand_id: brandId,
    user_id: userId,
    file_name: fileInfo.fileName,
    file_type: fileInfo.kind,
    status: "SUCCESS",
    records_processed: fileInfo.rowCount,
    records_inserted: fileInfo.rowCount,
    records_updated: 0,
    completed_at: new Date().toISOString(),
  });

  if (error) {
    throw error;
  }
}

async function replaceProducts(
  brandId: string,
  fileInfo: ImportedFileInfo,
  catalog: CatalogProduct[],
  userId: string,
) {
  const { error: deleteError } = await supabase
    .from("products")
    .delete()
    .eq("brand_id", brandId);
  if (deleteError) {
    throw deleteError;
  }

  if (catalog.length) {
    const rows = catalog.map((product) => ({
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
    }));

    for (const chunk of chunkArray(rows)) {
      const { error } = await supabase.from("products").insert(chunk);
      if (error) {
        throw error;
      }
    }
  }

  await insertImportLog(brandId, userId, fileInfo);
}

async function upsertOrders(
  brandId: string,
  fileInfo: ImportedFileInfo,
  paidOrders: PaidOrder[],
  userId: string,
) {
  const rows = paidOrders.map((order) => ({
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
    coupon_name: null,
    commission_value: order.commissionValue,
    shipping_state: order.shippingState ?? null,
    shipping_street: null,
    tracking_url: order.trackingUrl ?? null,
  }));

  for (const chunk of chunkArray(rows)) {
    const { error } = await supabase
      .from("orders")
      .upsert(chunk, { onConflict: "brand_id,order_number" });
    if (error) {
      throw error;
    }
  }

  await insertImportLog(brandId, userId, fileInfo);
}

async function replaceOrderItems(
  brandId: string,
  fileInfo: ImportedFileInfo,
  orderItems: OrderItem[],
  userId: string,
) {
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

  const { error: deleteError } = await supabase
    .from("order_items")
    .delete()
    .eq("brand_id", brandId);
  if (deleteError) {
    throw deleteError;
  }

  const rows = orderItems.map((item) => ({
    brand_id: brandId,
    order_id: orderMap.get(item.orderNumber),
    order_number: item.orderNumber,
    order_date: toIsoTimestamp(item.orderDate),
    customer_name: item.customerName ?? null,
    sku: deriveOrderItemsSku(item),
    product_name: item.productName,
    product_specs: item.productSpecs ?? null,
    quantity: item.quantity,
    gross_value: item.grossValue,
    unit_price: item.quantity ? item.grossValue / item.quantity : item.grossValue,
    cmv_unit_applied: 0,
    cmv_total_applied: 0,
  }));

  for (const chunk of chunkArray(rows)) {
    const { error } = await supabase.from("order_items").insert(chunk);
    if (error) {
      throw error;
    }
  }

  await insertImportLog(brandId, userId, fileInfo);
}

async function replaceSalesLines(
  brandId: string,
  fileInfo: ImportedFileInfo,
  salesLines: SalesLine[],
  userId: string,
) {
  const { error: deleteError } = await supabase
    .from("sales_lines")
    .delete()
    .eq("brand_id", brandId);
  if (deleteError) {
    throw deleteError;
  }

  const rows = salesLines.map((line) => ({
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
  }));

  for (const chunk of chunkArray(rows)) {
    const { error } = await supabase.from("sales_lines").insert(chunk);
    if (error) {
      throw error;
    }
  }

  await insertImportLog(brandId, userId, fileInfo);
}

async function replaceMedia(
  brandId: string,
  fileInfo: ImportedFileInfo,
  media: MediaRow[],
  userId: string,
) {
  const { error: deleteError } = await supabase
    .from("media_performance")
    .delete()
    .eq("brand_id", brandId);
  if (deleteError) {
    throw deleteError;
  }

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

  await insertImportLog(brandId, userId, fileInfo);
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
    lista_itens: 2,
    pedidos_pagos: 3,
    meta: 4,
  };
  parsedFiles.sort((a, b) => priority[a.kind] - priority[b.kind]);

  for (const parsed of parsedFiles) {
    switch (parsed.kind) {
      case "feed":
        await replaceProducts(brandId, parsed.fileInfo, parsed.payload.catalog ?? [], userId);
        break;
      case "lista_pedidos":
        await upsertOrders(brandId, parsed.fileInfo, parsed.payload.paidOrders ?? [], userId);
        break;
      case "lista_itens":
        await replaceOrderItems(brandId, parsed.fileInfo, parsed.payload.orderItems ?? [], userId);
        break;
      case "pedidos_pagos":
        await replaceSalesLines(brandId, parsed.fileInfo, parsed.payload.salesLines ?? [], userId);
        break;
      case "meta":
        await replaceMedia(brandId, parsed.fileInfo, parsed.payload.media ?? [], userId);
        break;
    }
  }
}

export async function setCurrentCmv(brandId: string, sku: string, unitCost: number) {
  const { data, error } = await supabase.rpc("set_current_cmv", {
    p_brand_id: brandId,
    p_sku: sku,
    p_cmv_unit: unitCost,
  });

  if (error) {
    throw error;
  }

  return data;
}
