ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS sanitization_status TEXT,
  ADD COLUMN IF NOT EXISTS sanitization_note TEXT,
  ADD COLUMN IF NOT EXISTS sanitized_by UUID REFERENCES public.user_profiles(id),
  ADD COLUMN IF NOT EXISTS sanitized_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.media_performance
  ADD COLUMN IF NOT EXISTS sanitization_status TEXT,
  ADD COLUMN IF NOT EXISTS sanitization_note TEXT,
  ADD COLUMN IF NOT EXISTS sanitized_by UUID REFERENCES public.user_profiles(id),
  ADD COLUMN IF NOT EXISTS sanitized_at TIMESTAMP WITH TIME ZONE;

UPDATE public.orders
SET sanitization_status = CASE
    WHEN is_ignored THEN 'IGNORED'
    ELSE 'PENDING'
  END
WHERE sanitization_status IS NULL;

UPDATE public.media_performance
SET sanitization_status = CASE
    WHEN is_ignored THEN 'IGNORED'
    ELSE 'PENDING'
  END
WHERE sanitization_status IS NULL;

ALTER TABLE public.orders
  ALTER COLUMN sanitization_status SET DEFAULT 'PENDING',
  ALTER COLUMN sanitization_status SET NOT NULL;

ALTER TABLE public.media_performance
  ALTER COLUMN sanitization_status SET DEFAULT 'PENDING',
  ALTER COLUMN sanitization_status SET NOT NULL;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_sanitization_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_sanitization_status_check
  CHECK (sanitization_status IN ('PENDING', 'KEPT', 'IGNORED'));

ALTER TABLE public.media_performance
  DROP CONSTRAINT IF EXISTS media_performance_sanitization_status_check;

ALTER TABLE public.media_performance
  ADD CONSTRAINT media_performance_sanitization_status_check
  CHECK (sanitization_status IN ('PENDING', 'KEPT', 'IGNORED'));

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
  normalized_status TEXT := UPPER(TRIM(COALESCE(p_status, 'PENDING')));
  normalized_note TEXT := NULLIF(TRIM(COALESCE(p_note, '')), '');
BEGIN
  IF normalized_status NOT IN ('PENDING', 'KEPT', 'IGNORED') THEN
    RAISE EXCEPTION 'Invalid sanitization status: %', normalized_status;
  END IF;

  SELECT brand_id
  INTO target_brand_id
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
BEGIN
  IF normalized_status NOT IN ('PENDING', 'KEPT', 'IGNORED') THEN
    RAISE EXCEPTION 'Invalid sanitization status: %', normalized_status;
  END IF;

  IF NOT public.has_brand_access(p_brand_id) THEN
    RAISE EXCEPTION 'You do not have access to this brand.';
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

  RETURN p_order_number;
END;
$$;
