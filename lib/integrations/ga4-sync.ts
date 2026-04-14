import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveGa4CredentialsForBrand } from "@/lib/brandops/integration-config";
import {
  fetchGa4DailyPerformance,
  fetchGa4ItemDailyPerformance,
} from "@/lib/integrations/ga4";

function formatDateForGa4(value: string) {
  return value.slice(0, 10);
}

export function formatGa4SyncError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error && "message" in error) {
    return String(error.message);
  }

  return "Falha ao sincronizar o GA4.";
}

export async function syncGa4RowsForBrand(
  supabase: SupabaseClient,
  options: {
    brandId: string;
    integrationId: string;
    settings: Record<string, unknown>;
  },
) {
  const { brandId, integrationId, settings } = options;
  const propertyId =
    typeof settings.propertyId === "string" ? settings.propertyId.trim() : "";

  if (!propertyId) {
    throw new Error("Property ID do GA4 não configurado para esta loja.");
  }

  await supabase
    .from("brand_integrations")
    .update({
      last_sync_status: "running",
      last_sync_error: null,
    })
    .eq("id", integrationId);

  const { data: firstOrderRow, error: firstOrderError } = await supabase
    .from("orders")
    .select("order_date")
    .eq("brand_id", brandId)
    .order("order_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (firstOrderError) {
    throw firstOrderError;
  }

  const timezone =
    typeof settings.timezone === "string" && settings.timezone.trim()
      ? settings.timezone
      : "America/Sao_Paulo";

  const ga4Access = await resolveGa4CredentialsForBrand({
    brandId,
    settings,
  });

  const now = new Date();
  const fallbackStart = new Date(now);
  fallbackStart.setDate(fallbackStart.getDate() - 90);

  const startDate = firstOrderRow?.order_date
    ? formatDateForGa4(firstOrderRow.order_date)
    : fallbackStart.toISOString().slice(0, 10);
  const endDate = now.toISOString().slice(0, 10);

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
    const { error: deleteError } = await supabase
      .from("ga4_daily_performance")
      .delete()
      .eq("brand_id", brandId)
      .in("date", dates);

    if (deleteError) {
      throw deleteError;
    }

    const payload = rows.map((row) => ({
      brand_id: brandId,
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

    const { error: insertError } = await supabase
      .from("ga4_daily_performance")
      .insert(payload);

    if (insertError) {
      throw insertError;
    }
  }

  if (itemRows.length) {
    const dates = [...new Set(itemRows.map((row) => row.date))];
    const { error: deleteError } = await supabase
      .from("ga4_item_daily_performance")
      .delete()
      .eq("brand_id", brandId)
      .in("date", dates);

    if (deleteError) {
      throw deleteError;
    }

    const payload = itemRows.map((row) => ({
      brand_id: brandId,
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

    const { error: insertError } = await supabase
      .from("ga4_item_daily_performance")
      .insert(payload);

    if (insertError) {
      throw insertError;
    }
  }

  await supabase
    .from("brand_integrations")
    .update({
      last_sync_at: syncedAt,
      last_sync_status: "success",
      last_sync_error: null,
      settings: {
        ...settings,
        timezone,
      },
    })
    .eq("id", integrationId);

  return {
    propertyId,
    startDate,
    endDate,
    rows: rows.length,
    itemRows: itemRows.length,
    syncedAt,
  };
}
