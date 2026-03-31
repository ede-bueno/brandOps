-- ============================================================
-- Add order_count to v_daily_metrics and get_dashboard_kpis
-- (Safe Drop & Recreate to avoid column name mismatch)
-- ============================================================

BEGIN;

-- 1. Drop dependent objects
DROP VIEW IF EXISTS public.v_dre_monthly;
DROP VIEW IF EXISTS public.v_dashboard_kpis;
DROP FUNCTION IF EXISTS public.get_daily_metrics(uuid, date, date);
DROP FUNCTION IF EXISTS public.get_dashboard_kpis(uuid, date, date);
DROP VIEW IF EXISTS public.v_daily_metrics;

-- 2. Create v_daily_metrics with order_count
CREATE VIEW public.v_daily_metrics AS
WITH daily_orders AS (
  SELECT
    o.brand_id,
    DATE(o.order_date) AS sale_day,
    COUNT(DISTINCT o.order_number)                   AS order_count,
    SUM(COALESCE(o.gross_revenue, COALESCE(o.net_revenue,0) + COALESCE(o.discount,0))) AS gross_revenue,
    SUM(COALESCE(o.discount, 0))                     AS discount_value,
    SUM(COALESCE(o.net_revenue, 0))                  AS net_revenue
  FROM public.orders o
  WHERE o.is_ignored = FALSE
  GROUP BY o.brand_id, DATE(o.order_date)
),
daily_items AS (
  SELECT
    oi.brand_id,
    DATE(oi.order_date) AS sale_day,
    SUM(COALESCE(oi.quantity, 1))                    AS qty_real,
    SUM(COALESCE(oi.cmv_total_applied, 0))           AS cmv_total
  FROM public.order_items oi
  WHERE oi.is_ignored = FALSE
  GROUP BY oi.brand_id, DATE(oi.order_date)
),
daily_media AS (
  SELECT
    mp.brand_id,
    mp.report_start                                   AS sale_day,
    SUM(COALESCE(mp.spend, 0))                        AS adcost,
    SUM(COALESCE(mp.impressions, 0))                  AS impressions,
    SUM(COALESCE(mp.link_clicks, mp.clicks_all, 0))   AS clicks,
    SUM(COALESCE(mp.purchases, 0))                    AS purchases_meta,
    SUM(COALESCE(mp.conversion_value, 0))             AS conversion_value_meta
  FROM public.media_performance mp
  WHERE mp.is_ignored = FALSE
  GROUP BY mp.brand_id, mp.report_start
)
SELECT
  COALESCE(o.brand_id, i.brand_id, m.brand_id)      AS brand_id,
  COALESCE(o.sale_day, i.sale_day, m.sale_day)       AS sale_day,

  -- Order count (Added)
  COALESCE(o.order_count, 0)                         AS order_count,

  -- Receitas
  COALESCE(o.gross_revenue, 0)                       AS gross_revenue,
  COALESCE(o.discount_value, 0)                      AS discount_value,
  COALESCE(o.net_revenue, 0)                         AS net_revenue,

  -- Itens
  COALESCE(i.qty_real, 0)                            AS qty_real,
  COALESCE(i.cmv_total, 0)                           AS cmv_total,

  -- Margens
  COALESCE(o.net_revenue, 0) - COALESCE(i.cmv_total, 0)                         AS gross_margin,
  COALESCE(o.net_revenue, 0) - COALESCE(i.cmv_total, 0)
    - COALESCE(m.adcost, 0)                                                      AS contribution_margin,

  -- Mídia
  COALESCE(m.adcost, 0)                              AS adcost,
  COALESCE(m.impressions, 0)                         AS impressions,
  COALESCE(m.clicks, 0)                              AS clicks,
  COALESCE(m.purchases_meta, 0)                      AS purchases_meta,
  COALESCE(m.conversion_value_meta, 0)               AS conversion_value_meta,

  -- Métricas derivadas
  CASE WHEN COALESCE(i.qty_real, 0) > 0
    THEN COALESCE(o.gross_revenue, 0) / i.qty_real
    ELSE NULL
  END                                                AS ticket_medio_peca,

  CASE WHEN COALESCE(m.adcost, 0) > 0
    THEN COALESCE(o.gross_revenue, 0) / m.adcost
    ELSE NULL
  END                                                AS roas_bruto,

  CASE WHEN COALESCE(m.adcost, 0) > 0
    THEN (COALESCE(o.net_revenue, 0) - COALESCE(i.cmv_total, 0)) / m.adcost
    ELSE NULL
  END                                                AS roas_liquido,

  CASE WHEN COALESCE(m.adcost, 0) > 0 AND COALESCE(i.qty_real, 0) > 0
    THEN m.adcost / i.qty_real
    ELSE NULL
  END                                                AS adcost_por_peca,

  CASE WHEN COALESCE(m.impressions, 0) > 0
    THEN COALESCE(m.clicks, 0)::NUMERIC / m.impressions
    ELSE NULL
  END                                                AS ctr,

  CASE WHEN COALESCE(m.clicks, 0) > 0
    THEN COALESCE(m.adcost, 0) / m.clicks
    ELSE NULL
  END                                                AS cpc,

  CASE WHEN COALESCE(m.impressions, 0) > 0
    THEN (COALESCE(m.adcost, 0) * 1000) / m.impressions
    ELSE NULL
  END                                                AS cpm,

  CASE WHEN COALESCE(m.clicks, 0) > 0
    THEN COALESCE(m.purchases_meta, 0)::NUMERIC / m.clicks
    ELSE NULL
  END                                                AS cvr_meta,

  CASE WHEN COALESCE(m.clicks, 0) > 0
    THEN COALESCE(i.qty_real, 0)::NUMERIC / m.clicks
    ELSE NULL
  END                                                AS cvr_real

