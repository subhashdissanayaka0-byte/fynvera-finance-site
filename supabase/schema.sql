-- Fynvera schema: run this whole file in Supabase Dashboard > SQL Editor.
-- Every private data table uses Row Level Security (RLS), so a user can access only their own rows.

create extension if not exists pgcrypto;

-- User profile and public-facing preferences. Do not put passwords or bank credentials here.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  country text,
  currency text not null default 'USD',
  experience text not null default 'Beginner',
  goal text,
  risk_level text not null default 'Moderate',
  monthly_target numeric(14,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Optional financial planning information. This is private account data protected by RLS.
create table if not exists public.user_financial_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  primary_goal text,
  risk_level text not null default 'Moderate',
  monthly_savings_target numeric(14,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Article content. Published articles can be read publicly; only their author can edit/delete them.
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references auth.users(id) on delete set null,
  title text not null,
  slug text not null unique,
  excerpt text not null,
  category text not null,
  subcategory text,
  author text,
  author_role text,
  image_url text,
  body jsonb not null default '[]'::jsonb,
  keywords text[] not null default '{}',
  read_time integer not null default 5 check (read_time > 0),
  status text not null default 'published' check (status in ('draft', 'published')),
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Admin/editor allow-list. Do not add a client-facing insert/update policy to this table.
-- Add the site's owner UUID manually from Supabase SQL Editor after signing up.
create table if not exists public.article_editors (
  user_id uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);

-- Saved articles and research list.
create table if not exists public.watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  article_id uuid not null references public.articles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, article_id)
);

-- Market symbols a user has chosen to watch. Prices remain sample data until a live provider is configured.
create table if not exists public.market_watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  created_at timestamptz not null default now(),
  unique (user_id, symbol)
);

-- Manual portfolio notes; no brokerage connection or live prices are implied.
create table if not exists public.portfolio_holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  asset_type text not null default 'Other',
  current_value numeric(18,2) not null default 0,
  cost_basis numeric(18,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable row-level security before granting any client-side table access.
alter table public.profiles enable row level security;
alter table public.user_financial_profiles enable row level security;
alter table public.articles enable row level security;
alter table public.article_editors enable row level security;
alter table public.watchlist enable row level security;
alter table public.market_watchlist enable row level security;
alter table public.portfolio_holdings enable row level security;

-- Profiles: each authenticated user can read/change only their own profile.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Financial planning details: restrict all actions to the owner.
drop policy if exists "financial_profile_select_own" on public.user_financial_profiles;
create policy "financial_profile_select_own" on public.user_financial_profiles for select to authenticated using (auth.uid() = user_id);
drop policy if exists "financial_profile_insert_own" on public.user_financial_profiles;
create policy "financial_profile_insert_own" on public.user_financial_profiles for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "financial_profile_update_own" on public.user_financial_profiles;
create policy "financial_profile_update_own" on public.user_financial_profiles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Only the explicitly allow-listed editor account can publish or change articles.
-- The editor allow-list is readable only by the user themself and has no client write policies.
drop policy if exists "article_editor_select_self" on public.article_editors;
create policy "article_editor_select_self" on public.article_editors for select to authenticated using (auth.uid() = user_id);

-- Articles: readers can see published content. Only an allow-listed author can write stories.
drop policy if exists "published_articles_are_public" on public.articles;
create policy "published_articles_are_public" on public.articles for select to anon, authenticated using (status = 'published' or auth.uid() = author_id);
drop policy if exists "authors_insert_articles" on public.articles;
create policy "authors_insert_articles" on public.articles for insert to authenticated with check (
  auth.uid() = author_id and exists (select 1 from public.article_editors e where e.user_id = auth.uid())
);
drop policy if exists "authors_update_articles" on public.articles;
create policy "authors_update_articles" on public.articles for update to authenticated using (
  auth.uid() = author_id and exists (select 1 from public.article_editors e where e.user_id = auth.uid())
) with check (
  auth.uid() = author_id and exists (select 1 from public.article_editors e where e.user_id = auth.uid())
);
drop policy if exists "authors_delete_articles" on public.articles;
create policy "authors_delete_articles" on public.articles for delete to authenticated using (
  auth.uid() = author_id and exists (select 1 from public.article_editors e where e.user_id = auth.uid())
);

-- Watchlist: users can save and remove only their own rows.
drop policy if exists "watchlist_select_own" on public.watchlist;
create policy "watchlist_select_own" on public.watchlist for select to authenticated using (auth.uid() = user_id);
drop policy if exists "watchlist_insert_own" on public.watchlist;
create policy "watchlist_insert_own" on public.watchlist for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "watchlist_delete_own" on public.watchlist;
create policy "watchlist_delete_own" on public.watchlist for delete to authenticated using (auth.uid() = user_id);

-- Market watchlist: users may save and remove only their own symbols.
drop policy if exists "market_watchlist_select_own" on public.market_watchlist;
create policy "market_watchlist_select_own" on public.market_watchlist for select to authenticated using (auth.uid() = user_id);
drop policy if exists "market_watchlist_insert_own" on public.market_watchlist;
create policy "market_watchlist_insert_own" on public.market_watchlist for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "market_watchlist_delete_own" on public.market_watchlist;
create policy "market_watchlist_delete_own" on public.market_watchlist for delete to authenticated using (auth.uid() = user_id);

-- Portfolio values are manually entered by the signed-in user; all actions are owner-scoped.
drop policy if exists "portfolio_select_own" on public.portfolio_holdings;
create policy "portfolio_select_own" on public.portfolio_holdings for select to authenticated using (auth.uid() = user_id);
drop policy if exists "portfolio_insert_own" on public.portfolio_holdings;
create policy "portfolio_insert_own" on public.portfolio_holdings for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "portfolio_update_own" on public.portfolio_holdings;
create policy "portfolio_update_own" on public.portfolio_holdings for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "portfolio_delete_own" on public.portfolio_holdings;
create policy "portfolio_delete_own" on public.portfolio_holdings for delete to authenticated using (auth.uid() = user_id);

-- Performance-friendly indexes for the common article feed and user's own records.
create index if not exists articles_published_at_idx on public.articles (published_at desc) where status = 'published';
create index if not exists articles_category_idx on public.articles (category, subcategory);
create index if not exists watchlist_user_idx on public.watchlist (user_id, created_at desc);
create index if not exists market_watchlist_user_idx on public.market_watchlist (user_id, created_at desc);
create index if not exists portfolio_user_idx on public.portfolio_holdings (user_id, created_at desc);

-- Storage setup: create two PUBLIC buckets named "avatars" and "article-images" in Storage.
-- Upload policies below only permit a logged-in owner to write under their own first-level folder.
-- Public image viewing is expected because the content is displayed to readers on public pages.
drop policy if exists "avatar_owner_upload" on storage.objects;
create policy "avatar_owner_upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatar_owner_update" on storage.objects;
create policy "avatar_owner_update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "article_image_owner_upload" on storage.objects;
create policy "article_image_owner_upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'article-images' and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.article_editors e where e.user_id = auth.uid()));
drop policy if exists "article_image_owner_update" on storage.objects;
create policy "article_image_owner_update" on storage.objects for update to authenticated
  using (bucket_id = 'article-images' and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.article_editors e where e.user_id = auth.uid()))
  with check (bucket_id = 'article-images' and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.article_editors e where e.user_id = auth.uid()));
