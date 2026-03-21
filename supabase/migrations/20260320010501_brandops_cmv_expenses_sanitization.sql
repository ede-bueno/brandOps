CREATE EXTENSION IF NOT EXISTS unaccent;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'cmv_match_type'
  ) THEN
    CREATE TYPE public.cmv_match_type AS ENUM ('SKU', 'PRODUCT', 'TYPE');
  END IF;
END
$$;

ALTER TABLE public.cmv_history
  ADD COLUMN IF NOT EXISTS match_type public.cmv_match_type,
  ADD COLUMN IF NOT EXISTS match_value TEXT,
  ADD COLUMN IF NOT EXISTS match_label TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

UPDATE public.cmv_history
SET match_type = COALESCE(match_type, 'PRODUCT'::public.cmv_match_type),
    match_value = COALESCE(NULLIF(match_value, ''), sku),
    match_label = COALESCE(NULLIF(match_label, ''), sku)
WHERE match_type IS NULL
   OR match_value IS NULL
   OR match_label IS NULL;

ALTER TABLE public.cmv_history
  ALTER COLUMN match_type SET NOT NULL,
  ALTER COLUMN match_value SET NOT NULL,
  ALTER COLUMN match_label SET NOT NULL;

DROP INDEX IF EXISTS public.idx_cmv_history_single_open;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cmv_history_single_open_rule
  ON public.cmv_history (brand_id, match_type, match_value)
  WHERE valid_to IS NULL;

