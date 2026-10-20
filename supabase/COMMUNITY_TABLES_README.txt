FYNVERA COMMUNITY UPDATE - DATABASE NOTES
==========================================

Run order
---------
1. Run schema.sql in the Supabase SQL Editor first (if it has not already been applied).
2. Run community_update.sql in a separate query after schema.sql.
3. Keep RLS enabled. Do not give public visitors write access to private tables.

Tables added by community_update.sql
------------------------------------
1. author_profiles
   Public-facing creator profile only: username, display name, bio, and optional X/TikTok/Facebook/Telegram URLs. Private financial goals and notes are NOT stored here.

2. article_reactions
   One row per account/article with reaction='like' or reaction='dislike'. Primary key (article_id, user_id) prevents duplicate votes for the same article by the same account.

3. article_comments
   Comments for database-backed published articles. Public visitors can read comments; authenticated authors can post and delete their own comments. Comment body is limited to 2,000 characters.

4. author_follows
   Follower/followed account links. An account cannot follow itself. A unique primary key prevents duplicate follows. Users can create/delete only their own follows.

Functions
---------
- article_reaction_counts(article UUID): returns aggregate likes/dislikes for a published article; does not expose a list of voter IDs.
- author_social_counts(author UUID): returns aggregate followers, following, likes received on published articles, and published article count.

Existing table reused
---------------------
- watchlist (from schema.sql) is used for saving database-backed articles per account. No replacement table is needed for this feature.

Important limits
----------------
- Seed articles stored in the source code rather than public.articles can still be read without an account, but their browser-preview reactions/comments are local to that browser and do not sync across devices. For cross-device community features, use published articles with UUID IDs in Supabase.
- The existing articles publishing policy still requires a trusted editor entry in article_editors. Do not create a public policy that lets users add themselves to article_editors.
- These tables contain user-generated content. Add moderation/reporting and review comments regularly before scaling up the public website.
- Never use a Supabase service_role/secret key in browser code, Vercel VITE variables, or public repositories. Only use the project URL and publishable/anon key for this frontend.