FROM daily_orders o
FULL OUTER JOIN daily_items i
  ON  o.brand_id = i.brand_id
  AND o.sale_day  = i.sale_day
FULL OUTER JOIN daily_media m
  ON  COALESCE(o.brand_id, i.brand_id) = m.brand_id
  AND COALESCE(o.sale_day, i.sale_day) = m.sale_day;


-- 3. Restore dependent objects
CREATE VIEW public.v_dashboard_kpis AS
 SELECT brand_id,
    sum(gross_revenue) AS gross_revenue,
    sum(discount_value) AS discount_value,
    sum(net_revenue) AS net_revenue,
    sum(cmv_total) AS cmv_total,
    sum(gross_margin) AS gross_margin,
    sum(adcost) AS adcost,
    sum(contribution_margin) AS contribution_margin,
    sum(qty_real) AS qty_real,
    sum(order_count) AS order_count,
        CASE
            WHEN (sum(order_count) > (0)::bigint) THEN (sum(gross_revenue) / sum(order_count))
            ELSE NULL::numeric
        END AS ticket_medio,
        CASE
            WHEN (sum(adcost) > (0)::numeric) THEN (sum(gross_revenue) / sum(adcost))
            ELSE NULL::numeric
        END AS roas_bruto,
        CASE
            WHEN (sum(adcost) > (0)::numeric) THEN (sum(gross_margin) / sum(adcost))
            ELSE NULL::numeric
        END AS roas_liquido
   FROM public.v_daily_metrics
  GROUP BY brand_id;

