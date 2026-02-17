create or replace function public.is_service_role()
returns boolean
language sql
stable
as $$
  select current_setting('request.jwt.claim.role', true) = 'service_role'
$$;

create policy "build_sessions_read_by_share_token"
on public.build_sessions
for select
to anon, authenticated
using (false);

create policy "build_sessions_insert_denied"
on public.build_sessions
for insert
to anon, authenticated
with check (false);

create policy "build_sessions_update_service_role"
on public.build_sessions
for update
to anon, authenticated
using (public.is_service_role())
with check (public.is_service_role());

create policy "build_sessions_delete_service_role"
on public.build_sessions
for delete
to anon, authenticated
using (public.is_service_role());

create policy "build_events_select_denied"
on public.build_events
for select
to anon, authenticated
using (false);

create policy "build_events_insert_service_role"
on public.build_events
for insert
to anon, authenticated
with check (public.is_service_role());

create policy "spec_chunks_select_denied"
on public.spec_chunks
for select
to anon, authenticated
using (false);

create policy "spec_chunks_insert_service_role"
on public.spec_chunks
for insert
to anon, authenticated
with check (public.is_service_role());

create policy "drift_alerts_select_denied"
on public.drift_alerts
for select
to anon, authenticated
using (false);

create policy "drift_alerts_insert_service_role"
on public.drift_alerts
for insert
to anon, authenticated
with check (public.is_service_role());

create or replace function public.session_create(
  p_vibe_text text,
  p_template text,
  p_options jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
begin
  insert into public.build_sessions (status, template, vibe_text, options, created_by)
  values ('queued', p_template, p_vibe_text, coalesce(p_options, '{}'::jsonb), auth.uid())
  returning id into v_session_id;

  insert into public.build_events (session_id, type, message, payload)
  values (
    v_session_id,
    'session_created',
    'Created build session',
    jsonb_build_object('template', p_template)
  );

  return v_session_id;
end;
$$;

revoke all on function public.session_create(text, text, jsonb) from public;
grant execute on function public.session_create(text, text, jsonb) to anon, authenticated;

create or replace function public.session_get(p_session_id uuid)
returns public.build_sessions
language sql
security definer
set search_path = public
as $$
  select *
  from public.build_sessions
  where id = p_session_id
  limit 1
$$;

revoke all on function public.session_get(uuid) from public;
grant execute on function public.session_get(uuid) to anon, authenticated;

create or replace function public.session_events(p_session_id uuid)
returns setof public.build_events
language sql
security definer
set search_path = public
as $$
  select *
  from public.build_events
  where session_id = p_session_id
  order by ts asc
$$;

revoke all on function public.session_events(uuid) from public;
grant execute on function public.session_events(uuid) to anon, authenticated;