CREATE TABLE IF NOT EXISTS public.cmv_checkpoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.user_profiles(id),
  note TEXT,
  items_updated INTEGER NOT NULL DEFAULT 0,
  unmatched_items INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.cmv_checkpoints ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS product_type TEXT,
  ADD COLUMN IF NOT EXISTS cmv_rule_type public.cmv_match_type,
  ADD COLUMN IF NOT EXISTS cmv_rule_value TEXT,
  ADD COLUMN IF NOT EXISTS cmv_rule_label TEXT,
  ADD COLUMN IF NOT EXISTS cmv_applied_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS cmv_checkpoint_id UUID REFERENCES public.cmv_checkpoints(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_ignored BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ignore_reason TEXT,
  ADD COLUMN IF NOT EXISTS ignored_by UUID REFERENCES public.user_profiles(id),
  ADD COLUMN IF NOT EXISTS ignored_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS is_ignored BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ignore_reason TEXT,
  ADD COLUMN IF NOT EXISTS ignored_by UUID REFERENCES public.user_profiles(id),
  ADD COLUMN IF NOT EXISTS ignored_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.sales_lines
  ADD COLUMN IF NOT EXISTS is_ignored BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ignore_reason TEXT,
  ADD COLUMN IF NOT EXISTS ignored_by UUID REFERENCES public.user_profiles(id),
  ADD COLUMN IF NOT EXISTS ignored_at TIMESTAMP WITH TIME ZONE;

CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#7C8DB5',
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS idx_expense_categories_brand_name_unique
  ON public.expense_categories (brand_id, lower(name));

CREATE TABLE IF NOT EXISTS public.brand_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.expense_categories(id) ON DELETE RESTRICT,
  description TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  incurred_on DATE NOT NULL,
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.brand_expenses ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_cmv_checkpoints_brand_id
  ON public.cmv_checkpoints (brand_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_items_cmv_checkpoint_id
  ON public.order_items (cmv_checkpoint_id);

CREATE INDEX IF NOT EXISTS idx_order_items_brand_order_date
  ON public.order_items (brand_id, order_date);

CREATE INDEX IF NOT EXISTS idx_orders_brand_order_number
  ON public.orders (brand_id, order_number);

CREATE INDEX IF NOT EXISTS idx_sales_lines_brand_order_number
  ON public.sales_lines (brand_id, order_number);

CREATE INDEX IF NOT EXISTS idx_brand_expenses_brand_incurred_on
  ON public.brand_expenses (brand_id, incurred_on DESC);

CREATE OR REPLACE FUNCTION public.normalize_brandops_text(value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(regexp_replace(lower(unaccent(COALESCE(value, ''))), '\s+', ' ', 'g'));
$$;

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
  normalized_sku TEXT := public.normalize_brandops_text(p_sku);
  haystack TEXT := concat_ws(' ', normalized_title, normalized_sku);
BEGIN
  IF haystack = '' THEN
    RETURN NULL;
  END IF;

  IF haystack LIKE '%cropped moletom%' THEN
    RETURN 'Cropped moletom';
  ELSIF haystack LIKE '%hoodie moletom%' OR haystack LIKE '%moletom hoodie%' OR haystack LIKE '%hoodie%' THEN
    RETURN 'Hoodie moletom';
  ELSIF haystack LIKE '%sueter moletom%' OR haystack LIKE '%sueter%' OR haystack LIKE '%sueter moletom%' THEN
    RETURN 'Suéter moletom';
  ELSIF haystack LIKE '%oversized%' THEN
    RETURN 'Oversized';
  ELSIF haystack LIKE '%peruana%' OR haystack LIKE '%algodao peruano%' THEN
    RETURN 'Peruana';
  ELSIF haystack LIKE '%body infantil%' OR haystack LIKE '%body%' THEN
    RETURN 'Body infantil';
  ELSIF haystack LIKE '%infantil%' THEN
    RETURN 'Infantil (tee)';
  ELSIF haystack LIKE '%regata%' THEN
    RETURN 'Regata';
  ELSIF haystack LIKE '%cropped%' THEN
    RETURN 'Cropped (tee)';
  ELSIF haystack LIKE '%camiseta classica%' OR haystack LIKE '%camiseta classica/fem%' OR haystack LIKE '%classica/fem%' OR haystack LIKE '%camiseta%' THEN
    RETURN 'Camiseta clássica/fem';
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_cmv_rule(
  p_brand_id UUID,
  p_match_type public.cmv_match_type,
  p_match_value TEXT,
  p_match_label TEXT,
  p_cmv_unit NUMERIC,
  p_source TEXT DEFAULT 'manual',
  p_valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_match_value TEXT := public.normalize_brandops_text(p_match_value);
  next_entry_id UUID;
BEGIN
  IF NOT public.has_brand_access(p_brand_id) THEN
    RAISE EXCEPTION 'You do not have access to this brand.';
  END IF;

  IF normalized_match_value = '' THEN
    RAISE EXCEPTION 'CMV rule must have a match value.';
  END IF;

  UPDATE public.cmv_history
  SET valid_to = COALESCE(p_valid_from, NOW()),
      updated_at = NOW()
  WHERE brand_id = p_brand_id
    AND match_type = p_match_type
    AND match_value = normalized_match_value
    AND valid_to IS NULL;

  INSERT INTO public.cmv_history (
    brand_id,
    sku,
    cmv_unit,
    valid_from,
    match_type,
    match_value,
    match_label,
    source
  )
  VALUES (
    p_brand_id,
    normalized_match_value,
    p_cmv_unit,
    COALESCE(p_valid_from, NOW()),
    p_match_type,
    normalized_match_value,
    COALESCE(NULLIF(trim(p_match_label), ''), trim(p_match_value)),
    COALESCE(NULLIF(trim(p_source), ''), 'manual')
  )
  RETURNING id INTO next_entry_id;

  RETURN next_entry_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_cmv_checkpoint(
  p_brand_id UUID,
  p_note TEXT DEFAULT NULL
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
BEGIN
  IF NOT public.has_brand_access(p_brand_id) THEN
    RAISE EXCEPTION 'You do not have access to this brand.';
  END IF;

  INSERT INTO public.cmv_checkpoints (brand_id, created_by, note)
  VALUES (p_brand_id, auth.uid(), NULLIF(trim(COALESCE(p_note, '')), ''))
  RETURNING id INTO checkpoint_id;

  WITH prepared_items AS (
    SELECT
      oi.id,
      oi.quantity,
      oi.order_date,
      oi.product_name,
      oi.product_specs,
      oi.sku,
      public.normalize_brandops_text(COALESCE(oi.sku, '')) AS normalized_sku,
      public.normalize_brandops_text(COALESCE(oi.product_name, '')) AS normalized_product,
      public.detect_brandops_product_type(oi.product_name, oi.sku) AS detected_type
    FROM public.order_items oi
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
        AND history.valid_from <= COALESCE(item.order_date, NOW())
        AND (history.valid_to IS NULL OR history.valid_to > COALESCE(item.order_date, NOW()))
        AND (
          (history.match_type = 'SKU' AND history.match_value = item.normalized_sku)
          OR (history.match_type = 'PRODUCT' AND history.match_value = item.normalized_product)
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
        cmv_applied_at = NOW(),
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

CREATE OR REPLACE FUNCTION public.set_media_row_ignore_state(
  p_row_id UUID,
  p_is_ignored BOOLEAN,
  p_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_brand_id UUID;
BEGIN
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
  SET is_ignored = p_is_ignored,
      ignore_reason = CASE WHEN p_is_ignored THEN NULLIF(trim(COALESCE(p_reason, '')), '') ELSE NULL END,
      ignored_at = CASE WHEN p_is_ignored THEN NOW() ELSE NULL END,
      ignored_by = CASE WHEN p_is_ignored THEN auth.uid() ELSE NULL END,
      updated_at = NOW()
  WHERE id = p_row_id;

  RETURN p_row_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_order_ignore_state(
  p_brand_id UUID,
  p_order_number TEXT,
  p_is_ignored BOOLEAN,
  p_reason TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_brand_access(p_brand_id) THEN
    RAISE EXCEPTION 'You do not have access to this brand.';
  END IF;

  UPDATE public.orders
  SET is_ignored = p_is_ignored,
      ignore_reason = CASE WHEN p_is_ignored THEN NULLIF(trim(COALESCE(p_reason, '')), '') ELSE NULL END,
      ignored_at = CASE WHEN p_is_ignored THEN NOW() ELSE NULL END,
      ignored_by = CASE WHEN p_is_ignored THEN auth.uid() ELSE NULL END,
      updated_at = NOW()
  WHERE brand_id = p_brand_id
    AND order_number = p_order_number;

  UPDATE public.order_items
  SET is_ignored = p_is_ignored,
      ignore_reason = CASE WHEN p_is_ignored THEN NULLIF(trim(COALESCE(p_reason, '')), '') ELSE NULL END,
      ignored_at = CASE WHEN p_is_ignored THEN NOW() ELSE NULL END,
      ignored_by = CASE WHEN p_is_ignored THEN auth.uid() ELSE NULL END
  WHERE brand_id = p_brand_id
    AND order_number = p_order_number;

  UPDATE public.sales_lines
  SET is_ignored = p_is_ignored,
      ignore_reason = CASE WHEN p_is_ignored THEN NULLIF(trim(COALESCE(p_reason, '')), '') ELSE NULL END,
      ignored_at = CASE WHEN p_is_ignored THEN NOW() ELSE NULL END,
      ignored_by = CASE WHEN p_is_ignored THEN auth.uid() ELSE NULL END,
      updated_at = NOW()
  WHERE brand_id = p_brand_id
    AND order_number = p_order_number;

  RETURN p_order_number;
END;
$$;

INSERT INTO public.expense_categories (brand_id, name, color, is_system)
SELECT NULL, seed.name, seed.color, TRUE
FROM (
  VALUES
    ('Pró-labore', '#8B5CF6'),
    ('Salários', '#2563EB'),
    ('IA', '#0F766E'),
    ('Equipamentos', '#B45309'),
    ('Software', '#475569'),
    ('Serviços', '#DC2626'),
    ('Impostos', '#7C3AED'),
    ('Outras despesas', '#6B7280')
) AS seed(name, color)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.expense_categories existing
  WHERE existing.brand_id IS NULL
    AND lower(existing.name) = lower(seed.name)
);

DROP POLICY IF EXISTS "Brand members can manage cmv history" ON public.cmv_history;
CREATE POLICY "Brand members can manage cmv history"
  ON public.cmv_history
  FOR ALL
  USING (public.has_brand_access(brand_id))
  WITH CHECK (public.has_brand_access(brand_id));

DROP POLICY IF EXISTS "Brand members can manage cmv checkpoints" ON public.cmv_checkpoints;
CREATE POLICY "Brand members can manage cmv checkpoints"
  ON public.cmv_checkpoints
  FOR ALL
  USING (public.has_brand_access(brand_id))
  WITH CHECK (public.has_brand_access(brand_id));

DROP POLICY IF EXISTS "Brand members can manage expense categories" ON public.expense_categories;
CREATE POLICY "Brand members can manage expense categories"
  ON public.expense_categories
  FOR ALL
  USING (brand_id IS NULL OR public.has_brand_access(brand_id))
  WITH CHECK (
    public.is_super_admin()
    OR (brand_id IS NOT NULL AND public.has_brand_access(brand_id))
  );

DROP POLICY IF EXISTS "Brand members can manage brand expenses" ON public.brand_expenses;
CREATE POLICY "Brand members can manage brand expenses"
  ON public.brand_expenses
  FOR ALL
  USING (public.has_brand_access(brand_id))
  WITH CHECK (public.has_brand_access(brand_id));

DROP TRIGGER IF EXISTS set_expense_categories_updated_at ON public.expense_categories;
CREATE TRIGGER set_expense_categories_updated_at
  BEFORE UPDATE ON public.expense_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_brand_expenses_updated_at ON public.brand_expenses;
CREATE TRIGGER set_brand_expenses_updated_at
  BEFORE UPDATE ON public.brand_expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
