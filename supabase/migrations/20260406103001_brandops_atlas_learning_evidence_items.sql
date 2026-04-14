create table if not exists public.atlas_brand_learning_evidence_items (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  snapshot_id uuid not null references public.atlas_brand_learning_snapshots(id) on delete cascade,
  run_id uuid references public.atlas_brand_learning_runs(id) on delete cascade,
  evidence_kind text not null check (
    evidence_kind in (
      'metric',
      'constraint',
      'pattern',
      'opportunity',
      'risk',
      'catalog',
      'traffic',
      'context',
      'quality'
    )
  ),
  source_report text not null check (
    source_report in (
      'financial',
      'media',
      'traffic',
      'product-insights',
      'sales',
      'catalog',
      'sanitization',
      'context',
      'learning_frame'
    )
  ),
  title text not null,
  summary text not null,
  metric_label text,
  metric_value numeric(14,2),
  metric_display text,
  source_key text,
  payload jsonb not null default '{}'::jsonb,
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists atlas_brand_learning_evidence_snapshot_idx
  on public.atlas_brand_learning_evidence_items (snapshot_id, position asc, created_at asc);

create index if not exists atlas_brand_learning_evidence_brand_created_idx
  on public.atlas_brand_learning_evidence_items (brand_id, created_at desc);
