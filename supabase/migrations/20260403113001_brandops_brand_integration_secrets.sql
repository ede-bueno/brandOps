CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
    CHECK (provider IN ('meta', 'ga4')),
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
