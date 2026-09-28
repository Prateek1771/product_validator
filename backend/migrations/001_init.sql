-- Agentic Market Intelligence schema. Backend writes with the admin API key; users read their own rows via RLS.
create table if not exists public.research_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  query text not null,
  mode text not null default 'deep',
  status text not null default 'planning'
    check (status in ('planning','researching','validating','deciding','synthesizing','complete','failed')),
  state jsonb not null default '{}'::jsonb,   -- full LangGraph state snapshot (plan, timeline, errors)
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  domain text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.research_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  url text not null,
  title text,
  type text,                -- pricing | docs | changelog | blog | news | other
  snippet text,
  content text,
  fetched_at timestamptz not null default now()
);

create table if not exists public.evidence (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.research_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  claim text not null,
  source_url text,
  source_type text,
  entity text,
  topic text,
  excerpt text,
  published_at text,
  reliability real
);

-- One row per detected change; Jev's typed decisions live in `decision`.
create table if not exists public.changes (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.research_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  company text,
  title text not null,
  summary text,
  change_type text,
  impact_score int,
  confidence real,
  is_real_change boolean,
  recommended_action text,  -- alert | investigate | monitor | ignore
  decision jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null unique references public.research_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  summary jsonb not null default '{}'::jsonb,  -- exec summary, highlights, actions
  content_md text not null,
  saved boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists research_runs_user_idx on public.research_runs (user_id, created_at desc);
create index if not exists sources_run_idx on public.sources (run_id);
create index if not exists evidence_run_idx on public.evidence (run_id);
create index if not exists changes_run_idx on public.changes (run_id);
create index if not exists changes_user_idx on public.changes (user_id, created_at desc);

do $$
declare t text;
begin
  foreach t in array array['research_runs','companies','sources','evidence','changes','reports'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('drop policy if exists %I on public.%I', t || '_own_read', t);
    execute format('create policy %I on public.%I for select to authenticated using (user_id = auth.uid())', t || '_own_read', t);
  end loop;
end $$;

-- Users may bookmark their own reports and manage their watchlist; everything else is written by the backend.
drop policy if exists reports_own_update on public.reports;
create policy reports_own_update on public.reports for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists companies_own_write on public.companies;
create policy companies_own_write on public.companies for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke insert, update, delete on public.research_runs, public.sources, public.evidence, public.changes from authenticated;
revoke insert, delete on public.reports from authenticated;
revoke update on public.reports from authenticated;
grant update (saved) on public.reports to authenticated;
