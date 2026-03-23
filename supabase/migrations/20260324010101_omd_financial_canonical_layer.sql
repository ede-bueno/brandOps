-- ============================================================
-- OMD FINANCEIRO — Camada Canônica de Cálculo e Consolidação
-- Fonte de verdade: README_DRE_CMV_METRICAS_OMD.md
-- Migração incremental (não destrói dados existentes)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -------------------------------------------------------
-- 1. Complementar media_performance com campos canônicos
-- -------------------------------------------------------

ALTER TABLE public.media_performance
  ADD COLUMN IF NOT EXISTS row_hash TEXT,
  ADD COLUMN IF NOT EXISTS is_ignored BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ignore_reason TEXT,
  ADD COLUMN IF NOT EXISTS ignored_by UUID REFERENCES public.user_profiles(id),
  ADD COLUMN IF NOT EXISTS ignored_at TIMESTAMP WITH TIME ZONE;

-- Índice de deduplicação para Meta
CREATE UNIQUE INDEX IF NOT EXISTS idx_media_performance_row_hash
  ON public.media_performance (brand_id, row_hash)
  WHERE row_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_media_performance_date_brand
  ON public.media_performance (brand_id, report_start);

CREATE INDEX IF NOT EXISTS idx_media_performance_ignored
  ON public.media_performance (brand_id, is_ignored);

-- -------------------------------------------------------
-- 2. Complementar orders com campos canônicos
-- -------------------------------------------------------
-- Schema real: orders.net_revenue (RLD), orders.discount (desconto).
-- gross_revenue = net_revenue + discount (ROB antes do desconto).
-- Adicionamos gross_revenue como coluna computada persistida.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS row_hash TEXT,
  ADD COLUMN IF NOT EXISTS gross_revenue NUMERIC(12, 2) GENERATED ALWAYS AS (
    COALESCE(net_revenue, 0) + COALESCE(discount, 0)
  ) STORED;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_brand_row_hash
  ON public.orders (brand_id, row_hash)
  WHERE row_hash IS NOT NULL;

-- -------------------------------------------------------
-- 3. Complementar order_items com campos canônicos
-- -------------------------------------------------------

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS row_hash TEXT,
  ADD COLUMN IF NOT EXISTS cmv_unit_applied NUMERIC(12, 4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cmv_total_applied NUMERIC(12, 4) NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_order_items_brand_row_hash
  ON public.order_items (brand_id, row_hash)
  WHERE row_hash IS NOT NULL;

-- -------------------------------------------------------
-- 4. Tabela anomaly_reviews (auditoria de saneamento)
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.anomaly_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  source_table TEXT NOT NULL CHECK (source_table IN ('media_performance', 'orders', 'order_items')),
  source_row_id UUID NOT NULL,
  anomaly_type TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('ignored', 'restored')),
  reason TEXT,
  reviewed_by UUID REFERENCES public.user_profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.anomaly_reviews ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_anomaly_reviews_brand
  ON public.anomaly_reviews (brand_id, reviewed_at DESC);

DROP POLICY IF EXISTS "Brand members can manage anomaly reviews" ON public.anomaly_reviews;
CREATE POLICY "Brand members can manage anomaly reviews"
  ON public.anomaly_reviews
  FOR ALL
  USING (public.has_brand_access(brand_id))
  WITH CHECK (public.has_brand_access(brand_id));

-- -------------------------------------------------------
-- 5. VIEW: v_daily_metrics — Agregação diária canônica
-- Fórmulas conforme §9 do README
-- -------------------------------------------------------

