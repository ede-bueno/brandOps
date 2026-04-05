alter table public.brands
  add column if not exists plan_tier text not null default 'starter',
  add column if not exists feature_flags jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'brands_plan_tier_check'
  ) then
    alter table public.brands
      add constraint brands_plan_tier_check
      check (plan_tier in ('starter', 'growth', 'scale', 'enterprise'));
  end if;
end $$;

comment on column public.brands.plan_tier is
  'Plano contratado da marca para governar recursos do SaaS.';

comment on column public.brands.feature_flags is
  'Overrides de capacidade por marca. Campos esperados: atlasAi, atlasCommandCenter, brandLearning, geminiModelCatalog.';
