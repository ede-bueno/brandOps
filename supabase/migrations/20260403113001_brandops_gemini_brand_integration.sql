CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.brand_integrations
  DROP CONSTRAINT IF EXISTS brand_integrations_provider_check;

ALTER TABLE public.brand_integrations
  ADD CONSTRAINT brand_integrations_provider_check
  CHECK (provider IN ('ink', 'meta', 'ga4', 'gemini'));

CREATE TABLE IF NOT EXISTS public.brand_integration_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  encrypted_secret TEXT NOT NULL,
  secret_hint TEXT,
  created_by UUID REFERENCES public.user_profiles(id),
  updated_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT brand_integration_secrets_provider_check
    CHECK (provider IN ('gemini')),
  CONSTRAINT brand_integration_secrets_brand_provider_unique
    UNIQUE (brand_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_brand_integration_secrets_brand_provider
  ON public.brand_integration_secrets (brand_id, provider);

ALTER TABLE public.brand_integration_secrets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage brand integration secrets" ON public.brand_integration_secrets;

CREATE POLICY "Super admins can manage brand integration secrets"
  ON public.brand_integration_secrets
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP TRIGGER IF EXISTS set_brand_integration_secrets_updated_at ON public.brand_integration_secrets;
CREATE TRIGGER set_brand_integration_secrets_updated_at
  BEFORE UPDATE ON public.brand_integration_secrets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

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
    ),
    (
      p_brand_id,
      'gemini',
      'disabled',
      jsonb_build_object(
        'model', 'gemini-2.5-flash',
        'credentialSource', 'platform_key',
        'hasApiKey', false,
        'apiKeyHint', null
      )
    )
  ON CONFLICT (brand_id, provider) DO UPDATE
    SET mode = EXCLUDED.mode,
        settings = public.brand_integrations.settings || EXCLUDED.settings,
        updated_at = NOW();
END;
$$;

SELECT public.seed_brand_integrations(id, name)
FROM public.brands;
