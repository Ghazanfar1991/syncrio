-- ==============================================================================
-- ✨ Syncrio - Unified Supabase Architecture (Enterprise Version)
-- Comprehensive Migration & Setup Script (Postgres)
-- ==============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ==============================================================================
-- 1. BASE TABLES (Identity & Profiles)
-- ==============================================================================

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  company_name TEXT,
  bio TEXT,
  role TEXT DEFAULT 'USER',
  tier TEXT DEFAULT 'FREE',
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Schema Migration: Add missing columns if tables already existed
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'USER';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'FREE';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Teams table
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  bundle_social_team_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Schema Migration: Add missing columns if tables already existed
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS bundle_social_team_id TEXT;

-- Team Members table
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'MEMBER', -- 'ADMIN', 'EDITOR', 'MEMBER', 'VIEWER'
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- ==============================================================================
-- 2. SOCIAL & CONNECTIVITY
-- ==============================================================================

-- Social Accounts table (linked to Profiles)
-- Supports OAuth 2.0 (standard) and OAuth 1.0a (legacy/Twitter/X)
CREATE TABLE IF NOT EXISTS public.social_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- 'TIKTOK', 'YOUTUBE', 'TWITTER', 'LINKEDIN', 'INSTAGRAM', etc.
  account_id TEXT NOT NULL, -- Platform-specific ID
  account_name TEXT,
  display_name TEXT,
  username TEXT,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  -- OAuth 1.0a specific fields (for Twitter/X/legacy)
  consumer_key TEXT,
  consumer_secret TEXT,
  access_token_secret TEXT,
  -- Bundle.social specific fields
  bundle_social_account_id TEXT,
  -- Generic metadata
  account_type TEXT DEFAULT 'PERSONAL', -- 'PERSONAL', 'BUSINESS', 'CREATOR'
  permissions JSONB DEFAULT '[]',
  is_connected BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform, account_id)
);

-- Schema Migration: Add missing columns if tables already existed
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS consumer_key TEXT;
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS consumer_secret TEXT;
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS access_token_secret TEXT;
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS bundle_social_account_id TEXT;

-- ==============================================================================
-- 3. CONTENT & POSTING
-- ==============================================================================

-- Posts table
-- Includes collaboration fields (Team, Assignment, Approvals)
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Content
  title TEXT,
  content TEXT,
  description TEXT,
  hashtags TEXT,
  image_url TEXT,
  images JSONB DEFAULT '[]', -- JSON array of URLs
  video_url TEXT,
  videos JSONB DEFAULT '[]', -- JSON array of URLs
  
  -- Lifecycle & Workflow
  status TEXT DEFAULT 'DRAFT', -- 'DRAFT', 'SCHEDULED', 'PUBLISHED', 'FAILED', 'ARCHIVED'
  approval_status TEXT DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED', 'NEEDS_REVISION'
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Schema Migration: Add missing columns if tables already existed
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'PENDING';
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Post Publications table (Join table post <-> social_account)
CREATE TABLE IF NOT EXISTS public.post_publications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  social_account_id UUID REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING', -- 'PENDING', 'PUBLISHED', 'FAILED'
  published_at TIMESTAMPTZ,
  platform_post_id TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, social_account_id)
);

-- Post Comments
CREATE TABLE IF NOT EXISTS public.post_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 4. ANALYTICS & USAGE
-- ==============================================================================

-- Post Analytics table
CREATE TABLE IF NOT EXISTS public.post_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  impressions INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  engagement_rate NUMERIC(10,4) DEFAULT 0,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, platform)
);

-- Usage Tracking table
CREATE TABLE IF NOT EXISTS public.usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  posts_used INTEGER DEFAULT 0,
  accounts_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month, year)
);

-- ==============================================================================
-- 5. BILLING & SUBSCRIPTIONS
-- ==============================================================================

-- Subscriptions table (Sync with Stripe)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  status TEXT, -- 'active', 'canceled', 'incomplete', 'trialing', etc.
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  tier TEXT DEFAULT 'FREE', -- Match SubscriptionTier enum
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Schema Migration: Add missing columns if tables already existed
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- ==============================================================================
-- 6. AI MODEL REGISTRY
-- ==============================================================================

-- AI Providers (OpenAI, Anthropic, OpenRouter, etc.)
CREATE TABLE IF NOT EXISTS public.ai_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'OPENAI', 'ANTHROPIC', 'GOOGLE', 'STABILITY', 'OPENROUTER', etc.
  base_url TEXT,
  api_key_env_var TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Models 
