/**
 * canonical-ingest.ts
 *
 * Camada de ingestão incremental canônica.
 * Substitui a lógica anterior de delete+insert em database.ts.
 *
 * Regras (README §4.1 / §4.2):
 * - Nunca apagar a base inteira em nova importação.
 * - Idempotência por row_hash determinístico.
 * - CMV é resolvido no banco pela data da venda.
 * - Linhas da Meta com is_ignored=true são excluídas dos agregados.
 */

import { supabase } from "@/lib/supabase";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface OrderPayload {
  order_number: string;
  order_date: string;         // ISO timestamp
  customer_name: string;
  payment_method?: string;
  net_revenue: number;        // RLD (já após desconto)
  discount: number;           // valor de desconto
  items_in_order?: number;
  coupon_name?: string;
  shipping_state?: string;
  tracking_url?: string;
}

export interface OrderLinePayload {
  order_number: string;
  order_date: string;         // ISO timestamp
  customer_name?: string;
  product_name: string;
  product_specs?: string;
  sku?: string;
  quantity: number;
  unit_price?: number;
}

export interface MetaRowPayload {
  report_start: string;       // ISO date
  report_end: string;
  campaign_name?: string;
  adset_name?: string;
  ad_name?: string;
  account_name?: string;
  platform?: string;
  placement?: string;
  device_platform?: string;
  delivery?: string;
  reach?: number;
  impressions: number;
  clicks_all: number;
  link_clicks: number;
  spend: number;
  purchases: number;
  revenue?: number;
  ctr_all?: number;
  ctr_link?: number;
  add_to_cart?: number;
}

