-- FYNVERA Personal Finance Workspace expansion
-- Owner-only financial records. Safe to run once; does not modify existing tables.

create table if not exists public.finance_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  amount numeric(14,2) not null default 0 check (amount >= 0),
  kind text not null default 'expense' check (kind in ('income','expense')),
  category text not null default 'Other',
  occurred_on date not null default current_date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  monthly_limit numeric(14,2) not null default 0 check (monthly_limit >= 0),
  budget_month date not null default date_trunc('month', current_date)::date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, category, budget_month)
);

create table if not exists public.finance_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  target_amount numeric(14,2) not null default 0 check (target_amount >= 0),
  current_amount numeric(14,2) not null default 0 check (current_amount >= 0),
  target_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  creditor text not null,
  balance numeric(14,2) not null default 0 check (balance >= 0),
  interest_rate numeric(7,3) not null default 0 check (interest_rate >= 0),
  minimum_payment numeric(14,2) not null default 0 check (minimum_payment >= 0),
  due_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount numeric(14,2) not null default 0 check (amount >= 0),
  frequency text not null default 'monthly' check (frequency in ('weekly','monthly','quarterly','yearly')),
  next_due date,
  category text not null default 'Other',
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['finance_transactions','finance_budgets','finance_goals','finance_debts','finance_bills'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_select_own', t);
    execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t || '_select_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert_own', t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t || '_insert_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_update_own', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t || '_update_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete_own', t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t || '_delete_own', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

create index if not exists finance_transactions_user_date_idx on public.finance_transactions(user_id, occurred_on desc);
create index if not exists finance_budgets_user_month_idx on public.finance_budgets(user_id, budget_month desc);
create index if not exists finance_goals_user_idx on public.finance_goals(user_id);
create index if not exists finance_debts_user_idx on public.finance_debts(user_id);
create index if not exists finance_bills_user_due_idx on public.finance_bills(user_id, next_due);