CREATE VIEW public.v_dre_monthly AS
 WITH monthly_metrics AS (
         SELECT v_daily_metrics.brand_id,
            to_char((v_daily_metrics.sale_day)::timestamp with time zone, 'YYYY-MM'::text) AS yearmonth,
            sum(v_daily_metrics.gross_revenue) AS gross_revenue,
            sum(v_daily_metrics.discount_value) AS discount_value,
            sum(v_daily_metrics.net_revenue) AS net_revenue,
            sum(v_daily_metrics.cmv_total) AS cmv_total,
            sum(v_daily_metrics.gross_margin) AS gross_margin,
            sum(v_daily_metrics.adcost) AS adcost,
            sum(v_daily_metrics.contribution_margin) AS contribution_margin,
            sum(v_daily_metrics.qty_real) AS qty_real,
            sum(v_daily_metrics.order_count) AS order_count,
            sum(v_daily_metrics.impressions) AS impressions,
            sum(v_daily_metrics.clicks) AS clicks,
            sum(v_daily_metrics.purchases_meta) AS purchases_meta
           FROM public.v_daily_metrics
          GROUP BY v_daily_metrics.brand_id, (to_char((v_daily_metrics.sale_day)::timestamp with time zone, 'YYYY-MM'::text))
        ), monthly_expenses AS (
         SELECT be.brand_id,
            to_char((be.incurred_on)::timestamp with time zone, 'YYYY-MM'::text) AS yearmonth,
            sum(be.amount) AS fixed_expenses
           FROM brand_expenses be
          GROUP BY be.brand_id, (to_char((be.incurred_on)::timestamp with time zone, 'YYYY-MM'::text))
        )
 SELECT m.brand_id,
    m.yearmonth,
    m.gross_revenue,
    m.discount_value,
    m.net_revenue,
    m.cmv_total,
    m.gross_margin,
    m.adcost,
    m.contribution_margin,
    COALESCE(e.fixed_expenses, (0)::numeric) AS fixed_expenses,
    (m.contribution_margin - COALESCE(e.fixed_expenses, (0)::numeric)) AS resultado,
    m.qty_real,
    m.order_count,
    m.impressions,
    m.clicks,
    m.purchases_meta,
        CASE
            WHEN (m.net_revenue > (0)::numeric) THEN (m.cmv_total / m.net_revenue)
            ELSE NULL::numeric
        END AS cmv_pct_rld,
        CASE
            WHEN (m.net_revenue > (0)::numeric) THEN (m.adcost / m.net_revenue)
            ELSE NULL::numeric
        END AS adcost_pct_rld,
        CASE
            WHEN (m.net_revenue > (0)::numeric) THEN (m.contribution_margin / m.net_revenue)
            ELSE NULL::numeric
        END AS cm_pct_rld,
        CASE
            WHEN (m.order_count > (0)::bigint) THEN (m.gross_revenue / m.order_count)
            ELSE NULL::numeric
        END AS ticket_medio,
        CASE
            WHEN (m.adcost > (0)::numeric) THEN (m.gross_revenue / m.adcost)
            ELSE NULL::numeric
        END AS roas_bruto,
        CASE
            WHEN (m.adcost > (0)::numeric) THEN (m.gross_margin / m.adcost)
            ELSE NULL::numeric
        END AS roas_liquido,
        CASE
            WHEN (m.impressions > (0)::numeric) THEN (m.clicks / m.impressions)
            ELSE NULL::numeric
        END AS ctr,
        CASE
            WHEN (m.clicks > (0)::numeric) THEN (m.adcost / m.clicks)
            ELSE NULL::numeric
        END AS cpc,
        CASE
            WHEN (m.impressions > (0)::numeric) THEN ((m.adcost * (1000)::numeric) / m.impressions)
            ELSE NULL::numeric
        END AS cpm
   FROM (monthly_metrics m
     LEFT JOIN monthly_expenses e ON (((m.brand_id = e.brand_id) AND (m.yearmonth = e.yearmonth))));

CREATE OR REPLACE FUNCTION public.get_daily_metrics(p_brand_id uuid, p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date)
 RETURNS SETOF v_daily_metrics
 LANGUAGE plpgsql
 SECURITY DEFINER
 AS $$
BEGIN
  IF NOT public.has_brand_access(p_brand_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.v_daily_metrics dm
  WHERE dm.brand_id = p_brand_id
    AND (p_from IS NULL OR dm.sale_day >= p_from)
    AND (p_to   IS NULL OR dm.sale_day <= p_to)
  ORDER BY dm.sale_day;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_dashboard_kpis(
  p_brand_id UUID,
  p_from DATE DEFAULT NULL,
  p_to   DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  IF NOT public.has_brand_access(p_brand_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT jsonb_build_object(
    'gross_revenue',       SUM(gross_revenue),
    'discount_value',      SUM(discount_value),
    'net_revenue',         SUM(net_revenue),
    'cmv_total',           SUM(cmv_total),
    'gross_margin',        SUM(gross_margin),
    'adcost',              SUM(adcost),
    'contribution_margin', SUM(contribution_margin),
    'qty_real',            SUM(qty_real),
    'order_count',         SUM(order_count),
    'ticket_medio',        CASE WHEN SUM(order_count) > 0 THEN SUM(gross_revenue) / SUM(order_count) ELSE NULL END,
    'roas_bruto',          CASE WHEN SUM(adcost) > 0 THEN SUM(gross_revenue) / SUM(adcost) ELSE NULL END,
    'roas_liquido',        CASE WHEN SUM(adcost) > 0 THEN SUM(gross_margin) / SUM(adcost) ELSE NULL END,
    'impressions',         SUM(impressions),
    'clicks',              SUM(clicks),
    'purchases_meta',      SUM(purchases_meta)
  )
  INTO result
  FROM public.v_daily_metrics dm
  WHERE dm.brand_id = p_brand_id
    AND (p_from IS NULL OR dm.sale_day >= p_from)
    AND (p_to   IS NULL OR dm.sale_day <= p_to);

  RETURN result;
END;
$$;

COMMIT;
