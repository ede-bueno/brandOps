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
  ELSIF haystack LIKE '%body infantil%' OR haystack ~ '(^|[^a-z])body([^a-z]|$)' THEN
    RETURN 'Body';
  ELSIF haystack ~ '(^|[^a-z])(infantil|mini)([^a-z]|$)' THEN
    RETURN 'Mini';
  ELSIF haystack ~ '(^|[^a-z])regata([^a-z]|$)' THEN
    RETURN 'Regata';
  ELSIF haystack ~ '(^|[^a-z])cropped([^a-z]|$)' THEN
    RETURN 'Cropped';
  ELSIF haystack ~ '(^|[^a-z])(camiseta|masculino|feminino|unissex)([^a-z]|$)' THEN
    RETURN 'Camiseta';
  END IF;

  RETURN NULL;
END;
$$;
