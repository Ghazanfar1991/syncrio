create table if not exists analytics_account_daily_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  social_account_id uuid null,
  bundle_social_account_id text not null,
  platform text not null,
  snapshot_date date not null,
  metrics jsonb not null default '{}'::jsonb,
  extra jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bundle_social_account_id, snapshot_date)
);

create index if not exists analytics_account_daily_snapshots_user_idx
  on analytics_account_daily_snapshots (user_id, platform, snapshot_date desc);

create table if not exists analytics_post_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  social_account_id uuid null,
  bundle_social_account_id text null,
  platform text not null,
  imported_post_id text not null,
  bundle_post_id text null,
  snapshot_date date not null,
  published_at timestamptz null,
  post_type text null,
  metrics jsonb not null default '{}'::jsonb,
  content_preview text null,
  extra jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (imported_post_id, snapshot_date)
);

create index if not exists analytics_post_snapshots_user_idx
  on analytics_post_snapshots (user_id, platform, snapshot_date desc);

alter table analytics_cache add column if not exists period text;
