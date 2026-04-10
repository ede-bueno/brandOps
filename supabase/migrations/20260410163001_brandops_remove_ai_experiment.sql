DELETE FROM public.brand_integration_secrets
WHERE provider = 'gemini';

DELETE FROM public.brand_integrations
WHERE provider = 'gemini';

UPDATE public.brands
SET feature_flags = feature_flags - 'atlasAi' - 'atlasCommandCenter' - 'geminiModelCatalog'
WHERE feature_flags ?| ARRAY['atlasAi', 'atlasCommandCenter', 'geminiModelCatalog'];

ALTER TABLE IF EXISTS public.brand_integrations
  DROP CONSTRAINT IF EXISTS brand_integrations_provider_check;

ALTER TABLE IF EXISTS public.brand_integrations
  ADD CONSTRAINT brand_integrations_provider_check
  CHECK (provider IN ('ink', 'meta', 'ga4'));

ALTER TABLE IF EXISTS public.brand_integration_secrets
  DROP CONSTRAINT IF EXISTS brand_integration_secrets_provider_check;

ALTER TABLE IF EXISTS public.brand_integration_secrets
  ADD CONSTRAINT brand_integration_secrets_provider_check
  CHECK (provider IN ('meta', 'ga4'));

DROP TABLE IF EXISTS public.atlas_analyst_feedback CASCADE;
DROP TABLE IF EXISTS public.atlas_analyst_runs CASCADE;
DROP TABLE IF EXISTS public.atlas_context_entries CASCADE;
DROP TABLE IF EXISTS public.atlas_brand_learning_evidence_items CASCADE;
DROP TABLE IF EXISTS public.atlas_brand_learning_findings CASCADE;
DROP TABLE IF EXISTS public.atlas_brand_learning_feedback CASCADE;
DROP TABLE IF EXISTS public.atlas_brand_learning_snapshots CASCADE;
DROP TABLE IF EXISTS public.atlas_brand_learning_runs CASCADE;
DROP TABLE IF EXISTS public.atlas_ink_help_articles CASCADE;
DROP TABLE IF EXISTS public.atlas_ink_help_categories CASCADE;
DROP TABLE IF EXISTS public.atlas_ink_help_sync_runs CASCADE;
