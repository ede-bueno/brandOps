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

  IF normalized_title LIKE '%cropped moletom%' OR normalized_context LIKE '%cropped moletom%' THEN
    RETURN 'Cropped moletom';
  ELSIF normalized_title LIKE '%hoodie moletom%'
    OR normalized_title LIKE '%moletom hoodie%'
    OR normalized_title LIKE '%hoodie%'
    OR normalized_context LIKE '%hoodie moletom%'
    OR normalized_context LIKE '%moletom hoodie%'
    OR normalized_context LIKE '%hoodie%' THEN
    RETURN 'Hoodie moletom';
  ELSIF normalized_title LIKE '%sueter moletom%'
    OR normalized_title LIKE '%sueter%'
    OR normalized_context LIKE '%sueter moletom%'
    OR normalized_context LIKE '%sueter%' THEN
    RETURN 'Suéter moletom';
  ELSIF normalized_title LIKE '%dad hat%'
    OR normalized_title ~ '(^|[^a-z])bone([^a-z]|$)'
    OR normalized_context LIKE '%dad hat%'
    OR normalized_context ~ '(^|[^a-z])bone([^a-z]|$)' THEN
    RETURN 'Bone Dad Hat';
  ELSIF normalized_title LIKE '%oversized%' OR normalized_context LIKE '%oversized%' THEN
    RETURN 'Oversized';
  ELSIF normalized_title LIKE '%peruana%'
    OR normalized_title LIKE '%algodao peruano%'
    OR normalized_context LIKE '%peruana%'
    OR normalized_context LIKE '%algodao peruano%' THEN
    RETURN 'Camiseta Peruana';
  ELSIF normalized_title LIKE '%body infantil%'
    OR normalized_title ~ '(^|[^a-z])body([^a-z]|$)' THEN
    RETURN 'Body';
  ELSIF normalized_title ~ '(^|[^a-z])regata([^a-z]|$)' THEN
    RETURN 'Regata';
  ELSIF normalized_title ~ '(^|[^a-z])cropped([^a-z]|$)' THEN
    RETURN 'Cropped';
  ELSIF normalized_title ~ '(^|[^a-z])(camiseta|masculino|feminino|unissex)([^a-z]|$)' THEN
    RETURN 'Camiseta';
  ELSIF normalized_context LIKE '%body infantil%'
    OR normalized_context ~ '(^|[^a-z])body([^a-z]|$)' THEN
    RETURN 'Body';
  ELSIF normalized_context ~ '(^|[^a-z])regata([^a-z]|$)' THEN
    RETURN 'Regata';
  ELSIF normalized_context ~ '(^|[^a-z])cropped([^a-z]|$)' THEN
    RETURN 'Cropped';
  ELSIF normalized_context ~ '(^|[^a-z])(infantil|mini)([^a-z]|$)' THEN
    RETURN 'Mini';
  ELSIF normalized_context ~ '(^|[^a-z])(camiseta|masculino|feminino|unissex)([^a-z]|$)' THEN
    RETURN 'Camiseta';
  END IF;

  RETURN NULL;
END;
$$;