CREATE OR REPLACE VIEW public.v_daily_metrics AS
WITH daily_orders AS (
  SELECT
    o.brand_id,
    DATE(o.order_date) AS sale_day,
    SUM(COALESCE(o.gross_revenue, COALESCE(o.net_revenue,0) + COALESCE(o.discount,0))) AS gross_revenue,
    SUM(COALESCE(o.discount, 0))                    AS discount_value,
    SUM(COALESCE(o.net_revenue, 0))                 AS net_revenue
  FROM public.orders o
  WHERE o.is_ignored = FALSE
  GROUP BY o.brand_id, DATE(o.order_date)
),
daily_items AS (
  SELECT
    oi.brand_id,
    DATE(oi.order_date) AS sale_day,
    SUM(COALESCE(oi.quantity, 1))                   AS qty_real,
    SUM(COALESCE(oi.cmv_total_applied, 0))          AS cmv_total
  FROM public.order_items oi
  WHERE oi.is_ignored = FALSE
  GROUP BY oi.brand_id, DATE(oi.order_date)
),
daily_media AS (
  SELECT
    mp.brand_id,
    mp.report_start                                  AS sale_day,
    SUM(COALESCE(mp.spend, 0))                       AS adcost,
    SUM(COALESCE(mp.impressions, 0))                 AS impressions,
    SUM(COALESCE(mp.link_clicks, mp.clicks_all, 0))  AS clicks,
    SUM(COALESCE(mp.purchases, 0))                   AS purchases_meta,
    SUM(COALESCE(mp.conversion_value, 0))            AS conversion_value_meta
  FROM public.media_performance mp
  WHERE mp.is_ignored = FALSE
  GROUP BY mp.brand_id, mp.report_start
)
SELECT
  COALESCE(o.brand_id, i.brand_id, m.brand_id)     AS brand_id,
  COALESCE(o.sale_day, i.sale_day, m.sale_day)      AS sale_day,

  -- Receitas
  COALESCE(o.gross_revenue, 0)                      AS gross_revenue,
  COALESCE(o.discount_value, 0)                     AS discount_value,
  COALESCE(o.net_revenue, 0)                        AS net_revenue,

  -- Itens
  COALESCE(i.qty_real, 0)                           AS qty_real,
  COALESCE(i.cmv_total, 0)                          AS cmv_total,

  -- Margens (§9.5, §9.7)
  COALESCE(o.net_revenue, 0) - COALESCE(i.cmv_total, 0)                        AS gross_margin,
  COALESCE(o.net_revenue, 0) - COALESCE(i.cmv_total, 0)
    - COALESCE(m.adcost, 0)                                                     AS contribution_margin,

  -- Mídia (§9.6)
  COALESCE(m.adcost, 0)                             AS adcost,
  COALESCE(m.impressions, 0)                        AS impressions,
  COALESCE(m.clicks, 0)                             AS clicks,
  COALESCE(m.purchases_meta, 0)                     AS purchases_meta,
  COALESCE(m.conversion_value_meta, 0)              AS conversion_value_meta,

  -- Métricas derivadas — null quando denominador = 0 (§9.9 a §9.18)
  CASE WHEN COALESCE(i.qty_real, 0) > 0
    THEN COALESCE(o.gross_revenue, 0) / i.qty_real
    ELSE NULL
  END                                               AS ticket_medio,

  CASE WHEN COALESCE(m.adcost, 0) > 0
    THEN COALESCE(o.gross_revenue, 0) / m.adcost
    ELSE NULL
  END                                               AS roas_bruto,

  CASE WHEN COALESCE(m.adcost, 0) > 0
    THEN (COALESCE(o.net_revenue, 0) - COALESCE(i.cmv_total, 0)) / m.adcost
    ELSE NULL
  END                                               AS roas_liquido,

  CASE WHEN COALESCE(m.adcost, 0) > 0 AND COALESCE(i.qty_real, 0) > 0
    THEN m.adcost / i.qty_real
    ELSE NULL
  END                                               AS adcost_por_peca,

  CASE WHEN COALESCE(m.impressions, 0) > 0
    THEN COALESCE(m.clicks, 0)::NUMERIC / m.impressions
    ELSE NULL
  END                                               AS ctr,

  CASE WHEN COALESCE(m.clicks, 0) > 0
    THEN COALESCE(m.adcost, 0) / m.clicks
    ELSE NULL
  END                                               AS cpc,

  CASE WHEN COALESCE(m.impressions, 0) > 0
    THEN (COALESCE(m.adcost, 0) * 1000) / m.impressions
    ELSE NULL
  END                                               AS cpm,

  CASE WHEN COALESCE(m.clicks, 0) > 0
    THEN COALESCE(m.purchases_meta, 0)::NUMERIC / m.clicks
    ELSE NULL
  END                                               AS cvr_meta,

  CASE WHEN COALESCE(m.clicks, 0) > 0
    THEN COALESCE(i.qty_real, 0)::NUMERIC / m.clicks
    ELSE NULL
  END                                               AS cvr_real

