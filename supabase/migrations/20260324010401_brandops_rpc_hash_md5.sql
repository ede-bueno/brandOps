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
    h := md5(
      p_brand_id::TEXT || '|' || COALESCE(row_data->>'order_number', '')
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
    h := md5(
      p_brand_id::TEXT || '|'
        || COALESCE(row_data->>'order_number', '') || '|'
        || COALESCE(row_data->>'product_name', '') || '|'
        || COALESCE(row_data->>'sku', '') || '|'
        || COALESCE(row_data->>'product_specs', '')
    );

    v_sale_date    := (row_data->>'order_date')::TIMESTAMP WITH TIME ZONE;
    v_qty          := COALESCE((row_data->>'quantity')::INTEGER, 1);
    v_norm_sku     := public.normalize_brandops_text(COALESCE(row_data->>'sku', ''));
    v_norm_product := public.normalize_brandops_text(COALESCE(row_data->>'product_name', ''));
    v_product_type := public.detect_brandops_product_type(
      row_data->>'product_name',
      concat_ws(' ', COALESCE(row_data->>'product_specs', ''), COALESCE(row_data->>'sku', ''))
    );

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
        (history.match_type = 'SKU' AND history.match_value = v_norm_sku AND v_norm_sku != '')
        OR (history.match_type = 'PRODUCT' AND history.match_value = v_norm_product AND v_norm_product != '')
        OR (history.match_type = 'TYPE' AND history.match_value = public.normalize_brandops_text(COALESCE(v_product_type, '')))
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
      cmv_unit_applied  = CASE
        WHEN public.order_items.cmv_applied_at IS NULL THEN EXCLUDED.cmv_unit_applied
        ELSE public.order_items.cmv_unit_applied
      END,
      cmv_total_applied = CASE
        WHEN public.order_items.cmv_applied_at IS NULL THEN EXCLUDED.cmv_total_applied
        ELSE public.order_items.cmv_total_applied
      END,
      cmv_rule_type   = CASE WHEN public.order_items.cmv_applied_at IS NULL THEN EXCLUDED.cmv_rule_type ELSE public.order_items.cmv_rule_type END,
      cmv_rule_value  = CASE WHEN public.order_items.cmv_applied_at IS NULL THEN EXCLUDED.cmv_rule_value ELSE public.order_items.cmv_rule_value END,
      cmv_rule_label  = CASE WHEN public.order_items.cmv_applied_at IS NULL THEN EXCLUDED.cmv_rule_label ELSE public.order_items.cmv_rule_label END,
      cmv_applied_at  = CASE WHEN public.order_items.cmv_applied_at IS NULL THEN EXCLUDED.cmv_applied_at ELSE public.order_items.cmv_applied_at END,
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
    h := md5(
      p_brand_id::TEXT || '|'
        || COALESCE(row_data->>'report_start', '') || '|'
        || COALESCE(row_data->>'campaign_name', '') || '|'
        || COALESCE(row_data->>'adset_name', '') || '|'
        || COALESCE(row_data->>'ad_name', '')
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
      impressions      = EXCLUDED.impressions,
      clicks_all       = EXCLUDED.clicks_all,
      link_clicks      = EXCLUDED.link_clicks,
      spend            = EXCLUDED.spend,
      purchases        = EXCLUDED.purchases,
      conversion_value = EXCLUDED.conversion_value,
      updated_at       = NOW();

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
