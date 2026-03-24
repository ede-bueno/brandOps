CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.brand_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  mode TEXT NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_sync_status TEXT NOT NULL DEFAULT 'idle',
  last_sync_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT brand_integrations_provider_check
    CHECK (provider IN ('ink', 'meta', 'ga4')),
  CONSTRAINT brand_integrations_mode_check
    CHECK (mode IN ('manual_csv', 'api', 'disabled')),
  CONSTRAINT brand_integrations_sync_status_check
    CHECK (last_sync_status IN ('idle', 'running', 'success', 'error'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_brand_integrations_brand_provider
  ON public.brand_integrations (brand_id, provider);

CREATE INDEX IF NOT EXISTS idx_brand_integrations_brand_id
  ON public.brand_integrations (brand_id);

ALTER TABLE public.brand_integrations ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.seed_brand_integrations(
  p_brand_id UUID,
  p_brand_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_name TEXT := lower(trim(coalesce(p_brand_name, '')));
  default_meta_mode TEXT := CASE
    WHEN normalized_name IN ('oh my dog', 'bateu o pace') THEN 'api'
    ELSE 'manual_csv'
  END;
  default_ga4_mode TEXT := CASE
    WHEN normalized_name = 'oh my dog' THEN 'api'
    ELSE 'disabled'
  END;
  default_meta_settings JSONB := CASE
    WHEN normalized_name IN ('oh my dog', 'bateu o pace') THEN
      jsonb_build_object(
        'manualFallback', true,
        'adAccountId', null
      )
    ELSE
      jsonb_build_object(
        'manualFallback', true
      )
  END;
  default_ga4_settings JSONB := CASE
    WHEN normalized_name = 'oh my dog' THEN
      jsonb_build_object(
        'propertyId', '506034252',
        'timezone', 'America/Sao_Paulo'
      )
    ELSE
      '{}'::jsonb
  END;
BEGIN
  INSERT INTO public.brand_integrations (brand_id, provider, mode, settings)
  VALUES
    (
      p_brand_id,
      'ink',
      'manual_csv',
      jsonb_build_object(
        'manualFallback', true
      )
    ),
    (
      p_brand_id,
      'meta',
      default_meta_mode,
      default_meta_settings
    ),
    (
      p_brand_id,
      'ga4',
      default_ga4_mode,
      default_ga4_settings
    )
  ON CONFLICT (brand_id, provider) DO UPDATE
    SET mode = EXCLUDED.mode,
        settings = public.brand_integrations.settings || EXCLUDED.settings,
        updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_brand_integrations_seed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_brand_integrations(NEW.id, NEW.name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS seed_brand_integrations_after_insert ON public.brands;
CREATE TRIGGER seed_brand_integrations_after_insert
  AFTER INSERT ON public.brands
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_brand_integrations_seed();

DROP POLICY IF EXISTS "Super admins can manage brand integrations" ON public.brand_integrations;
DROP POLICY IF EXISTS "Brand members can view brand integrations" ON public.brand_integrations;

CREATE POLICY "Super admins can manage brand integrations"
  ON public.brand_integrations
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Brand members can view brand integrations"
  ON public.brand_integrations
  FOR SELECT
  USING (public.has_brand_access(brand_id));

DROP TRIGGER IF EXISTS set_brand_integrations_updated_at ON public.brand_integrations;
CREATE TRIGGER set_brand_integrations_updated_at
  BEFORE UPDATE ON public.brand_integrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

SELECT public.seed_brand_integrations(id, name)
FROM public.brands;