FROM daily_orders o
FULL OUTER JOIN daily_items i
  ON  o.brand_id = i.brand_id
  AND o.sale_day  = i.sale_day
FULL OUTER JOIN daily_media m
  ON  COALESCE(o.brand_id, i.brand_id) = m.brand_id
  AND COALESCE(o.sale_day, i.sale_day) = m.sale_day;

-- -------------------------------------------------------
-- 6. VIEW: v_dre_monthly — DRE Mensal Canônico (§10)
-- -------------------------------------------------------

CREATE OR REPLACE VIEW public.v_dre_monthly AS
WITH monthly_metrics AS (
  SELECT
    brand_id,
    TO_CHAR(sale_day, 'YYYY-MM')          AS yearmonth,
    SUM(gross_revenue)                    AS gross_revenue,
    SUM(discount_value)                   AS discount_value,
    SUM(net_revenue)                      AS net_revenue,
    SUM(cmv_total)                        AS cmv_total,
    SUM(gross_margin)                     AS gross_margin,
    SUM(adcost)                           AS adcost,
    SUM(contribution_margin)              AS contribution_margin,
    SUM(qty_real)                         AS qty_real,
    SUM(impressions)                      AS impressions,
    SUM(clicks)                           AS clicks,
    SUM(purchases_meta)                   AS purchases_meta
  FROM public.v_daily_metrics
  GROUP BY brand_id, TO_CHAR(sale_day, 'YYYY-MM')
),
monthly_expenses AS (
  SELECT
    be.brand_id,
    TO_CHAR(be.incurred_on, 'YYYY-MM')    AS yearmonth,
    SUM(be.amount)                        AS fixed_expenses
  FROM public.brand_expenses be
  GROUP BY be.brand_id, TO_CHAR(be.incurred_on, 'YYYY-MM')
)
SELECT
  m.brand_id,
  m.yearmonth,
  m.gross_revenue,
  m.discount_value,
  m.net_revenue,
  m.cmv_total,
  m.gross_margin,
  m.adcost,
  m.contribution_margin,
  COALESCE(e.fixed_expenses, 0)                                   AS fixed_expenses,
  m.contribution_margin - COALESCE(e.fixed_expenses, 0)           AS resultado,
  m.qty_real,
  m.impressions,
  m.clicks,
  m.purchases_meta,

  -- % sobre RLD (§11.2)
  CASE WHEN m.net_revenue > 0 THEN m.cmv_total / m.net_revenue      ELSE NULL END AS cmv_pct_rld,
  CASE WHEN m.net_revenue > 0 THEN m.adcost / m.net_revenue          ELSE NULL END AS adcost_pct_rld,
  CASE WHEN m.net_revenue > 0 THEN m.contribution_margin / m.net_revenue ELSE NULL END AS cm_pct_rld,

  -- Métricas derivadas mensais
  CASE WHEN m.qty_real > 0   THEN m.gross_revenue / m.qty_real     ELSE NULL END AS ticket_medio,
  CASE WHEN m.adcost > 0     THEN m.gross_revenue / m.adcost       ELSE NULL END AS roas_bruto,
  CASE WHEN m.adcost > 0     THEN m.gross_margin / m.adcost         ELSE NULL END AS roas_liquido,
  CASE WHEN m.impressions > 0 THEN m.clicks::NUMERIC / m.impressions ELSE NULL END AS ctr,
  CASE WHEN m.clicks > 0     THEN m.adcost / m.clicks              ELSE NULL END AS cpc,
  CASE WHEN m.impressions > 0 THEN (m.adcost * 1000) / m.impressions ELSE NULL END AS cpm

FROM monthly_metrics m
LEFT JOIN monthly_expenses e
  ON m.brand_id  = e.brand_id
  AND m.yearmonth = e.yearmonth;

-- -------------------------------------------------------
-- 7. VIEW: v_dashboard_kpis — KPI Acumulado por Marca
--    Consumida pelo frontend para exibir cards do Dashboard
-- -------------------------------------------------------

