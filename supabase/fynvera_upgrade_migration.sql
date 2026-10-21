-- FYNVERA upgrade migration for the EXISTING live schema supplied by the site owner.
-- IMPORTANT: Run this file only after taking a Supabase backup. Do NOT run schema.sql
-- or community_update.sql for this project; those older files use incompatible column names.
-- This migration changes the existing tables additively and keeps current article data.

begin;

-- 1) Bring the existing articles table into line with the React editor.
-- Old rows are kept on their category pages; new editor posts default to News & Insights.
alter table public.articles add column if not exists updated_at timestamptz;
alter table public.articles add column if not exists content_type text;
update public.articles
set updated_at = coalesce(updated_at, created_at, now()),
    content_type = coalesce(content_type, 'topic');
alter table public.articles alter column updated_at set default now();
alter table public.articles alter column updated_at set not null;
alter table public.articles alter column content_type set default 'news_insights';
alter table public.articles alter column content_type set not null;
alter table public.articles drop constraint if exists articles_content_type_check;
alter table public.articles add constraint articles_content_type_check
  check (content_type in ('news_insights', 'topic'));

-- 2) Make single-user reaction/bookmark/follow lookups safe for upsert and maybeSingle.
-- Keep the newest row when older duplicates already exist, then enforce one row per pair.
delete from public.article_reactions older
using public.article_reactions newer
where older.article_id = newer.article_id
  and older.user_id = newer.user_id
  and (older.created_at < newer.created_at or (older.created_at = newer.created_at and older.id < newer.id));
create unique index if not exists article_reactions_one_per_user_idx
  on public.article_reactions (article_id, user_id);

-- Keep each author's newest bookmark in case legacy rows contain duplicates.
delete from public.article_bookmarks older
using public.article_bookmarks newer
where older.article_id = newer.article_id
  and older.user_id = newer.user_id
  and (older.created_at < newer.created_at or (older.created_at = newer.created_at and older.id < newer.id));
create unique index if not exists article_bookmarks_one_per_user_idx
  on public.article_bookmarks (article_id, user_id);

delete from public.author_follows where follower_id = followed_id;
delete from public.author_follows older
using public.author_follows newer
where older.follower_id = newer.follower_id
  and older.followed_id = newer.followed_id
  and (older.created_at < newer.created_at or (older.created_at = newer.created_at and older.id < newer.id));
create unique index if not exists author_follows_one_pair_idx
  on public.author_follows (follower_id, followed_id);

-- 3) Make article deletion cascade to the article's community rows, and detach replies
-- rather than deleting them when a parent comment is deleted.
alter table public.article_reactions drop constraint if exists article_reactions_article_id_fkey;
alter table public.article_reactions add constraint article_reactions_article_id_fkey
  foreign key (article_id) references public.articles(id) on delete cascade;

alter table public.article_comments drop constraint if exists article_comments_article_id_fkey;
alter table public.article_comments add constraint article_comments_article_id_fkey
  foreign key (article_id) references public.articles(id) on delete cascade;
alter table public.article_comments drop constraint if exists article_comments_parent_id_fkey;
alter table public.article_comments add constraint article_comments_parent_id_fkey
  foreign key (parent_id) references public.article_comments(id) on delete set null;

alter table public.article_bookmarks drop constraint if exists article_bookmarks_article_id_fkey;
alter table public.article_bookmarks add constraint article_bookmarks_article_id_fkey
  foreign key (article_id) references public.articles(id) on delete cascade;

-- 4) Updated timestamps. UI labels a story EDITED only after its creation time changes.
create or replace function public.fynvera_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists fynvera_articles_updated_at on public.articles;
create trigger fynvera_articles_updated_at
before update on public.articles
for each row execute function public.fynvera_set_updated_at();

drop trigger if exists fynvera_article_comments_updated_at on public.article_comments;
create trigger fynvera_article_comments_updated_at
before update on public.article_comments
for each row execute function public.fynvera_set_updated_at();

drop trigger if exists fynvera_author_profiles_updated_at on public.author_profiles;
create trigger fynvera_author_profiles_updated_at
before update on public.author_profiles
for each row execute function public.fynvera_set_updated_at();

