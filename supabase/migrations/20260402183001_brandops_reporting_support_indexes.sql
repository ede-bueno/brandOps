CREATE INDEX IF NOT EXISTS idx_order_items_brand_date_active
  ON public.order_items (brand_id, order_date)
  WHERE COALESCE(is_ignored, FALSE) = FALSE;

CREATE INDEX IF NOT EXISTS idx_order_items_brand_sku_active
  ON public.order_items (brand_id, sku)
  WHERE COALESCE(is_ignored, FALSE) = FALSE AND sku IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_media_performance_brand_metric_date_active
  ON public.media_performance (brand_id, COALESCE(report_start, date))
  WHERE COALESCE(is_ignored, FALSE) = FALSE;

CREATE INDEX IF NOT EXISTS idx_ga4_daily_performance_brand_date
  ON public.ga4_daily_performance (brand_id, date);

CREATE INDEX IF NOT EXISTS idx_ga4_item_daily_performance_brand_date_item
  ON public.ga4_item_daily_performance (brand_id, date, item_id);

CREATE INDEX IF NOT EXISTS idx_brand_expenses_brand_incurred_on
  ON public.brand_expenses (brand_id, incurred_on);

CREATE INDEX IF NOT EXISTS idx_products_brand_sku
  ON public.products (brand_id, sku);

CREATE INDEX IF NOT EXISTS idx_brand_integrations_brand_provider
  ON public.brand_integrations (brand_id, provider);

CREATE OR REPLACE FUNCTION public.get_catalog_sales_summary(
  p_brand_id UUID,
  p_from DATE DEFAULT NULL,
  p_to DATE DEFAULT NULL
)
RETURNS TABLE (
  sku TEXT,
  units_sold BIGINT
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
    oi.sku::TEXT,
    SUM(COALESCE(oi.quantity, 0))::BIGINT AS units_sold
  FROM public.order_items oi
  WHERE oi.brand_id = p_brand_id
    AND COALESCE(oi.is_ignored, FALSE) = FALSE
    AND oi.sku IS NOT NULL
    AND TRIM(oi.sku) <> ''
    AND (p_from IS NULL OR oi.order_date >= p_from)
    AND (p_to   IS NULL OR oi.order_date <= p_to)
  GROUP BY oi.sku;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_product_order_signals(
  p_brand_id UUID,
  p_from DATE DEFAULT NULL,
  p_to DATE DEFAULT NULL
)
RETURNS TABLE (
  sku TEXT,
  product_name TEXT,
  product_specs TEXT,
  product_type TEXT,
  quantity BIGINT,
  gross_value NUMERIC
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
    oi.sku::TEXT,
    oi.product_name::TEXT,
    oi.product_specs::TEXT,
    oi.product_type::TEXT,
    SUM(COALESCE(oi.quantity, 0))::BIGINT AS quantity,
    SUM(COALESCE(oi.gross_value, 0))::NUMERIC AS gross_value
  FROM public.order_items oi
  WHERE oi.brand_id = p_brand_id
    AND COALESCE(oi.is_ignored, FALSE) = FALSE
    AND (p_from IS NULL OR oi.order_date >= p_from)
    AND (p_to   IS NULL OR oi.order_date <= p_to)
  GROUP BY oi.sku, oi.product_name, oi.product_specs, oi.product_type;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_catalog_sales_summary(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_product_order_signals(UUID, DATE, DATE) TO authenticated;
