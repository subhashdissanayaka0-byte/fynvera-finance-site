-- FYNVERA security hardening patch
-- Safe to re-run. No application data or existing public article/avatar reads are removed.

begin;

-- Remove a global public read policy that exposed every Storage bucket.
-- Public reading remains available only for the explicitly public buckets below.
drop policy if exists "Enable read access for all users" on storage.objects;

-- Avatars are publicly readable, but only an authenticated owner may write
-- inside the folder named with their own auth.uid().
drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can update own avatar 1oj01fe_0" on storage.objects;
drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Public article pages display aggregate like/dislike counts even when signed out.
-- This SECURITY DEFINER function has a fixed empty search_path, fully-qualified
-- table references, and returns aggregate counts only for published articles.
grant execute on function public.article_reaction_counts(uuid) to anon, authenticated;

commit;
