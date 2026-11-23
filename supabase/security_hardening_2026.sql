-- FYNORIX security hardening patch
-- Applied to the connected production Supabase project on 2026-11-24.
-- Safe to re-run. Does not delete application data or public article reads.

begin;

-- IMPORTANT: Storage policies are permissive by default and combine with OR.
-- Remove the older policy that allowed any authenticated user to upload into
-- article-images without checking the first folder against auth.uid().
drop policy if exists "Allow authenticated uploads qt2lnz_0" on storage.objects;

drop policy if exists "article_image_owner_upload" on storage.objects;
create policy "article_image_owner_upload"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'article-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Comment parent validation does not need SECURITY DEFINER. The invoker's
-- normal SELECT RLS policies already permit reading published article comments.
create or replace function public.fynvera_comment_parent_matches(
  p_parent_id bigint,
  p_article_id uuid
)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $function$
  select p_parent_id is null or exists (
    select 1
    from public.article_comments c
    join public.articles a on a.id = c.article_id and a.status = 'published'
    where c.id = p_parent_id
      and c.article_id = p_article_id
  );
$function$;
grant execute on function public.fynvera_comment_parent_matches(bigint, uuid) to authenticated;

-- These public SECURITY DEFINER functions intentionally return aggregate
-- counts/averages only (not user identities or private row contents) for
-- public article and author pages. Keep their fixed empty search_path and
-- fully-qualified table references. Their public execution is intentional.
grant execute on function public.article_reaction_counts(uuid) to anon, authenticated;
grant execute on function public.author_social_counts(uuid) to anon, authenticated;
grant execute on function public.get_article_rating_stats(uuid) to anon, authenticated;
grant execute on function public.get_author_rating_stats(uuid) to anon, authenticated;

-- Cover foreign keys flagged by the Supabase Performance Advisor.
create index if not exists article_ratings_user_id_idx on public.article_ratings(user_id);
create index if not exists community_posts_user_id_idx on public.community_posts(user_id);

-- Use a cached auth.uid() expression in price-alert RLS policies.
drop policy if exists "Users can create their own price alerts" on public.price_alerts;
create policy "Users can create their own price alerts"
on public.price_alerts for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own price alerts" on public.price_alerts;
create policy "Users can delete their own price alerts"
on public.price_alerts for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own price alerts" on public.price_alerts;
create policy "Users can update their own price alerts"
on public.price_alerts for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can view their own price alerts" on public.price_alerts;
create policy "Users can view their own price alerts"
on public.price_alerts for select to authenticated
using ((select auth.uid()) = user_id);

commit;
