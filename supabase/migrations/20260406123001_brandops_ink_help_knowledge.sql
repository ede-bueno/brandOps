create table if not exists public.atlas_ink_help_sync_runs (
  id uuid primary key default gen_random_uuid(),
  source_url text not null,
  status text not null default 'running'
    check (status in ('running', 'completed', 'failed')),
  categories_discovered integer not null default 0,
  articles_discovered integer not null default 0,
  articles_upserted integer not null default 0,
  articles_changed integer not null default 0,
  error_message text,
  started_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.atlas_ink_help_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  locale text not null default 'pt_BR',
  title text not null,
  description text,
  article_count integer not null default 0,
  source_url text not null unique,
  last_crawled_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.atlas_ink_help_articles (
  id uuid primary key default gen_random_uuid(),
  external_article_id text not null unique,
  slug text not null,
  locale text not null default 'pt_BR',
  category_slug text not null,
  category_title text not null,
  title text not null,
  summary text,
  content_text text not null,
  content_excerpt text not null,
  search_text text not null,
  source_url text not null unique,
  article_updated_label text,
  article_updated_at timestamptz,
  content_hash text not null,
  last_synced_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists atlas_ink_help_articles_category_slug_idx
  on public.atlas_ink_help_articles (category_slug);

create index if not exists atlas_ink_help_articles_updated_idx
  on public.atlas_ink_help_articles (article_updated_at desc nulls last);

alter table public.atlas_ink_help_categories enable row level security;
alter table public.atlas_ink_help_articles enable row level security;
alter table public.atlas_ink_help_sync_runs enable row level security;

drop policy if exists "Authenticated can read INK help categories"
  on public.atlas_ink_help_categories;
create policy "Authenticated can read INK help categories"
  on public.atlas_ink_help_categories
  for select
  to authenticated
  using (true);

drop policy if exists "Authenticated can read INK help articles"
  on public.atlas_ink_help_articles;
create policy "Authenticated can read INK help articles"
  on public.atlas_ink_help_articles
  for select
  to authenticated
  using (true);
