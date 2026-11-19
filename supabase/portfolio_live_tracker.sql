-- FYNVERA Portfolio Trade Details
-- Additive migration: keeps existing portfolio_holdings records and RLS policies.
-- Already applied to the connected Supabase project; run only on another project
-- after the base portfolio_holdings table exists.

alter table public.portfolio_holdings
  add column if not exists quantity numeric not null default 1 check (quantity > 0),
  add column if not exists buy_price numeric not null default 0 check (buy_price >= 0),
  add column if not exists purchase_date date,
  add column if not exists fees numeric not null default 0 check (fees >= 0),
  add column if not exists quote_symbol text,
  add column if not exists quote_currency text not null default 'USD';

-- Keep the existing owner-only RLS policies. No broker credentials or API keys
-- are stored; market prices are fetched from FYNVERA's existing public feeds.
