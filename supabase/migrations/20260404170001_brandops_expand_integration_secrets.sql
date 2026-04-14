ALTER TABLE public.brand_integration_secrets
  DROP CONSTRAINT IF EXISTS brand_integration_secrets_provider_check;

ALTER TABLE public.brand_integration_secrets
  ADD CONSTRAINT brand_integration_secrets_provider_check
  CHECK (provider IN ('meta', 'ga4', 'gemini'));
