create table if not exists public.atlas_brand_learning_feedback (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  snapshot_id uuid not null references public.atlas_brand_learning_snapshots(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  vote text not null check (vote in ('aligned', 'needs_review')),
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint atlas_brand_learning_feedback_snapshot_user_key unique (snapshot_id, user_id)
);

create index if not exists atlas_brand_learning_feedback_brand_snapshot_idx
  on public.atlas_brand_learning_feedback (brand_id, snapshot_id, updated_at desc);
