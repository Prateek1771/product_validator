-- Bring-your-own-key vault + per-user model choice. Backend-only: no browser role may touch these tables.
create table if not exists public.user_keys (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('openai','anthropic','google','openrouter','context','tavily','firecrawl')),
  key_enc text not null,          -- Fernet ciphertext (SECRETS_KEY)
  hint text not null,             -- last 4 chars, safe to show
  verified boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);

create table if not exists public.user_llm (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text not null check (provider in ('openai','anthropic','google','openrouter')),
  fast_model text not null,
  strong_model text not null,
  updated_at timestamptz not null default now()
);

alter table public.user_keys enable row level security;
alter table public.user_llm enable row level security;
-- No policies on purpose: with RLS on and privileges revoked, only the admin API key (backend) can read or write.
revoke all on public.user_keys, public.user_llm from anon, authenticated;
