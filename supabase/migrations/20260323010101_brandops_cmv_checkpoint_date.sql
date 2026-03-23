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
        COALESCE(sl.product_id, sl.sku, oi.sku)
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
