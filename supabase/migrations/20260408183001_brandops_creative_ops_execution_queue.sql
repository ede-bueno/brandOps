CREATE TABLE IF NOT EXISTS public.creative_ops_execution_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.creative_ops_tasks(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  job_status TEXT NOT NULL DEFAULT 'pending',
  channel TEXT NOT NULL,
  content_format TEXT NOT NULL,
  due_at TIMESTAMP WITH TIME ZONE NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_error TEXT,
  queued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  dispatched_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT creative_ops_execution_jobs_status_check
    CHECK (job_status IN ('pending', 'ready', 'completed', 'error', 'canceled')),
  CONSTRAINT creative_ops_execution_jobs_channel_check
    CHECK (channel IN ('instagram_feed', 'instagram_story', 'facebook_feed', 'meta_ad', 'manual_distribution')),
  CONSTRAINT creative_ops_execution_jobs_format_check
    CHECK (content_format IN ('image', 'video', 'carousel', 'copy_only')),
  CONSTRAINT creative_ops_execution_jobs_payload_object_check
    CHECK (jsonb_typeof(payload) = 'object')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_creative_ops_execution_jobs_task_unique
  ON public.creative_ops_execution_jobs (task_id);

CREATE INDEX IF NOT EXISTS idx_creative_ops_execution_jobs_brand_status_due
  ON public.creative_ops_execution_jobs (brand_id, job_status, due_at);

ALTER TABLE public.creative_ops_execution_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage creative ops execution jobs" ON public.creative_ops_execution_jobs;
DROP POLICY IF EXISTS "Brand members can manage creative ops execution jobs" ON public.creative_ops_execution_jobs;

CREATE POLICY "Super admins can manage creative ops execution jobs"
  ON public.creative_ops_execution_jobs
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Brand members can manage creative ops execution jobs"
  ON public.creative_ops_execution_jobs
  FOR ALL
  USING (public.has_brand_access(brand_id))
  WITH CHECK (public.has_brand_access(brand_id));

DROP TRIGGER IF EXISTS set_creative_ops_execution_jobs_updated_at ON public.creative_ops_execution_jobs;
CREATE TRIGGER set_creative_ops_execution_jobs_updated_at
  BEFORE UPDATE ON public.creative_ops_execution_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
