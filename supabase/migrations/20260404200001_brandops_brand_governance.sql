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
  'Overrides de capacidade por marca. Campo esperado: brandLearning.';

update public.brands
set
  plan_tier = 'enterprise',
  feature_flags = jsonb_build_object(
    'brandLearning', true
  )
where id in (
  '5e04ebfe-8443-4c11-940a-9bacb7f4af15', -- Oh My Dog
  'a166d816-660e-40d2-bb09-8b73fe8de7a8'  -- Bateu o Pace
);