export interface IngestResult {
  inserted: number;
  updated?: number;
  errors?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const CHUNK_SIZE = 200;

function chunk<T>(items: T[], size = CHUNK_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

// ─────────────────────────────────────────────────────────────────────────────
// INGESTÃO: Pedidos Pagos — ingest_orders_paid (§9.1 – §9.3)
// ─────────────────────────────────────────────────────────────────────────────

export async function ingestOrdersPaid(
  brandId: string,
  orders: OrderPayload[]
): Promise<IngestResult> {
  if (orders.length === 0) return { inserted: 0, updated: 0 };

  const total = { inserted: 0, updated: 0 };

  for (const batch of chunk(orders)) {
    const { data, error } = await supabase.rpc("ingest_orders_paid", {
      p_brand_id: brandId,
      p_rows: batch,
    });

    if (error) {
      throw new Error(`ingest_orders_paid: ${error.message}`);
    }

    // A RPC retorna { inserted, updated }
    const result = data as { inserted: number; updated: number };
    total.inserted += result.inserted ?? 0;
    total.updated  += result.updated  ?? 0;
  }

  return total;
}

// ─────────────────────────────────────────────────────────────────────────────
// INGESTÃO: Itens de Pedido com CMV por Vigência — ingest_order_lines (§7)
// ─────────────────────────────────────────────────────────────────────────────

export async function ingestOrderLines(
  brandId: string,
  lines: OrderLinePayload[]
): Promise<IngestResult> {
  if (lines.length === 0) return { inserted: 0 };

  const total = { inserted: 0 };

  for (const batch of chunk(lines)) {
    const { data, error } = await supabase.rpc("ingest_order_lines", {
      p_brand_id: brandId,
      p_rows: batch,
    });

    if (error) {
      throw new Error(`ingest_order_lines: ${error.message}`);
    }

    const result = data as { inserted: number };
    total.inserted += result.inserted ?? 0;
  }

  return total;
}

// ─────────────────────────────────────────────────────────────────────────────
// INGESTÃO: Meta Raw com deduplicação por hash — ingest_meta_raw (§8)
// ─────────────────────────────────────────────────────────────────────────────

export async function ingestMetaRaw(
  brandId: string,
  rows: MetaRowPayload[]
): Promise<IngestResult> {
  if (rows.length === 0) return { inserted: 0, updated: 0 };

  const total = { inserted: 0, updated: 0 };

  for (const batch of chunk(rows)) {
    const { data, error } = await supabase.rpc("ingest_meta_raw", {
      p_brand_id: brandId,
      p_rows: batch,
    });

    if (error) {
      throw new Error(`ingest_meta_raw: ${error.message}`);
    }

    const result = data as { inserted: number; updated: number };
    total.inserted += result.inserted ?? 0;
    total.updated  += result.updated  ?? 0;
  }

  return total;
}

// ─────────────────────────────────────────────────────────────────────────────
// SANEAMENTO: Marcar/desmarcar linha Meta como ignorada — set_media_anomaly (§8)
// ─────────────────────────────────────────────────────────────────────────────

export async function setMediaAnomaly(
  rowId: string,
  isIgnored: boolean,
  reason?: string
): Promise<void> {
  const { error } = await supabase.rpc("set_media_anomaly", {
    p_row_id: rowId,
    p_ignored: isIgnored,
    p_reason: reason ?? null,
  });

  if (error) {
    throw new Error(`set_media_anomaly: ${error.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSULTAS: DRE Mensal — get_dre_monthly (§10)
// ─────────────────────────────────────────────────────────────────────────────

export interface DreMonthRow {
  yearmonth: string;
  gross_revenue: number;
  discount_value: number;
  net_revenue: number;
  cmv_total: number;
  gross_margin: number;
  adcost: number;
  contribution_margin: number;
  fixed_expenses: number;
  resultado: number;
  qty_real: number;
  ticket_medio: number | null;
  roas_bruto: number | null;
  roas_liquido: number | null;
  cmv_pct_rld: number | null;
  adcost_pct_rld: number | null;
  cm_pct_rld: number | null;
}

export async function getDreMonthly(
  brandId: string,
  yearmonth?: string
): Promise<DreMonthRow[]> {
  const { data, error } = await supabase.rpc("get_dre_monthly", {
    p_brand_id: brandId,
    p_yearmonth: yearmonth ?? null,
  });

  if (error) {
    throw new Error(`get_dre_monthly: ${error.message}`);
  }

  return (data as DreMonthRow[]) ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSULTAS: KPIs Acumulados para o Dashboard — get_dashboard_kpis (§16.1)
// ─────────────────────────────────────────────────────────────────────────────

export interface DashboardKpis {
  gross_revenue: number;
  discount_value: number;
  net_revenue: number;
  cmv_total: number;
  gross_margin: number;
  adcost: number;
  contribution_margin: number;
  qty_real: number;
  ticket_medio: number | null;
  roas_bruto: number | null;
  roas_liquido: number | null;
  impressions: number;
  clicks: number;
  purchases_meta: number;
}

export async function getDashboardKpis(
  brandId: string,
  from?: string,  // ISO date
  to?: string     // ISO date
): Promise<DashboardKpis | null> {
  const { data, error } = await supabase.rpc("get_dashboard_kpis", {
    p_brand_id: brandId,
    p_from: from ?? null,
    p_to:   to   ?? null,
  });

  if (error) {
    throw new Error(`get_dashboard_kpis: ${error.message}`);
  }

  return (data as DashboardKpis) ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSULTAS: Métricas Diárias — via View v_daily_metrics
// ─────────────────────────────────────────────────────────────────────────────

export interface DailyMetricRow {
  brand_id: string;
  sale_day: string;
  gross_revenue: number;
  discount_value: number;
  net_revenue: number;
  qty_real: number;
  cmv_total: number;
  gross_margin: number;
  contribution_margin: number;
  adcost: number;
  impressions: number;
  clicks: number;
  purchases_meta: number;
  ticket_medio: number | null;
  roas_bruto: number | null;
  roas_liquido: number | null;
  adcost_por_peca: number | null;
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  cvr_meta: number | null;
  cvr_real: number | null;
}

export async function getDailyMetrics(
  brandId: string,
  from?: string,
  to?: string
): Promise<DailyMetricRow[]> {
  const { data, error } = await supabase.rpc("get_daily_metrics", {
    p_brand_id: brandId,
    p_from: from ?? null,
    p_to:   to   ?? null,
  });

  if (error) {
    throw new Error(`get_daily_metrics: ${error.message}`);
  }

  return (data as DailyMetricRow[]) ?? [];
}