CREATE OR REPLACE VIEW public.v_dashboard_kpis AS
SELECT
  brand_id,
  SUM(gross_revenue)          AS gross_revenue,
  SUM(discount_value)         AS discount_value,
  SUM(net_revenue)            AS net_revenue,
  SUM(cmv_total)              AS cmv_total,
  SUM(gross_margin)           AS gross_margin,
  SUM(adcost)                 AS adcost,
  SUM(contribution_margin)    AS contribution_margin,
  SUM(qty_real)               AS qty_real,
  CASE WHEN SUM(qty_real) > 0 THEN SUM(gross_revenue) / SUM(qty_real) ELSE NULL END AS ticket_medio,
  CASE WHEN SUM(adcost) > 0   THEN SUM(gross_revenue) / SUM(adcost)   ELSE NULL END AS roas_bruto,
  CASE WHEN SUM(adcost) > 0   THEN SUM(gross_margin) / SUM(adcost)    ELSE NULL END AS roas_liquido
FROM public.v_daily_metrics
GROUP BY brand_id;

-- -------------------------------------------------------
-- 8. RPC: ingest_orders_paid — Ingestão UPSERT idempotente
-- -------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ingest_orders_paid(
  p_brand_id UUID,
  p_rows JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count INTEGER := 0;
  updated_count  INTEGER := 0;
  row_data       JSONB;
  h              TEXT;
BEGIN
  IF NOT public.has_brand_access(p_brand_id) THEN
    RAISE EXCEPTION 'Access denied to brand %', p_brand_id;
  END IF;

  FOR row_data IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    -- Compute deterministic row hash: brand + order_number
    h := encode(
      digest(
        p_brand_id::TEXT || '|' || (row_data->>'order_number'),
        'sha256'
      ),
      'hex'
    );

    INSERT INTO public.orders (
      brand_id,
      order_number,
      order_date,
      customer_name,
      payment_method,
      net_revenue,
      discount,
      items_in_order,
      coupon_name,
      shipping_state,
      tracking_url,
      row_hash
    )
    VALUES (
      p_brand_id,
      row_data->>'order_number',
      (row_data->>'order_date')::TIMESTAMP WITH TIME ZONE,
      row_data->>'customer_name',
      row_data->>'payment_method',
      COALESCE((row_data->>'net_revenue')::NUMERIC, 0),
      COALESCE((row_data->>'discount')::NUMERIC, 0),
      COALESCE((row_data->>'items_in_order')::INTEGER, 0),
      row_data->>'coupon_name',
      row_data->>'shipping_state',
      row_data->>'tracking_url',
      h
    )
    ON CONFLICT (brand_id, row_hash) DO UPDATE SET
      customer_name   = EXCLUDED.customer_name,
      payment_method  = EXCLUDED.payment_method,
      net_revenue     = EXCLUDED.net_revenue,
      discount        = EXCLUDED.discount,
      items_in_order  = EXCLUDED.items_in_order,
      coupon_name     = EXCLUDED.coupon_name,
      shipping_state  = EXCLUDED.shipping_state,
      tracking_url    = EXCLUDED.tracking_url,
      updated_at      = NOW();

    IF FOUND THEN
      IF (SELECT xmax FROM public.orders WHERE brand_id = p_brand_id AND row_hash = h) = 0 THEN
        inserted_count := inserted_count + 1;
      ELSE
        updated_count := updated_count + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'inserted', inserted_count,
    'updated', updated_count
  );
END;
$$;

