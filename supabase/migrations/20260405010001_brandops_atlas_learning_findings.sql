create table if not exists public.atlas_brand_learning_findings (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  snapshot_id uuid not null references public.atlas_brand_learning_snapshots(id) on delete cascade,
  run_id uuid references public.atlas_brand_learning_runs(id) on delete cascade,
  finding_group text not null check (
    finding_group in (
      'signal',
      'priority',
      'opportunity',
      'risk',
      'error',
      'seasonality',
      'campaign',
      'catalog',
      'evidence',
      'gap',
      'watch',
      'milestone',
      'trigger'
    )
  ),
  finding_label text not null,
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists atlas_brand_learning_findings_snapshot_group_idx
  on public.atlas_brand_learning_findings (snapshot_id, finding_group, position asc);

create index if not exists atlas_brand_learning_findings_brand_created_idx
  on public.atlas_brand_learning_findings (brand_id, created_at desc);
