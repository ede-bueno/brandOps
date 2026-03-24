DROP POLICY IF EXISTS "Users can view accessible brand memberships" ON public.brand_members;
DROP POLICY IF EXISTS "Users can view own memberships" ON public.brand_members;

CREATE POLICY "Users can view own memberships"
  ON public.brand_members
  FOR SELECT
  USING (
    public.is_super_admin()
    OR user_id = auth.uid()
  );
