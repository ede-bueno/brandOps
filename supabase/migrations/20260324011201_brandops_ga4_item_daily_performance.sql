CREATE TABLE IF NOT EXISTS public.ga4_item_daily_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  item_id TEXT NOT NULL DEFAULT '',
  item_name TEXT NOT NULL DEFAULT '',
  item_brand TEXT NOT NULL DEFAULT '',
  item_category TEXT NOT NULL DEFAULT '',
  item_views INTEGER NOT NULL DEFAULT 0,
  add_to_carts INTEGER NOT NULL DEFAULT 0,
  checkouts INTEGER NOT NULL DEFAULT 0,
  ecommerce_purchases INTEGER NOT NULL DEFAULT 0,
  item_purchase_quantity INTEGER NOT NULL DEFAULT 0,
  item_revenue NUMERIC(12, 2) NOT NULL DEFAULT 0,
  cart_to_view_rate NUMERIC(10, 4) NOT NULL DEFAULT 0,
  purchase_to_view_rate NUMERIC(10, 4) NOT NULL DEFAULT 0,
  last_synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ga4_item_daily_performance_unique
  ON public.ga4_item_daily_performance (
    brand_id,
    date,
    item_id,
    item_name,
    item_brand,
    item_category
  );

CREATE INDEX IF NOT EXISTS idx_ga4_item_daily_performance_brand_date
  ON public.ga4_item_daily_performance (brand_id, date DESC);

ALTER TABLE public.ga4_item_daily_performance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brand members can view GA4 item daily performance" ON public.ga4_item_daily_performance;
DROP POLICY IF EXISTS "Super admins can manage GA4 item daily performance" ON public.ga4_item_daily_performance;

CREATE POLICY "Brand members can view GA4 item daily performance"
  ON public.ga4_item_daily_performance
  FOR SELECT
  USING (public.has_brand_access(brand_id));

CREATE POLICY "Super admins can manage GA4 item daily performance"
  ON public.ga4_item_daily_performance
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP TRIGGER IF EXISTS set_ga4_item_daily_performance_updated_at ON public.ga4_item_daily_performance;
CREATE TRIGGER set_ga4_item_daily_performance_updated_at
  BEFORE UPDATE ON public.ga4_item_daily_performance
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
