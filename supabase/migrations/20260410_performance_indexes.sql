-- Performance indexes for Syncrio Core Tables

-- Index for fetching posts by user and status/platform efficiently
create index if not exists posts_user_id_created_at_idx on posts(user_id, created_at desc);
create index if not exists posts_user_status_idx on posts(user_id, status);

-- Index for publication tracking
create index if not exists post_publications_post_id_idx on post_publications(post_id);
create index if not exists post_publications_social_account_id_idx on post_publications(social_account_id);

-- Index for analytics matching
create index if not exists post_analytics_post_id_idx on post_analytics(post_id);

-- Index for social accounts filtering
create index if not exists social_accounts_user_id_connected_idx on social_accounts(user_id, is_connected, is_active);

-- Index for usage tracking
create index if not exists usage_tracking_user_month_year_idx on usage_tracking(user_id, month, year);