-- -------------------------------------------------------
-- 9. RPC: ingest_order_lines — Ingestão de itens UPSERT
--    Aplica CMV por vigência automaticamente no insert
-- -------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ingest_order_lines(
  p_brand_id UUID,
  p_rows JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count INTEGER := 0;
  updated_count  INTEGER := 0;
  row_data       JSONB;
  h              TEXT;
  v_cmv_unit     NUMERIC := 0;
  v_match_type   public.cmv_match_type;
  v_match_value  TEXT;
  v_match_label  TEXT;
  v_norm_sku     TEXT;
  v_norm_product TEXT;
  v_product_type TEXT;
  v_sale_date    TIMESTAMP WITH TIME ZONE;
  v_qty          INTEGER;
BEGIN
  IF NOT public.has_brand_access(p_brand_id) THEN
    RAISE EXCEPTION 'Access denied to brand %', p_brand_id;
  END IF;

  FOR row_data IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    -- Compute row hash: brand + order_number + product_name + sku + variant
    h := encode(
      digest(
        p_brand_id::TEXT || '|'
          || COALESCE(row_data->>'order_number', '') || '|'
          || COALESCE(row_data->>'product_name', '') || '|'
          || COALESCE(row_data->>'sku', '') || '|'
          || COALESCE(row_data->>'product_specs', ''),
        'sha256'
      ),
      'hex'
    );

    v_sale_date    := (row_data->>'order_date')::TIMESTAMP WITH TIME ZONE;
    v_qty          := COALESCE((row_data->>'quantity')::INTEGER, 1);
    v_norm_sku     := public.normalize_brandops_text(COALESCE(row_data->>'sku', ''));
    v_norm_product := public.normalize_brandops_text(COALESCE(row_data->>'product_name', ''));
    v_product_type := public.detect_brandops_product_type(
      row_data->>'product_name',
      row_data->>'sku'
    );

    -- Resolve CMV vigente pela data da venda (§7.2)
    SELECT
      history.cmv_unit,
      history.match_type,
      history.match_value,
      history.match_label
    INTO v_cmv_unit, v_match_type, v_match_value, v_match_label
    FROM public.cmv_history history
    WHERE history.brand_id = p_brand_id
      AND history.valid_from <= v_sale_date
      AND (history.valid_to IS NULL OR history.valid_to > v_sale_date)
      AND (
        (history.match_type = 'SKU'     AND history.match_value = v_norm_sku     AND v_norm_sku != '')
        OR (history.match_type = 'PRODUCT' AND history.match_value = v_norm_product AND v_norm_product != '')
        OR (history.match_type = 'TYPE'    AND history.match_value = public.normalize_brandops_text(COALESCE(v_product_type, '')))
      )
    ORDER BY
      CASE history.match_type WHEN 'SKU' THEN 1 WHEN 'PRODUCT' THEN 2 ELSE 3 END,
      history.valid_from DESC
    LIMIT 1;

    v_cmv_unit := COALESCE(v_cmv_unit, 0);

    INSERT INTO public.order_items (
      brand_id,
      order_number,
      order_date,
      customer_name,
      product_name,
      product_specs,
      sku,
      product_type,
      quantity,
      unit_price,
      cmv_unit_applied,
      cmv_total_applied,
      cmv_rule_type,
      cmv_rule_value,
      cmv_rule_label,
      cmv_applied_at,
      row_hash
    )
    VALUES (
      p_brand_id,
      row_data->>'order_number',
      v_sale_date,
      row_data->>'customer_name',
      row_data->>'product_name',
      row_data->>'product_specs',
      row_data->>'sku',
      v_product_type,
      v_qty,
      COALESCE((row_data->>'unit_price')::NUMERIC, 0),
      v_cmv_unit,
      v_cmv_unit * v_qty,
      v_match_type,
      v_match_value,
      v_match_label,
      CASE WHEN v_cmv_unit > 0 THEN NOW() ELSE NULL END,
      h
    )
    ON CONFLICT (brand_id, row_hash) DO UPDATE SET
      -- Preserva snapshot histórico de CMV se já foi gravado (§7.4)
      -- Só atualiza CMV se ainda não foi gravado anteriormente
      cmv_unit_applied  = CASE
        WHEN public.order_items.cmv_applied_at IS NULL THEN EXCLUDED.cmv_unit_applied
        ELSE public.order_items.cmv_unit_applied
      END,
      cmv_total_applied = CASE
        WHEN public.order_items.cmv_applied_at IS NULL THEN EXCLUDED.cmv_total_applied
        ELSE public.order_items.cmv_total_applied
      END,
      cmv_rule_type   = CASE WHEN public.order_items.cmv_applied_at IS NULL THEN EXCLUDED.cmv_rule_type   ELSE public.order_items.cmv_rule_type   END,
      cmv_rule_value  = CASE WHEN public.order_items.cmv_applied_at IS NULL THEN EXCLUDED.cmv_rule_value  ELSE public.order_items.cmv_rule_value  END,
      cmv_rule_label  = CASE WHEN public.order_items.cmv_applied_at IS NULL THEN EXCLUDED.cmv_rule_label  ELSE public.order_items.cmv_rule_label  END,
      cmv_applied_at  = CASE WHEN public.order_items.cmv_applied_at IS NULL THEN EXCLUDED.cmv_applied_at  ELSE public.order_items.cmv_applied_at  END,
      product_type    = EXCLUDED.product_type,
      unit_price      = EXCLUDED.unit_price,
      quantity        = EXCLUDED.quantity;

    IF FOUND THEN
      inserted_count := inserted_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'inserted', inserted_count
  );
