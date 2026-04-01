BEGIN;

ALTER TABLE public.anomaly_reviews
  ADD COLUMN IF NOT EXISTS source_key TEXT;

UPDATE public.anomaly_reviews
SET action = CASE LOWER(COALESCE(action, ''))
  WHEN 'ignored' THEN 'IGNORED'
  WHEN 'kept' THEN 'KEPT'
  WHEN 'restored' THEN 'PENDING'
  WHEN 'pending' THEN 'PENDING'
  ELSE UPPER(action)
END;

ALTER TABLE public.anomaly_reviews
  DROP CONSTRAINT IF EXISTS anomaly_reviews_action_check;

ALTER TABLE public.anomaly_reviews
  ADD CONSTRAINT anomaly_reviews_action_check
  CHECK (action IN ('IGNORED', 'KEPT', 'PENDING'));

CREATE OR REPLACE FUNCTION public.set_media_sanitization_state(
  p_row_id UUID,
  p_status TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_brand_id UUID;
  target_row_hash TEXT;
  normalized_status TEXT := UPPER(TRIM(COALESCE(p_status, 'PENDING')));
  normalized_note TEXT := NULLIF(TRIM(COALESCE(p_note, '')), '');
BEGIN
  IF normalized_status NOT IN ('PENDING', 'KEPT', 'IGNORED') THEN
    RAISE EXCEPTION 'Invalid sanitization status: %', normalized_status;
  END IF;

  SELECT brand_id, row_hash
  INTO target_brand_id, target_row_hash
  FROM public.media_performance
  WHERE id = p_row_id;

  IF target_brand_id IS NULL THEN
    RAISE EXCEPTION 'Media row not found.';
  END IF;

  IF NOT public.has_brand_access(target_brand_id) THEN
    RAISE EXCEPTION 'You do not have access to this brand.';
  END IF;

  UPDATE public.media_performance
  SET sanitization_status = normalized_status,
      sanitization_note = CASE
        WHEN normalized_status = 'PENDING' THEN NULL
        ELSE normalized_note
      END,
      sanitized_at = CASE
        WHEN normalized_status = 'PENDING' THEN NULL
        ELSE NOW()
      END,
      sanitized_by = CASE
        WHEN normalized_status = 'PENDING' THEN NULL
        ELSE auth.uid()
      END,
      is_ignored = (normalized_status = 'IGNORED'),
      ignore_reason = CASE
        WHEN normalized_status = 'IGNORED' THEN normalized_note
        ELSE NULL
      END,
      ignored_at = CASE
        WHEN normalized_status = 'IGNORED' THEN NOW()
        ELSE NULL
      END,
      ignored_by = CASE
        WHEN normalized_status = 'IGNORED' THEN auth.uid()
        ELSE NULL
      END,
      updated_at = NOW()
  WHERE id = p_row_id;

  INSERT INTO public.anomaly_reviews (
    brand_id,
    source_table,
    source_row_id,
    source_key,
    anomaly_type,
    action,
    reason,
    reviewed_by,
    reviewed_at
  )
  VALUES (
    target_brand_id,
    'media_performance',
    p_row_id,
    target_row_hash,
    'sanitization_state',
    normalized_status,
    normalized_note,
    auth.uid(),
    NOW()
  );

  RETURN p_row_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_order_sanitization_state(
  p_brand_id UUID,
  p_order_number TEXT,
  p_status TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_status TEXT := UPPER(TRIM(COALESCE(p_status, 'PENDING')));
  normalized_note TEXT := NULLIF(TRIM(COALESCE(p_note, '')), '');
  target_order_id UUID;
BEGIN
  IF normalized_status NOT IN ('PENDING', 'KEPT', 'IGNORED') THEN
    RAISE EXCEPTION 'Invalid sanitization status: %', normalized_status;
  END IF;

  IF NOT public.has_brand_access(p_brand_id) THEN
    RAISE EXCEPTION 'You do not have access to this brand.';
  END IF;

  SELECT id
  INTO target_order_id
  FROM public.orders
  WHERE brand_id = p_brand_id
    AND order_number = p_order_number
  LIMIT 1;

  IF target_order_id IS NULL THEN
    RAISE EXCEPTION 'Order not found.';
  END IF;

  UPDATE public.orders
  SET sanitization_status = normalized_status,
      sanitization_note = CASE
        WHEN normalized_status = 'PENDING' THEN NULL
        ELSE normalized_note
      END,
      sanitized_at = CASE
        WHEN normalized_status = 'PENDING' THEN NULL
        ELSE NOW()
      END,
      sanitized_by = CASE
        WHEN normalized_status = 'PENDING' THEN NULL
        ELSE auth.uid()
      END,
      is_ignored = (normalized_status = 'IGNORED'),
      ignore_reason = CASE
        WHEN normalized_status = 'IGNORED' THEN normalized_note
        ELSE NULL
      END,
      ignored_at = CASE
        WHEN normalized_status = 'IGNORED' THEN NOW()
        ELSE NULL
      END,
      ignored_by = CASE
        WHEN normalized_status = 'IGNORED' THEN auth.uid()
        ELSE NULL
      END,
      updated_at = NOW()
  WHERE brand_id = p_brand_id
    AND order_number = p_order_number;

  UPDATE public.order_items
  SET is_ignored = (normalized_status = 'IGNORED'),
      ignore_reason = CASE
        WHEN normalized_status = 'IGNORED' THEN normalized_note
        ELSE NULL
      END,
      ignored_at = CASE
        WHEN normalized_status = 'IGNORED' THEN NOW()
        ELSE NULL
      END,
      ignored_by = CASE
        WHEN normalized_status = 'IGNORED' THEN auth.uid()
        ELSE NULL
      END
  WHERE brand_id = p_brand_id
    AND order_number = p_order_number;

  UPDATE public.sales_lines
  SET is_ignored = (normalized_status = 'IGNORED'),
      ignore_reason = CASE
        WHEN normalized_status = 'IGNORED' THEN normalized_note
        ELSE NULL
      END,
      ignored_at = CASE
        WHEN normalized_status = 'IGNORED' THEN NOW()
        ELSE NULL
      END,
      ignored_by = CASE
        WHEN normalized_status = 'IGNORED' THEN auth.uid()
        ELSE NULL
      END,
      updated_at = NOW()
  WHERE brand_id = p_brand_id
    AND order_number = p_order_number;

  INSERT INTO public.anomaly_reviews (
    brand_id,
    source_table,
    source_row_id,
    source_key,
    anomaly_type,
    action,
    reason,
    reviewed_by,
    reviewed_at
  )
  VALUES (
    p_brand_id,
    'orders',
    target_order_id,
    p_order_number,
    'sanitization_state',
    normalized_status,
    normalized_note,
    auth.uid(),
    NOW()
  );

  RETURN p_order_number;
END;
$$;

COMMIT;