CREATE TABLE IF NOT EXISTS public.ai_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID REFERENCES public.ai_providers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  model_id TEXT NOT NULL, -- e.g., 'gpt-4o'
  modality TEXT DEFAULT 'TEXT', -- 'TEXT', 'IMAGE', 'VIDEO', 'MULTIMODAL'
  system_prompt TEXT,
  default_options JSONB DEFAULT '{}',
  capabilities JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider_id, model_id)
);

-- Feature <-> Model Assignments
CREATE TABLE IF NOT EXISTS public.feature_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  feature TEXT NOT NULL, -- 'CHAT_ASSISTANT', 'POST_GENERATOR', etc.
  model_id UUID REFERENCES public.ai_models(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(feature, priority)
);

-- ==============================================================================
-- 7. CHAT & MESSAGING
-- ==============================================================================

-- Chat Messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT NOT NULL, -- 'USER', 'ASSISTANT', 'SYSTEM'
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 8. SECURITY & RLS POLICIES
-- ==============================================================================

-- Enable RLS on all public tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 👤 Profile Policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 👥 Team Policies
-- Owners and members can view teams
CREATE POLICY "Users can view teams they belong to" ON public.teams
FOR SELECT USING (
  auth.uid() = owner_id OR 
  id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
);

CREATE POLICY "Owners can manage teams" ON public.teams
FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Members can view other members in team" ON public.team_members
FOR SELECT USING (
  team_id IN (SELECT id FROM public.teams WHERE owner_id = auth.uid()) OR
  team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
);

-- 🔗 Social Account Policies
CREATE POLICY "Users can manage own social accounts" ON public.social_accounts
FOR ALL USING (auth.uid() = user_id);

-- 📝 Post Policies (Collab Logic)
CREATE POLICY "Users can manage own posts" ON public.posts
FOR ALL USING (
  auth.uid() = user_id OR
  team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
);

-- 🤖 AI Registry (Read-only for users, Full for Admin)
CREATE POLICY "Everyone can view active models" ON public.ai_models FOR SELECT USING (is_active = true);
CREATE POLICY "Everyone can view active providers" ON public.ai_providers FOR SELECT USING (is_active = true);
CREATE POLICY "Everyone can view feature assignments" ON public.feature_models FOR SELECT USING (TRUE);

-- 💳 Billing Policies
CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

-- 💬 Chat Policies
CREATE POLICY "Users can manage own chat history" ON public.chat_messages FOR ALL USING (auth.uid() = user_id);

-- ==============================================================================
-- 9. TRIGGERS & AUTOMATION
-- ==============================================================================

-- Auth Trigger for Profile Creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at Trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_social_accounts_updated_at BEFORE UPDATE ON public.social_accounts FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_post_publications_updated_at BEFORE UPDATE ON public.post_publications FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_post_analytics_updated_at BEFORE UPDATE ON public.post_analytics FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_usage_tracking_updated_at BEFORE UPDATE ON public.usage_tracking FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_ai_providers_updated_at BEFORE UPDATE ON public.ai_providers FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_ai_models_updated_at BEFORE UPDATE ON public.ai_models FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ==============================================================================
-- 10. CRON JOBS (Background Processing)
-- ==============================================================================

-- Schedule the post processor to run every minute
-- URL: https://[PROJECT_REF].functions.supabase.co/process-posts
-- Replace [REF] and [KEY] in your dashboard if different.
SELECT cron.schedule(
  'process-scheduled-posts-every-minute',
  '* * * * *',
  $$
    SELECT
      net.http_post(
        url:='https://odgmopfwktgxqwpylthi.functions.supabase.co/process-posts',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kZ21vcGZ3a3RneHF3cHlsdGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTM4Mzk5OSwiZXhwIjoyMDkwOTU5OTk5fQ.khkotS7brYObrXRjFR1mL8Zcab8vSywnyO1JJHnt3XA"}'::jsonb,
        body:='{}'::jsonb
      ) as request_id;
  $$
);

-- ==============================================================================
-- 11. PERFORMANCE INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_team_id ON public.posts(team_id);
CREATE INDEX IF NOT EXISTS idx_posts_status_scheduled_at ON public.posts (status, scheduled_at) WHERE status = 'SCHEDULED';
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_models_provider ON public.ai_models(provider_id);
CREATE INDEX IF NOT EXISTS idx_post_publications_post ON public.post_publications(post_id);