-- 5) Replace old article/community policies on only these six tables. Older policies from
-- earlier drafts may reference author_id/body and must not be allowed to override owner checks.
do $$
declare
  pol record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any (array['articles','author_profiles','article_reactions','article_comments','article_bookmarks','author_follows'])
  loop
    execute format('drop policy if exists %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;
end;
$$;

alter table public.articles enable row level security;
alter table public.author_profiles enable row level security;
alter table public.article_reactions enable row level security;
alter table public.article_comments enable row level security;
alter table public.article_bookmarks enable row level security;
alter table public.author_follows enable row level security;

grant select on public.articles to anon, authenticated;
grant insert, update, delete on public.articles to authenticated;
grant select on public.author_profiles to anon, authenticated;
grant insert, update, delete on public.author_profiles to authenticated;
grant select, insert, update, delete on public.article_reactions to authenticated;
grant select on public.article_comments to anon, authenticated;
grant insert, update, delete on public.article_comments to authenticated;
grant select, insert, delete on public.article_bookmarks to authenticated;
grant select, insert, delete on public.author_follows to authenticated;

-- Public readers may view published stories. An author can also access their own drafts.
create policy articles_select_published_or_owner on public.articles
for select to anon, authenticated
using (status = 'published' or user_id = (select auth.uid()));
create policy articles_insert_own on public.articles
for insert to authenticated
with check (user_id = (select auth.uid()));
create policy articles_update_own on public.articles
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
create policy articles_delete_own on public.articles
for delete to authenticated
using (user_id = (select auth.uid()));

-- Public author profile cards/social links; only the account owner can edit their profile.
create policy author_profiles_select_public on public.author_profiles
for select to anon, authenticated using (true);
create policy author_profiles_insert_own on public.author_profiles
for insert to authenticated with check (user_id = (select auth.uid()));
create policy author_profiles_update_own on public.author_profiles
for update to authenticated using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
create policy author_profiles_delete_own on public.author_profiles
for delete to authenticated using (user_id = (select auth.uid()));

-- Reaction row details stay private to their owner; aggregate counts are exposed through a safe RPC.
create policy article_reactions_select_own on public.article_reactions
for select to authenticated using (user_id = (select auth.uid()));
create policy article_reactions_insert_own on public.article_reactions
for insert to authenticated with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.articles a where a.id = article_id and a.status = 'published')
);
create policy article_reactions_update_own on public.article_reactions
for update to authenticated using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.articles a where a.id = article_id and a.status = 'published')
);
create policy article_reactions_delete_own on public.article_reactions
for delete to authenticated using (user_id = (select auth.uid()));

-- Security-definer helper avoids ambiguous column names in RLS when checking a reply's parent.
create or replace function public.fynvera_comment_parent_matches(p_parent_id bigint, p_article_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_parent_id is null or exists (
    select 1
    from public.article_comments c
    join public.articles a on a.id = c.article_id and a.status = 'published'
    where c.id = p_parent_id
      and c.article_id = p_article_id
  );
$$;
revoke all on function public.fynvera_comment_parent_matches(bigint, uuid) from public;
grant execute on function public.fynvera_comment_parent_matches(bigint, uuid) to authenticated;

-- Comments on published stories are public. Only the comment owner can change/delete their rows.
create policy article_comments_select_public on public.article_comments
for select to anon, authenticated using (
  exists (select 1 from public.articles a where a.id = article_id and a.status = 'published')
);
create policy article_comments_insert_own on public.article_comments
for insert to authenticated with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.articles a where a.id = article_id and a.status = 'published')
  and public.fynvera_comment_parent_matches(parent_id, article_id)
);
create policy article_comments_update_own on public.article_comments
for update to authenticated using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.articles a where a.id = article_id and a.status = 'published')
  and public.fynvera_comment_parent_matches(parent_id, article_id)
);
create policy article_comments_delete_own on public.article_comments
for delete to authenticated using (user_id = (select auth.uid()));

