CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.atlas_analyst_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  skill_label TEXT NOT NULL,
  page_context TEXT,
  period_label TEXT,
  period_from DATE,
  period_to DATE,
  confidence TEXT NOT NULL DEFAULT 'medium',
  summary TEXT NOT NULL,
  answer TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  risks JSONB NOT NULL DEFAULT '[]'::jsonb,
  follow_ups JSONB NOT NULL DEFAULT '[]'::jsonb,
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  used_reports TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  model TEXT NOT NULL,
  request_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT atlas_analyst_runs_skill_check
    CHECK (skill_id IN ('executive_operator', 'marketing_performance', 'revenue_operator', 'pod_strategist')),
  CONSTRAINT atlas_analyst_runs_confidence_check
    CHECK (confidence IN ('low', 'medium', 'high')),
  CONSTRAINT atlas_analyst_runs_evidence_array_check
    CHECK (jsonb_typeof(evidence) = 'array'),
  CONSTRAINT atlas_analyst_runs_actions_array_check
    CHECK (jsonb_typeof(actions) = 'array'),
  CONSTRAINT atlas_analyst_runs_risks_array_check
    CHECK (jsonb_typeof(risks) = 'array'),
  CONSTRAINT atlas_analyst_runs_follow_ups_array_check
    CHECK (jsonb_typeof(follow_ups) = 'array'),
  CONSTRAINT atlas_analyst_runs_warnings_array_check
    CHECK (jsonb_typeof(warnings) = 'array'),
  CONSTRAINT atlas_analyst_runs_request_context_object_check
    CHECK (jsonb_typeof(request_context) = 'object')
);

CREATE TABLE IF NOT EXISTS public.atlas_analyst_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.atlas_analyst_runs(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  vote TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT atlas_analyst_feedback_vote_check
    CHECK (vote IN ('helpful', 'not_helpful')),
  CONSTRAINT atlas_analyst_feedback_run_user_unique
    UNIQUE (run_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_atlas_analyst_runs_brand_created
  ON public.atlas_analyst_runs (brand_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_atlas_analyst_runs_user_brand_created
  ON public.atlas_analyst_runs (user_id, brand_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_atlas_analyst_feedback_brand_created
  ON public.atlas_analyst_feedback (brand_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_atlas_analyst_feedback_run_user
  ON public.atlas_analyst_feedback (run_id, user_id);

ALTER TABLE public.atlas_analyst_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atlas_analyst_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage atlas analyst runs" ON public.atlas_analyst_runs;
DROP POLICY IF EXISTS "Brand members can read atlas analyst runs" ON public.atlas_analyst_runs;
DROP POLICY IF EXISTS "Brand members can create own atlas analyst runs" ON public.atlas_analyst_runs;

CREATE POLICY "Super admins can manage atlas analyst runs"
  ON public.atlas_analyst_runs
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Brand members can read atlas analyst runs"
  ON public.atlas_analyst_runs
  FOR SELECT
  USING (public.has_brand_access(brand_id));

CREATE POLICY "Brand members can create own atlas analyst runs"
  ON public.atlas_analyst_runs
  FOR INSERT
  WITH CHECK (
    public.has_brand_access(brand_id)
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Super admins can manage atlas analyst feedback" ON public.atlas_analyst_feedback;
DROP POLICY IF EXISTS "Brand members can read atlas analyst feedback" ON public.atlas_analyst_feedback;
DROP POLICY IF EXISTS "Brand members can manage own atlas analyst feedback" ON public.atlas_analyst_feedback;

CREATE POLICY "Super admins can manage atlas analyst feedback"
  ON public.atlas_analyst_feedback
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Brand members can read atlas analyst feedback"
  ON public.atlas_analyst_feedback
  FOR SELECT
  USING (public.has_brand_access(brand_id));

CREATE POLICY "Brand members can manage own atlas analyst feedback"
  ON public.atlas_analyst_feedback
  FOR ALL
  USING (
    public.has_brand_access(brand_id)
    AND user_id = auth.uid()
  )
  WITH CHECK (
    public.has_brand_access(brand_id)
    AND user_id = auth.uid()
  );

DROP TRIGGER IF EXISTS set_atlas_analyst_runs_updated_at ON public.atlas_analyst_runs;
CREATE TRIGGER set_atlas_analyst_runs_updated_at
  BEFORE UPDATE ON public.atlas_analyst_runs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_atlas_analyst_feedback_updated_at ON public.atlas_analyst_feedback;
CREATE TRIGGER set_atlas_analyst_feedback_updated_at
  BEFORE UPDATE ON public.atlas_analyst_feedback
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