END;
$$;

-- -------------------------------------------------------
-- 10. RPC: ingest_meta_raw — Ingestão Meta UPSERT + hash
-- -------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ingest_meta_raw(
  p_brand_id UUID,
  p_rows JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count INTEGER := 0;
  updated_count  INTEGER := 0;
  row_data       JSONB;
  h              TEXT;
BEGIN
  IF NOT public.has_brand_access(p_brand_id) THEN
    RAISE EXCEPTION 'Access denied to brand %', p_brand_id;
  END IF;

  FOR row_data IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    -- Hash canônico: brand + date + campaign + adset + ad (§14.1)
    h := encode(
      digest(
        p_brand_id::TEXT || '|'
          || COALESCE(row_data->>'report_start', '') || '|'
          || COALESCE(row_data->>'campaign_name', '') || '|'
          || COALESCE(row_data->>'adset_name', '') || '|'
          || COALESCE(row_data->>'ad_name', ''),
        'sha256'
      ),
      'hex'
    );

    INSERT INTO public.media_performance (
      brand_id,
      report_start,
      report_end,
      campaign_name,
      adset_name,
      ad_name,
      account_name,
      impressions,
      clicks_all,
      link_clicks,
      spend,
      purchases,
      conversion_value,
      ctr_all,
      ctr_link,
      row_hash
    )
    VALUES (
      p_brand_id,
      (row_data->>'report_start')::DATE,
      (row_data->>'report_end')::DATE,
      row_data->>'campaign_name',
      row_data->>'adset_name',
      row_data->>'ad_name',
      row_data->>'account_name',
      COALESCE((row_data->>'impressions')::INTEGER, 0),
      COALESCE((row_data->>'clicks_all')::INTEGER, 0),
      COALESCE((row_data->>'link_clicks')::INTEGER, 0),
      COALESCE((row_data->>'spend')::NUMERIC, 0),
      COALESCE((row_data->>'purchases')::INTEGER, 0),
      COALESCE((row_data->>'revenue')::NUMERIC, 0),
      COALESCE((row_data->>'ctr_all')::NUMERIC, 0),
      COALESCE((row_data->>'ctr_link')::NUMERIC, 0),
      h
    )
    ON CONFLICT (brand_id, row_hash) DO UPDATE SET
      impressions  = EXCLUDED.impressions,
      clicks_all   = EXCLUDED.clicks_all,
      link_clicks  = EXCLUDED.link_clicks,
      spend        = EXCLUDED.spend,
      purchases    = EXCLUDED.purchases,
      conversion_value = EXCLUDED.conversion_value,
      updated_at   = NOW();

    IF FOUND THEN
      updated_count := updated_count + 1;
    ELSE
      inserted_count := inserted_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'inserted', inserted_count,
    'updated', updated_count
  );
END;
$$;

