BEGIN;

WITH global_categories_in_use AS (
  SELECT DISTINCT
    be.brand_id,
    ec.name,
    ec.color
  FROM public.brand_expenses be
  JOIN public.expense_categories ec
    ON ec.id = be.category_id
  WHERE ec.brand_id IS NULL
),
missing_brand_categories AS (
  SELECT
    g.brand_id,
    g.name,
    g.color
  FROM global_categories_in_use g
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.expense_categories existing
    WHERE existing.brand_id = g.brand_id
      AND lower(existing.name) = lower(g.name)
  )
)
INSERT INTO public.expense_categories (brand_id, name, color, is_system)
SELECT
  brand_id,
  name,
  color,
  FALSE
FROM missing_brand_categories;

UPDATE public.brand_expenses be
SET category_id = target.id
FROM public.expense_categories source,
     public.expense_categories target
WHERE be.category_id = source.id
  AND source.brand_id IS NULL
  AND target.brand_id = be.brand_id
  AND lower(target.name) = lower(source.name);

UPDATE public.expense_categories
SET is_system = FALSE
WHERE is_system = TRUE;

DELETE FROM public.expense_categories
WHERE brand_id IS NULL;

DROP POLICY IF EXISTS "Brand members can manage expense categories" ON public.expense_categories;
CREATE POLICY "Brand members can manage expense categories"
  ON public.expense_categories
  FOR ALL
  USING (public.has_brand_access(brand_id))
  WITH CHECK (public.has_brand_access(brand_id));

COMMIT;
