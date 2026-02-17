create extension if not exists pgcrypto with schema extensions;
create extension if not exists vector with schema extensions;

create table if not exists public.build_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text check (status in ('queued', 'running', 'succeeded', 'failed', 'canceled')),
  template text not null,
  vibe_text text not null,
  options jsonb not null default '{}'::jsonb,
  plan jsonb,
  environment jsonb,
  outputs jsonb,
  error text,
  created_by uuid,
  share_token text not null default replace(replace(encode(extensions.gen_random_bytes(24), 'base64'), '+', '-'), '/', '_')
);

create index if not exists build_sessions_created_at_idx on public.build_sessions (created_at desc);
create unique index if not exists build_sessions_share_token_uidx on public.build_sessions (share_token);

create table if not exists public.build_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.build_sessions(id) on delete cascade,
  ts timestamptz not null default now(),
  type text not null,
  message text not null,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists build_events_session_ts_idx on public.build_events (session_id, ts asc);

create table if not exists public.spec_chunks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.build_sessions(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  embedding extensions.vector(1536),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists spec_chunks_session_chunk_idx on public.spec_chunks (session_id, chunk_index);

create table if not exists public.drift_alerts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.build_sessions(id) on delete cascade,
  ts timestamptz not null default now(),
  severity text check (severity in ('low', 'medium', 'high', 'critical')),
  type text not null,
  resource text not null,
  spec_chunk_id uuid references public.spec_chunks(id),
  recommendation text
);

create index if not exists drift_alerts_session_ts_idx on public.drift_alerts (session_id, ts desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists build_sessions_set_updated_at on public.build_sessions;
create trigger build_sessions_set_updated_at
before update on public.build_sessions
for each row execute function public.set_updated_at();

alter table public.build_sessions enable row level security;
alter table public.build_events enable row level security;
alter table public.spec_chunks enable row level security;
alter table public.drift_alerts enable row level security;

create or replace function public.get_session_by_share_token(p_share_token text)
returns public.build_sessions
language sql
security definer
set search_path = public
as $$
  select *
  from public.build_sessions
  where share_token = p_share_token
  limit 1
$$;

revoke all on function public.get_session_by_share_token(text) from public;
grant execute on function public.get_session_by_share_token(text) to anon, authenticated;
