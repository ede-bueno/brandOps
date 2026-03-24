CREATE OR REPLACE FUNCTION public.detect_brandops_product_type(
  p_title TEXT,
  p_sku TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  normalized_title TEXT := public.normalize_brandops_text(p_title);
  normalized_context TEXT := public.normalize_brandops_text(p_sku);
  haystack TEXT := concat_ws(' ', normalized_title, normalized_context);
BEGIN
  IF haystack = '' THEN
    RETURN NULL;
  END IF;

  IF haystack LIKE '%cropped moletom%' THEN
    RETURN 'Cropped moletom';
  ELSIF haystack LIKE '%hoodie moletom%' OR haystack LIKE '%moletom hoodie%' OR haystack LIKE '%hoodie%' THEN
    RETURN 'Hoodie moletom';
  ELSIF haystack LIKE '%sueter moletom%' OR haystack LIKE '%sueter%' THEN
    RETURN 'Suéter moletom';
  ELSIF haystack LIKE '%oversized%' THEN
    RETURN 'Oversized';
  ELSIF haystack LIKE '%peruana%' OR haystack LIKE '%algodao peruano%' THEN
    RETURN 'Camiseta Peruana';
  ELSIF haystack LIKE '%body infantil%' OR haystack LIKE '%body%' THEN
    RETURN 'Body';
  ELSIF haystack LIKE '%infantil%' OR haystack LIKE '%mini%' THEN
    RETURN 'Mini';
  ELSIF haystack LIKE '%regata%' THEN
    RETURN 'Regata';
  ELSIF haystack LIKE '%cropped%' THEN
    RETURN 'Cropped';
  ELSIF haystack LIKE '%camiseta%' OR haystack LIKE '%masculino%' OR haystack LIKE '%feminino%' OR haystack LIKE '%unissex%' THEN
    RETURN 'Camiseta';
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_cmv_checkpoint(
  p_brand_id UUID,
  p_note TEXT DEFAULT NULL,
  p_created_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  checkpoint_id UUID;
  updated_count INTEGER := 0;
  unmatched_count INTEGER := 0;
  v_checkpoint_time TIMESTAMP WITH TIME ZONE;
BEGIN
  IF NOT public.has_brand_access(p_brand_id) THEN
    RAISE EXCEPTION 'You do not have access to this brand.';
  END IF;

  v_checkpoint_time := COALESCE(p_created_at, NOW());

  INSERT INTO public.cmv_checkpoints (brand_id, created_by, note, created_at)
  VALUES (p_brand_id, auth.uid(), NULLIF(trim(COALESCE(p_note, '')), ''), v_checkpoint_time)
  RETURNING id INTO checkpoint_id;

  WITH prepared_items AS (
    SELECT
      oi.id,
      oi.quantity,
      oi.order_date,
      oi.product_name,
      oi.product_specs,
      oi.sku,
      sl.product_id AS sales_product_id,
      sl.product_name AS sales_product_name,
      p.title AS catalog_title,
      public.normalize_brandops_text(COALESCE(sl.product_id, sl.sku, oi.sku, '')) AS normalized_sku,
      public.normalize_brandops_text(
        COALESCE(
          p.title,
          regexp_replace(COALESCE(sl.product_name, ''), '^Venda online de peças de vestuário - ', ''),
          oi.product_name,
          ''
        )
      ) AS normalized_product,
      public.detect_brandops_product_type(
        COALESCE(
          p.title,
          regexp_replace(COALESCE(sl.product_name, ''), '^Venda online de peças de vestuário - ', ''),
          oi.product_name
        ),
        concat_ws(' ', oi.product_specs, sl.product_id, sl.sku, oi.sku)
      ) AS detected_type
    FROM public.order_items oi
    LEFT JOIN LATERAL (
      SELECT sl.*
      FROM public.sales_lines sl
      WHERE sl.brand_id = oi.brand_id
        AND sl.order_number = oi.order_number
        AND (
          public.normalize_brandops_text(sl.product_name) LIKE '%' || public.normalize_brandops_text(oi.product_name) || '%'
          OR public.normalize_brandops_text(oi.product_name) LIKE '%' || public.normalize_brandops_text(sl.product_name) || '%'
        )
      ORDER BY
        CASE
          WHEN public.normalize_brandops_text(sl.product_name) = public.normalize_brandops_text(oi.product_name) THEN 0
          ELSE 1
        END,
        sl.created_at DESC
      LIMIT 1
    ) sl ON TRUE
    LEFT JOIN public.products p
      ON p.brand_id = oi.brand_id
     AND p.sku = sl.product_id
    WHERE oi.brand_id = p_brand_id
  ),
  resolved_rules AS (
    SELECT
      item.id,
      item.detected_type,
      rule.match_type,
      rule.match_value,
      rule.match_label,
      rule.cmv_unit
    FROM prepared_items item
    LEFT JOIN LATERAL (
      SELECT
        history.match_type,
        history.match_value,
        history.match_label,
        history.cmv_unit
      FROM public.cmv_history history
      WHERE history.brand_id = p_brand_id
        AND history.valid_from <= COALESCE(item.order_date, v_checkpoint_time)
        AND (history.valid_to IS NULL OR history.valid_to > COALESCE(item.order_date, v_checkpoint_time))
        AND (
          (history.match_type = 'SKU' AND history.match_value = item.normalized_sku)
          OR (history.match_type = 'PRODUCT' AND (
            history.match_value = item.normalized_product
            OR item.normalized_product LIKE history.match_value || '%'
            OR history.match_value LIKE item.normalized_product || '%'
          ))
          OR (
            history.match_type = 'TYPE'
            AND history.match_value = public.normalize_brandops_text(COALESCE(item.detected_type, ''))
          )
        )
      ORDER BY
        CASE history.match_type
          WHEN 'SKU' THEN 1
          WHEN 'PRODUCT' THEN 2
          ELSE 3
        END,
        history.valid_from DESC
      LIMIT 1
    ) rule ON TRUE
  ),
  applied AS (
    UPDATE public.order_items target
    SET product_type = resolved.detected_type,
        cmv_unit_applied = COALESCE(resolved.cmv_unit, 0),
        cmv_total_applied = COALESCE(resolved.cmv_unit, 0) * COALESCE(target.quantity, 0),
        cmv_rule_type = resolved.match_type,
        cmv_rule_value = resolved.match_value,
        cmv_rule_label = resolved.match_label,
        cmv_applied_at = v_checkpoint_time,
        cmv_checkpoint_id = checkpoint_id
    FROM resolved_rules resolved
    WHERE target.id = resolved.id
    RETURNING resolved.match_value
  )
  SELECT
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE match_value IS NULL)::INTEGER
  INTO updated_count, unmatched_count
  FROM applied;

  UPDATE public.cmv_checkpoints
  SET items_updated = updated_count,
      unmatched_items = unmatched_count
  WHERE id = checkpoint_id;

  RETURN jsonb_build_object(
    'checkpoint_id', checkpoint_id,
    'items_updated', updated_count,
    'unmatched_items', unmatched_count
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
  row_data        JSONB;
  inserted_count  INTEGER := 0;
  h               TEXT;
  v_sale_date     TIMESTAMP WITH TIME ZONE;
  v_qty           INTEGER;
  v_norm_sku      TEXT;
  v_norm_product  TEXT;
  v_cmv_unit      NUMERIC := 0;
  v_match_type    public.cmv_match_type;
  v_match_value   TEXT;
  v_match_label   TEXT;
  v_product_type  TEXT;
BEGIN
  IF NOT public.has_brand_access(p_brand_id) THEN
    RAISE EXCEPTION 'Access denied to brand %', p_brand_id;
  END IF;

  FOR row_data IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
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