-- Bookmarks are private; target stories must be published at the point a bookmark is created.
create policy article_bookmarks_select_own on public.article_bookmarks
for select to authenticated using (user_id = (select auth.uid()));
create policy article_bookmarks_insert_own on public.article_bookmarks
for insert to authenticated with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.articles a where a.id = article_id and a.status = 'published')
);
create policy article_bookmarks_delete_own on public.article_bookmarks
for delete to authenticated using (user_id = (select auth.uid()));

-- A member may follow/unfollow another member but cannot follow themself.
create policy author_follows_select_participant on public.author_follows
for select to authenticated using (follower_id = (select auth.uid()) or followed_id = (select auth.uid()));
create policy author_follows_insert_own on public.author_follows
for insert to authenticated with check (follower_id = (select auth.uid()) and follower_id <> followed_id);
create policy author_follows_delete_own on public.author_follows
for delete to authenticated using (follower_id = (select auth.uid()));

-- Indexes for public feeds, comments and author dashboards.
create index if not exists articles_status_created_at_idx on public.articles (status, created_at desc);
create index if not exists articles_user_created_at_idx on public.articles (user_id, created_at desc);
create index if not exists articles_category_subcategory_idx on public.articles (category, subcategory);
create index if not exists article_comments_article_created_at_idx on public.article_comments (article_id, created_at);
create index if not exists article_reactions_user_idx on public.article_reactions (user_id, article_id);
create index if not exists article_bookmarks_user_created_at_idx on public.article_bookmarks (user_id, created_at desc);
create index if not exists author_follows_followed_idx on public.author_follows (followed_id, follower_id);

-- 6) Safe public aggregate RPC for likes/dislikes; the dislike total is available internally
-- for calculations but the UI intentionally does not show it.
create or replace function public.article_reaction_counts(p_article_id uuid)
returns table(likes bigint, dislikes bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    count(*) filter (where r.reaction = 'like')::bigint as likes,
    count(*) filter (where r.reaction = 'dislike')::bigint as dislikes
  from public.article_reactions r
  join public.articles a on a.id = r.article_id
  where r.article_id = p_article_id and a.status = 'published';
$$;
revoke all on function public.article_reaction_counts(uuid) from public;
grant execute on function public.article_reaction_counts(uuid) to anon, authenticated;

-- Correct follower/following/likes-received totals against user_id in the supplied schema.
create or replace function public.author_social_counts(p_author_id uuid)
returns table(followers bigint, following bigint, likes_received bigint, published_articles bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*)::bigint from public.author_follows f where f.followed_id = p_author_id) as followers,
    (select count(*)::bigint from public.author_follows f where f.follower_id = p_author_id) as following,
    (select count(*)::bigint
       from public.article_reactions r
       join public.articles a on a.id = r.article_id
      where a.user_id = p_author_id and a.status = 'published' and r.reaction = 'like') as likes_received,
    (select count(*)::bigint from public.articles a where a.user_id = p_author_id and a.status = 'published') as published_articles;
$$;
revoke all on function public.author_social_counts(uuid) from public;
grant execute on function public.author_social_counts(uuid) to anon, authenticated;

-- 7) Public images, private uploads. Each signed-in author can write only to their own folder.
insert into storage.buckets (id, name, public)
values ('article-images', 'article-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists article_image_owner_upload on storage.objects;
drop policy if exists article_image_owner_update on storage.objects;
drop policy if exists article_images_public_read on storage.objects;
drop policy if exists article_images_owner_delete on storage.objects;
create policy article_images_public_read on storage.objects
for select to anon, authenticated using (bucket_id = 'article-images');
create policy article_image_owner_upload on storage.objects
for insert to authenticated with check (
  bucket_id = 'article-images' and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy article_image_owner_update on storage.objects
for update to authenticated using (
  bucket_id = 'article-images' and (storage.foldername(name))[1] = (select auth.uid())::text
) with check (
  bucket_id = 'article-images' and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy article_images_owner_delete on storage.objects
for delete to authenticated using (
  bucket_id = 'article-images' and (storage.foldername(name))[1] = (select auth.uid())::text
);

commit;

-- After running: sign in to FYNVERA, publish a test article, like/dislike it, add/edit/reply/delete
-- a test comment, bookmark it, follow another author, and confirm dashboard counts refresh.
