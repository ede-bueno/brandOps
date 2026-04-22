CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.atlas_executive_action_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  action_key TEXT NOT NULL,
  period_key TEXT NOT NULL,
  period_from DATE,
  period_to DATE,
  domain TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  review_at DATE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  updated_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT atlas_executive_action_queue_status_check
    CHECK (status IN ('new', 'in_progress', 'deferred', 'resolved')),
  CONSTRAINT atlas_executive_action_queue_domain_check
    CHECK (domain IN ('cash', 'acquisition', 'offer', 'operations')),
  CONSTRAINT atlas_executive_action_queue_payload_object_check
    CHECK (jsonb_typeof(payload) = 'object'),
  CONSTRAINT atlas_executive_action_queue_brand_period_action_unique
    UNIQUE (brand_id, period_key, action_key)
);

CREATE INDEX IF NOT EXISTS idx_atlas_executive_action_queue_brand_period
  ON public.atlas_executive_action_queue (brand_id, period_key, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_atlas_executive_action_queue_review_at
  ON public.atlas_executive_action_queue (brand_id, review_at ASC)
  WHERE review_at IS NOT NULL;

ALTER TABLE public.atlas_executive_action_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage executive action queue" ON public.atlas_executive_action_queue;
DROP POLICY IF EXISTS "Brand members can read executive action queue" ON public.atlas_executive_action_queue;
DROP POLICY IF EXISTS "Brand members can manage executive action queue" ON public.atlas_executive_action_queue;

CREATE POLICY "Super admins can manage executive action queue"
  ON public.atlas_executive_action_queue
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Brand members can read executive action queue"
  ON public.atlas_executive_action_queue
  FOR SELECT
  USING (public.has_brand_access(brand_id));

CREATE POLICY "Brand members can manage executive action queue"
  ON public.atlas_executive_action_queue
  FOR ALL
  USING (public.has_brand_access(brand_id))
  WITH CHECK (public.has_brand_access(brand_id));

DROP TRIGGER IF EXISTS set_atlas_executive_action_queue_updated_at ON public.atlas_executive_action_queue;
CREATE TRIGGER set_atlas_executive_action_queue_updated_at
  BEFORE UPDATE ON public.atlas_executive_action_queue
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
