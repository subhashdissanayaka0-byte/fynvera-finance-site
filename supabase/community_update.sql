-- FYNVERA Community Update (additive migration)
-- Run in Supabase Dashboard -> SQL Editor AFTER the existing schema.sql.
-- Existing tables and workspace features are not dropped or renamed.

create extension if not exists pgcrypto;

-- Public creator data is deliberately separate from the private finance profile/notes in public.profiles.
create table if not exists public.author_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null,
  bio text not null default '' check (char_length(bio) <= 500),
  x_url text,
  tiktok_url text,
  facebook_url text,
  telegram_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint author_profiles_x_url_check check (x_url is null or x_url ~* '^https?://'),
  constraint author_profiles_tiktok_url_check check (tiktok_url is null or tiktok_url ~* '^https?://'),
  constraint author_profiles_facebook_url_check check (facebook_url is null or facebook_url ~* '^https?://'),
  constraint author_profiles_telegram_url_check check (telegram_url is null or telegram_url ~* '^https?://')
);

alter table public.author_profiles enable row level security;
revoke all on table public.author_profiles from anon, authenticated;
grant select on table public.author_profiles to anon, authenticated;
grant insert, update on table public.author_profiles to authenticated;
drop policy if exists "author_profiles_public_read" on public.author_profiles;
create policy "author_profiles_public_read" on public.author_profiles
  for select to anon, authenticated using (true);
drop policy if exists "author_profiles_insert_self" on public.author_profiles;
create policy "author_profiles_insert_self" on public.author_profiles
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "author_profiles_update_self" on public.author_profiles;
create policy "author_profiles_update_self" on public.author_profiles
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- One reaction per account per database article. Public counts are exposed only through an aggregate function.
create table if not exists public.article_reactions (
  article_id uuid not null references public.articles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null check (reaction in ('like', 'dislike')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (article_id, user_id)
);

alter table public.article_reactions enable row level security;
revoke all on table public.article_reactions from anon, authenticated;
grant select, insert, update, delete on table public.article_reactions to authenticated;
drop policy if exists "article_reactions_read_self" on public.article_reactions;
create policy "article_reactions_read_self" on public.article_reactions
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "article_reactions_insert_self" on public.article_reactions;
create policy "article_reactions_insert_self" on public.article_reactions
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.articles a where a.id = article_id and a.status = 'published')
  );
drop policy if exists "article_reactions_update_self" on public.article_reactions;
create policy "article_reactions_update_self" on public.article_reactions
  for update to authenticated using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.articles a where a.id = article_id and a.status = 'published')
  );
drop policy if exists "article_reactions_delete_self" on public.article_reactions;
create policy "article_reactions_delete_self" on public.article_reactions
  for delete to authenticated using ((select auth.uid()) = user_id);

create or replace function public.article_reaction_counts(p_article_id uuid)
returns table (likes bigint, dislikes bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*)::bigint from public.article_reactions r where r.article_id = p_article_id and r.reaction = 'like') as likes,
    (select count(*)::bigint from public.article_reactions r where r.article_id = p_article_id and r.reaction = 'dislike') as dislikes
  where exists (
    select 1 from public.articles a where a.id = p_article_id and a.status = 'published'
  );
$$;
revoke all on function public.article_reaction_counts(uuid) from public;
grant execute on function public.article_reaction_counts(uuid) to anon, authenticated;

-- Public comments can be read without login. Writing/deleting comments requires an authenticated owner.
create table if not exists public.article_comments (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

alter table public.article_comments enable row level security;
revoke all on table public.article_comments from anon, authenticated;
grant select on table public.article_comments to anon, authenticated;
grant insert, delete on table public.article_comments to authenticated;
drop policy if exists "article_comments_public_read" on public.article_comments;
create policy "article_comments_public_read" on public.article_comments
  for select to anon, authenticated using (
    exists (select 1 from public.articles a where a.id = article_id and a.status = 'published')
  );
drop policy if exists "article_comments_insert_self" on public.article_comments;
create policy "article_comments_insert_self" on public.article_comments
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.articles a where a.id = article_id and a.status = 'published')
  );
drop policy if exists "article_comments_delete_self" on public.article_comments;
create policy "article_comments_delete_self" on public.article_comments
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Following graph: accounts can only create/remove their own follow relationships.
create table if not exists public.author_follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  followed_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  constraint author_follows_no_self_follow check (follower_id <> followed_id)
);

alter table public.author_follows enable row level security;
revoke all on table public.author_follows from anon, authenticated;
grant select, insert, delete on table public.author_follows to authenticated;
drop policy if exists "author_follows_read_participants" on public.author_follows;
create policy "author_follows_read_participants" on public.author_follows
  for select to authenticated using ((select auth.uid()) = follower_id or (select auth.uid()) = followed_id);
drop policy if exists "author_follows_insert_self" on public.author_follows;
create policy "author_follows_insert_self" on public.author_follows
  for insert to authenticated with check (
    (select auth.uid()) = follower_id and follower_id <> followed_id
  );
drop policy if exists "author_follows_delete_self" on public.author_follows;
create policy "author_follows_delete_self" on public.author_follows
  for delete to authenticated using ((select auth.uid()) = follower_id);

-- Safe public aggregate counts; no list of followers or individual reactions is exposed through these functions.
create or replace function public.author_social_counts(p_author_id uuid)
returns table (followers bigint, following bigint, likes_received bigint, published_articles bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*)::bigint from public.author_follows f where f.followed_id = p_author_id) as followers,
    (select count(*)::bigint from public.author_follows f where f.follower_id = p_author_id) as following,
    (select count(*)::bigint from public.article_reactions r join public.articles a on a.id = r.article_id
      where a.author_id = p_author_id and a.status = 'published' and r.reaction = 'like') as likes_received,
    (select count(*)::bigint from public.articles a where a.author_id = p_author_id and a.status = 'published') as published_articles;
$$;
revoke all on function public.author_social_counts(uuid) from public;
grant execute on function public.author_social_counts(uuid) to anon, authenticated;

create index if not exists article_reactions_article_idx on public.article_reactions (article_id, reaction);
create index if not exists article_comments_article_created_idx on public.article_comments (article_id, created_at desc);
create index if not exists author_follows_followed_idx on public.author_follows (followed_id, created_at desc);
create index if not exists author_follows_follower_idx on public.author_follows (follower_id, created_at desc);

-- Keep modified timestamps simple and browser-compatible; these tables do not use triggers by default.