-- -------------------------------------------------------
-- 11. RPC: set_media_anomaly — Saneamento de linha Meta
--     Registra auditoria na anomaly_reviews (§8.2)
-- -------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_media_anomaly(
  p_row_id   UUID,
  p_ignored  BOOLEAN,
  p_reason   TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_brand_id UUID;
BEGIN
  SELECT brand_id INTO v_brand_id
  FROM public.media_performance
  WHERE id = p_row_id;

  IF v_brand_id IS NULL THEN
    RAISE EXCEPTION 'Media row % not found', p_row_id;
  END IF;

  IF NOT public.has_brand_access(v_brand_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE public.media_performance
  SET
    is_ignored   = p_ignored,
    ignore_reason = CASE WHEN p_ignored THEN NULLIF(trim(COALESCE(p_reason, '')), '') ELSE NULL END,
    ignored_by   = CASE WHEN p_ignored THEN auth.uid() ELSE NULL END,
    ignored_at   = CASE WHEN p_ignored THEN NOW() ELSE NULL END,
    updated_at   = NOW()
  WHERE id = p_row_id;

  -- Auditoria obrigatória (§15)
  INSERT INTO public.anomaly_reviews (
    brand_id,
    source_table,
    source_row_id,
    anomaly_type,
    action,
    reason,
    reviewed_by
  )
  VALUES (
    v_brand_id,
    'media_performance',
    p_row_id,
    'manual_review',
    CASE WHEN p_ignored THEN 'ignored' ELSE 'restored' END,
    p_reason,
    auth.uid()
  );

  RETURN p_row_id;
END;
$$;

-- -------------------------------------------------------
-- 12. RPC: get_dre_monthly — Retorna DRE de um mês/marca
-- -------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_dre_monthly(
  p_brand_id UUID,
  p_yearmonth TEXT  -- formato 'YYYY-MM'
)
RETURNS TABLE (
  yearmonth           TEXT,
  gross_revenue       NUMERIC,
  discount_value      NUMERIC,
  net_revenue         NUMERIC,
  cmv_total           NUMERIC,
  gross_margin        NUMERIC,
  adcost              NUMERIC,
  contribution_margin NUMERIC,
  fixed_expenses      NUMERIC,
  resultado           NUMERIC,
  qty_real            NUMERIC,
  ticket_medio        NUMERIC,
  roas_bruto          NUMERIC,
  roas_liquido        NUMERIC,
  cmv_pct_rld         NUMERIC,
  adcost_pct_rld      NUMERIC,
  cm_pct_rld          NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_brand_access(p_brand_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    d.yearmonth,
    d.gross_revenue,
    d.discount_value,
    d.net_revenue,
    d.cmv_total,
    d.gross_margin,
    d.adcost,
    d.contribution_margin,
    d.fixed_expenses,
    d.resultado,
    d.qty_real,
    d.ticket_medio,
    d.roas_bruto,
    d.roas_liquido,
    d.cmv_pct_rld,
    d.adcost_pct_rld,
    d.cm_pct_rld
  FROM public.v_dre_monthly d
  WHERE d.brand_id = p_brand_id
    AND (p_yearmonth IS NULL OR d.yearmonth = p_yearmonth)
  ORDER BY d.yearmonth;
END;
$$;

-- -------------------------------------------------------
-- 13. RPC: get_daily_metrics — Range de datas de uma marca
-- -------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_daily_metrics(
  p_brand_id UUID,
  p_from DATE DEFAULT NULL,
  p_to   DATE DEFAULT NULL
)
RETURNS SETOF public.v_daily_metrics
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- -------------------------------------------------------
-- 14. RPC: get_dashboard_kpis — KPIs Acumulados de marca
-- -------------------------------------------------------

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
    'ticket_medio',        CASE WHEN SUM(qty_real) > 0 THEN SUM(gross_revenue) / SUM(qty_real) ELSE NULL END,
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

-- -------------------------------------------------------
-- 15. Índice de performance: pgcrypto para row_hash
-- -------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -------------------------------------------------------
-- 16. Grants de execução para authenticated
-- -------------------------------------------------------

GRANT EXECUTE ON FUNCTION public.ingest_orders_paid(UUID, JSONB)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.ingest_order_lines(UUID, JSONB)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.ingest_meta_raw(UUID, JSONB)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_media_anomaly(UUID, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dre_monthly(UUID, TEXT)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_metrics(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_kpis(UUID, DATE, DATE) TO authenticated;
GRANT SELECT ON public.v_daily_metrics  TO authenticated;
GRANT SELECT ON public.v_dre_monthly    TO authenticated;
GRANT SELECT ON public.v_dashboard_kpis TO authenticated;
