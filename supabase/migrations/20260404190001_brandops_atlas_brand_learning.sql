create table if not exists public.atlas_brand_learning_runs (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  scope_label text not null default 'Todo histórico disponível',
  model text,
  temperature numeric(3,2),
  summary text,
  error_message text,
  started_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);

create index if not exists atlas_brand_learning_runs_brand_started_idx
  on public.atlas_brand_learning_runs (brand_id, started_at desc);

create table if not exists public.atlas_brand_learning_snapshots (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  run_id uuid unique references public.atlas_brand_learning_runs(id) on delete cascade,
  scope_label text not null default 'Todo histórico disponível',
  confidence text not null default 'medium' check (confidence in ('low', 'medium', 'high')),
  summary text not null,
  business_profile text not null,
  niche_profile text not null,
  performance_baseline text not null,
  operational_risks jsonb not null default '[]'::jsonb,
  recurring_errors jsonb not null default '[]'::jsonb,
  growth_opportunities jsonb not null default '[]'::jsonb,
  evidence_sources jsonb not null default '[]'::jsonb,
  data_gaps jsonb not null default '[]'::jsonb,
  learning_payload jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default timezone('utc', now())
);

create index if not exists atlas_brand_learning_snapshots_brand_generated_idx
  on public.atlas_brand_learning_snapshots (brand_id, generated_at desc);
