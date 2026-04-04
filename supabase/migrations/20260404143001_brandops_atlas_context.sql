CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.atlas_context_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  details TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  event_date DATE,
  importance TEXT NOT NULL DEFAULT 'normal',
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT atlas_context_entries_type_check
    CHECK (entry_type IN ('campaign', 'promotion', 'launch', 'incident', 'insight')),
  CONSTRAINT atlas_context_entries_source_check
    CHECK (source IN ('manual', 'imported', 'analyst', 'system')),
  CONSTRAINT atlas_context_entries_importance_check
    CHECK (importance IN ('low', 'normal', 'high', 'critical')),
  CONSTRAINT atlas_context_entries_metadata_object_check
    CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_atlas_context_entries_brand_event
  ON public.atlas_context_entries (brand_id, event_date DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_atlas_context_entries_brand_created
  ON public.atlas_context_entries (brand_id, created_at DESC);

ALTER TABLE public.atlas_context_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage atlas context entries" ON public.atlas_context_entries;
DROP POLICY IF EXISTS "Brand members can read atlas context entries" ON public.atlas_context_entries;
DROP POLICY IF EXISTS "Brand members can manage own atlas context entries" ON public.atlas_context_entries;

CREATE POLICY "Super admins can manage atlas context entries"
  ON public.atlas_context_entries
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Brand members can read atlas context entries"
  ON public.atlas_context_entries
  FOR SELECT
  USING (public.has_brand_access(brand_id));

CREATE POLICY "Brand members can manage own atlas context entries"
  ON public.atlas_context_entries
  FOR ALL
  USING (
    public.has_brand_access(brand_id)
    AND user_id = auth.uid()
  )
  WITH CHECK (
    public.has_brand_access(brand_id)
    AND user_id = auth.uid()
  );

DROP TRIGGER IF EXISTS set_atlas_context_entries_updated_at ON public.atlas_context_entries;
CREATE TRIGGER set_atlas_context_entries_updated_at
  BEFORE UPDATE ON public.atlas_context_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
