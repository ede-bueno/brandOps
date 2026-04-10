CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.creative_ops_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  source TEXT NOT NULL,
  task_type TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'draft',
  title TEXT NOT NULL,
  objective TEXT NOT NULL,
  hypothesis TEXT,
  context_notes TEXT,
  latest_draft TEXT,
  approved_content TEXT,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT creative_ops_tasks_source_check
    CHECK (source IN ('manual', 'media', 'traffic', 'product_insights', 'atlas_ai')),
  CONSTRAINT creative_ops_tasks_type_check
    CHECK (task_type IN ('ad', 'social_post', 'creative', 'copy_test')),
  CONSTRAINT creative_ops_tasks_priority_check
    CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  CONSTRAINT creative_ops_tasks_status_check
    CHECK (status IN ('draft', 'ready_for_approval', 'approved', 'scheduled', 'published')),
  CONSTRAINT creative_ops_tasks_metadata_object_check
    CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_creative_ops_tasks_brand_status
  ON public.creative_ops_tasks (brand_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_creative_ops_tasks_brand_priority
  ON public.creative_ops_tasks (brand_id, priority, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_creative_ops_tasks_brand_type
  ON public.creative_ops_tasks (brand_id, task_type, created_at DESC);

ALTER TABLE public.creative_ops_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage creative ops tasks" ON public.creative_ops_tasks;
DROP POLICY IF EXISTS "Brand members can manage creative ops tasks" ON public.creative_ops_tasks;

CREATE POLICY "Super admins can manage creative ops tasks"
  ON public.creative_ops_tasks
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Brand members can manage creative ops tasks"
  ON public.creative_ops_tasks
  FOR ALL
  USING (public.has_brand_access(brand_id))
  WITH CHECK (public.has_brand_access(brand_id));

DROP TRIGGER IF EXISTS set_creative_ops_tasks_updated_at ON public.creative_ops_tasks;
CREATE TRIGGER set_creative_ops_tasks_updated_at
  BEFORE UPDATE ON public.creative_ops_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.creative_ops_task_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.creative_ops_tasks(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_summary TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT creative_ops_task_events_type_check
    CHECK (event_type IN ('created', 'draft_generated', 'draft_saved', 'status_changed', 'approved', 'scheduled', 'published')),
  CONSTRAINT creative_ops_task_events_metadata_object_check
    CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_creative_ops_task_events_task_created
  ON public.creative_ops_task_events (task_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_creative_ops_task_events_brand_created
  ON public.creative_ops_task_events (brand_id, created_at DESC);

ALTER TABLE public.creative_ops_task_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage creative ops task events" ON public.creative_ops_task_events;
DROP POLICY IF EXISTS "Brand members can read creative ops task events" ON public.creative_ops_task_events;
DROP POLICY IF EXISTS "Brand members can create creative ops task events" ON public.creative_ops_task_events;

CREATE POLICY "Super admins can manage creative ops task events"
  ON public.creative_ops_task_events
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Brand members can read creative ops task events"
  ON public.creative_ops_task_events
  FOR SELECT
  USING (public.has_brand_access(brand_id));

CREATE POLICY "Brand members can create creative ops task events"
  ON public.creative_ops_task_events
  FOR INSERT
  WITH CHECK (public.has_brand_access(brand_id));
