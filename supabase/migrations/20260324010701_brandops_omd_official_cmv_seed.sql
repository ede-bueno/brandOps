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
  ELSIF haystack LIKE '%dad hat%' OR haystack LIKE '%bone%' THEN
    RETURN 'Bone Dad Hat';
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

DO $$
DECLARE
  v_brand_id UUID;
  v_source TEXT := 'omd_oficial_20260324';
BEGIN
  SELECT id
  INTO v_brand_id
  FROM public.brands
  WHERE lower(name) = 'oh my dog'
  LIMIT 1;

  IF v_brand_id IS NULL THEN
    RETURN;
  END IF;

  DELETE FROM public.cmv_history
  WHERE brand_id = v_brand_id
    AND match_type IN ('TYPE', 'PRODUCT', 'SKU');

  INSERT INTO public.cmv_history (
    brand_id,
    sku,
    cmv_unit,
    valid_from,
    valid_to,
    match_type,
    match_value,
    match_label,
    source
  )
  VALUES
    (v_brand_id, public.normalize_brandops_text('Regata'), 37, '2025-01-01T00:00:00+00:00', '2026-03-01T00:00:00+00:00', 'TYPE', public.normalize_brandops_text('Regata'), 'Regata', v_source),
    (v_brand_id, public.normalize_brandops_text('Regata'), 46, '2026-03-01T00:00:00+00:00', NULL, 'TYPE', public.normalize_brandops_text('Regata'), 'Regata', v_source),

    (v_brand_id, public.normalize_brandops_text('Cropped'), 37, '2025-01-01T00:00:00+00:00', '2026-03-01T00:00:00+00:00', 'TYPE', public.normalize_brandops_text('Cropped'), 'Cropped', v_source),
    (v_brand_id, public.normalize_brandops_text('Cropped'), 44, '2026-03-01T00:00:00+00:00', NULL, 'TYPE', public.normalize_brandops_text('Cropped'), 'Cropped', v_source),

    (v_brand_id, public.normalize_brandops_text('Mini'), 37, '2025-01-01T00:00:00+00:00', '2026-03-01T00:00:00+00:00', 'TYPE', public.normalize_brandops_text('Mini'), 'Mini', v_source),
    (v_brand_id, public.normalize_brandops_text('Mini'), 46, '2026-03-01T00:00:00+00:00', NULL, 'TYPE', public.normalize_brandops_text('Mini'), 'Mini', v_source),

    (v_brand_id, public.normalize_brandops_text('Body'), 37, '2025-01-01T00:00:00+00:00', '2026-03-01T00:00:00+00:00', 'TYPE', public.normalize_brandops_text('Body'), 'Body', v_source),
    (v_brand_id, public.normalize_brandops_text('Body'), 46, '2026-03-01T00:00:00+00:00', NULL, 'TYPE', public.normalize_brandops_text('Body'), 'Body', v_source),

    (v_brand_id, public.normalize_brandops_text('Camiseta'), 44, '2025-01-01T00:00:00+00:00', '2026-03-01T00:00:00+00:00', 'TYPE', public.normalize_brandops_text('Camiseta'), 'Camiseta', v_source),
    (v_brand_id, public.normalize_brandops_text('Camiseta'), 49.9, '2026-03-01T00:00:00+00:00', NULL, 'TYPE', public.normalize_brandops_text('Camiseta'), 'Camiseta', v_source),

    (v_brand_id, public.normalize_brandops_text('Camiseta Peruana'), 59, '2025-01-01T00:00:00+00:00', '2026-03-01T00:00:00+00:00', 'TYPE', public.normalize_brandops_text('Camiseta Peruana'), 'Camiseta Peruana', v_source),
    (v_brand_id, public.normalize_brandops_text('Camiseta Peruana'), 65, '2026-03-01T00:00:00+00:00', NULL, 'TYPE', public.normalize_brandops_text('Camiseta Peruana'), 'Camiseta Peruana', v_source),

    (v_brand_id, public.normalize_brandops_text('Oversized'), 69, '2025-01-01T00:00:00+00:00', '2026-03-01T00:00:00+00:00', 'TYPE', public.normalize_brandops_text('Oversized'), 'Oversized', v_source),
    (v_brand_id, public.normalize_brandops_text('Oversized'), 75, '2026-03-01T00:00:00+00:00', NULL, 'TYPE', public.normalize_brandops_text('Oversized'), 'Oversized', v_source),

    (v_brand_id, public.normalize_brandops_text('Cropped moletom'), 69, '2025-01-01T00:00:00+00:00', NULL, 'TYPE', public.normalize_brandops_text('Cropped moletom'), 'Cropped moletom', v_source),
    (v_brand_id, public.normalize_brandops_text('Suéter moletom'), 90, '2025-01-01T00:00:00+00:00', NULL, 'TYPE', public.normalize_brandops_text('Suéter moletom'), 'Suéter moletom', v_source),
    (v_brand_id, public.normalize_brandops_text('Hoodie moletom'), 110, '2025-01-01T00:00:00+00:00', NULL, 'TYPE', public.normalize_brandops_text('Hoodie moletom'), 'Hoodie moletom', v_source),
    (v_brand_id, public.normalize_brandops_text('Bone Dad Hat'), 46, '2026-03-01T00:00:00+00:00', NULL, 'TYPE', public.normalize_brandops_text('Bone Dad Hat'), 'Bone Dad Hat', v_source);
END;
$$;
