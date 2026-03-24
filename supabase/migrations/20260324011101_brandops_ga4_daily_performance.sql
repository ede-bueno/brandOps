CREATE TABLE IF NOT EXISTS public.ga4_daily_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  source_medium TEXT NOT NULL DEFAULT '',
  campaign_name TEXT NOT NULL DEFAULT '',
  landing_page TEXT NOT NULL DEFAULT '',
  sessions INTEGER NOT NULL DEFAULT 0,
  total_users INTEGER NOT NULL DEFAULT 0,
  page_views INTEGER NOT NULL DEFAULT 0,
  add_to_carts INTEGER NOT NULL DEFAULT 0,
  begin_checkouts INTEGER NOT NULL DEFAULT 0,
  purchases INTEGER NOT NULL DEFAULT 0,
  purchase_revenue NUMERIC(12, 2) NOT NULL DEFAULT 0,
  last_synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ga4_daily_performance_unique
  ON public.ga4_daily_performance (
    brand_id,
    date,
    source_medium,
    campaign_name,
    landing_page
  );

CREATE INDEX IF NOT EXISTS idx_ga4_daily_performance_brand_date
  ON public.ga4_daily_performance (brand_id, date DESC);

ALTER TABLE public.ga4_daily_performance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brand members can view GA4 daily performance" ON public.ga4_daily_performance;
DROP POLICY IF EXISTS "Super admins can manage GA4 daily performance" ON public.ga4_daily_performance;

CREATE POLICY "Brand members can view GA4 daily performance"
  ON public.ga4_daily_performance
  FOR SELECT
  USING (public.has_brand_access(brand_id));

CREATE POLICY "Super admins can manage GA4 daily performance"
  ON public.ga4_daily_performance
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP TRIGGER IF EXISTS set_ga4_daily_performance_updated_at ON public.ga4_daily_performance;
CREATE TRIGGER set_ga4_daily_performance_updated_at
  BEFORE UPDATE ON public.ga4_daily_performance
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
