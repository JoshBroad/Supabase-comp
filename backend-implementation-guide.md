# Vibe Architect - Backend Implementation Guide

This document is the backend-only technical specification for Vibe Architect, derived from the repository reference docs [backend.md](file:///c:/Users/joshua.broad/Documents/trae_projects/trae/backend.md), [supec-full.md](file:///c:/Users/joshua.broad/Documents/trae_projects/trae/supec-full.md), and [supabse.md](file:///c:/Users/joshua.broad/Documents/trae_projects/trae/supabse.md). It follows Supabase backend best practices: schema-as-code migrations, least-privilege access, and default-deny RLS.

## 1. Architecture Overview

The system operates on a dual-environment model:

### 1.1 Control Plane (Orchestrator)
The central Supabase project responsible for:
*   Storing build sessions, events, spec embeddings, and drift alerts.
*   Publishing Realtime updates to the frontend via the `build:{sessionId}` channel.
*   Running the orchestration service (LangGraph runner).
*   Executing scheduled drift checks (via `pg_cron` or external scheduler).

### 1.2 Provisioned Environment (Target)
The generated Supabase project (or branch) created for the user. It contains:
*   The application schema (tables, constraints).
*   RLS policies.
*   Deployed Edge Functions.
*   Storage buckets.
*   This environment is "preview-ready" and directly accessible by the generated frontend.

---

## 2. Control Plane Database Schema

The Control Plane database manages the orchestration state. All tables should be created in the `public` schema.

### 2.0 Required Extensions

```sql
create extension if not exists pgcrypto;
create extension if not exists vector;
```

### 2.1 `build_sessions`
Stores the state of each build request.

```sql
create table public.build_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  status text check (status in ('queued', 'running', 'succeeded', 'failed', 'canceled')),
  template text not null,
  vibe_text text not null,
  options jsonb default '{}'::jsonb,
  plan jsonb,
  environment jsonb,
  outputs jsonb,
  error text,
  created_by uuid,
  share_token text not null default encode(gen_random_bytes(24), 'base64url')
);

create index if not exists build_sessions_created_at_idx on public.build_sessions (created_at desc);
create unique index if not exists build_sessions_share_token_uidx on public.build_sessions (share_token);
```

### 2.1.1 `build_sessions.updated_at` trigger

```sql
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
```

### 2.2 `build_events`
An append-only log of all actions taken during the build process. Used for the frontend timeline and audit trails.

```sql
create table public.build_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.build_sessions(id) on delete cascade,
  ts timestamptz default now(),
  type text not null,
  message text not null,
  payload jsonb default '{}'::jsonb
);

create index if not exists build_events_session_ts_idx on public.build_events (session_id, ts asc);
```

### 2.3 `spec_chunks`
Stores the vectorized representation of the user's requirements ("Vibe Spec") for drift detection.

```sql
create table public.spec_chunks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.build_sessions(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  embedding vector(1536),
  metadata jsonb default '{}'::jsonb
);

create index if not exists spec_chunks_session_chunk_idx on public.spec_chunks (session_id, chunk_index);
```

### 2.4 `drift_alerts`
Records detected discrepancies between the spec and the actual provisioned environment.

```sql
create table public.drift_alerts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.build_sessions(id) on delete cascade,
  ts timestamptz default now(),
  severity text check (severity in ('low', 'medium', 'high', 'critical')),
  type text not null,
  resource text not null,
  spec_chunk_id uuid references public.spec_chunks(id),
  recommendation text
);

create index if not exists drift_alerts_session_ts_idx on public.drift_alerts (session_id, ts desc);
```

---

## 3. Authentication & Authorization (Control Plane)

### 3.1 Auth configuration (Supabase Auth)

Implement using Supabase Auth defaults with secure settings:
* Email/password enabled; require email confirmation if feasible for the demo.
* OAuth providers optional; if enabled, restrict redirect URLs to known domains.
* No service-role keys or Management API tokens are ever exposed to browsers.

### 3.2 Control plane access model

The Control Plane should not expose raw table access to anonymous clients. Instead:
* The REST API endpoints below are implemented as Edge Functions (or a Node server) and use a server-side Supabase client.
* RLS remains enabled and default-deny for all control-plane tables.
* The server authenticates requests and authorizes them based on either:
  * an authenticated user session, or
  * a share token (`share_token`) for public demo sharing.

### 3.3 RLS policies (Control Plane)

Enable RLS and apply minimal policies so only the backend service can mutate state, while allowing read access by share token:

```sql
alter table public.build_sessions enable row level security;
alter table public.build_events enable row level security;
alter table public.spec_chunks enable row level security;
alter table public.drift_alerts enable row level security;
```

Access is enforced via Edge Functions using service role. If you must allow limited direct reads for demo purposes, use share-token gating via RPC:

```sql
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
```

---

## 4. API Specification

The backend exposes a REST API (via Supabase Edge Functions or a Node.js service) for the frontend to initiate and monitor builds.

### 4.1 Create Session
*   **Endpoint:** `POST /sessions`
*   **Body:**
    ```json
    {
      "vibeText": "string",
      "template": "marketplace" | "saas",
      "options": {
        "enableAnalytics": boolean,
        "enableDriftSentinel": boolean,
        "environmentMode": "branch" | "project"
      }
    }
    ```
*   **Response:** `{ "sessionId": "uuid" }`

### 4.2 Get Session
*   **Endpoint:** `GET /sessions?id=:id`
*   **Response:**
    ```json
    {
      "id": "uuid",
      "status": "running",
      "template": "marketplace",
      "vibeText": "...",
      "options": {...},
      "environment": {...},
      "outputs": {...},
      "error": null
    }
    ```

### 4.3 Get Session Events
*   **Endpoint:** `GET /events?session_id=:id`
*   **Response:** Array of `BuildEvent` objects, ordered by `ts`.

### 4.4 Start Orchestration Run

*   **Endpoint:** `POST /sessions` (Automatic trigger)
*   **Behavior:**
    * Creating a session automatically triggers the orchestration process in the background.
    * Marks session as `queued` initially, then `running`.
    * Starts the build simulation for `sessionId`.
    * Emits `plan_created` (if plan not present), then streams all subsequent events.

---

## 5. Realtime Contract

The backend streams updates to the frontend using Supabase Realtime.

*   **Channel Name:** `build:{sessionId}`

### 5.1 Presence (Architect State)
Used to show the "Ghost Cursor" or AI activity indicator.
*   **Payload:**
    ```json
    {
      "actor": "architect",
      "step": "current_step_name",
      "focus": {
        "type": "table" | "policy" | "function" | "analytics",
        "name": "resource_name"
      },
      "progress": 0.5 // 0.0 to 1.0
    }
    ```

### 5.2 Events (Timeline Updates)
Broadcasts when a significant action completes.
*   **Event Types:**
    *   `plan_created`
    *   `environment_created`
    *   `migration_started`
    *   `table_created`
    *   `rls_enabled`
    *   `policy_created`
    *   `edge_function_deployed`
    *   `analytics_configured`
    *   `build_succeeded`
    *   `build_failed`
    *   `drift_detected`

---

## 6. LangGraph Orchestration

The core logic is a LangGraph state machine. Each node is responsible for a specific phase of the build.

### 6.1 Orchestrator Nodes
1.  **`ingest_vibe`**:
    *   Chunks the `vibeText`.
    *   Generates embeddings and stores them in `spec_chunks`.
    *   Emits `plan_created`.
2.  **`generate_plan`**:
    *   Selects a template baseline.
    *   Maps requirements to schema changes, policies, and functions.
    *   Persists the plan to `build_sessions`.
3.  **`provision_environment`**:
    *   Creates a Supabase Branch (fast) or Project (slow) via Management API.
    *   Stores connection details in `build_sessions.environment`.
    *   Emits `environment_created`.
4.  **`apply_migrations`**:
    *   Generates SQL migrations based on the plan.
    *   Applies migrations to the provisioned environment.
    *   Emits `migration_started`, `table_created`.
5.  **`configure_rls`**:
    *   Enables RLS on all domain tables.
    *   Creates policies based on the spec (e.g., "users can only see their own data").
    *   Emits `rls_enabled`, `policy_created`.
6.  **`deploy_edge_functions`**:
    *   Deploys necessary Edge Functions (e.g., `drift_check`).
    *   Emits `edge_function_deployed`.
7.  **`configure_analytics`**:
    *   (Optional) Attaches the Iceberg/S3 wrapper or configures analytics views.
    *   Emits `analytics_configured`.
8.  **`finalize`**:
    *   Updates session status to `succeeded` or `failed`.
    *   Emits `build_succeeded` or `build_failed`.

### 6.2 Execution Requirements
*   Every node must write to `build_events`.
*   Every node must broadcast its status via Realtime Presence.
*   The graph must be checkpointed to Postgres (via Supabase) to allow resumption after failures.

---

## 7. Supabase MCP Integration

The agent uses the **Model Context Protocol (MCP)** to interact with Supabase safely.

### 7.1 Configuration
*   **Server:** `supabase-mcp` (Official or Community server).
*   **Scope:** `project_ref` must be set to the *provisioned* environment's ID (not the control plane).
*   **Mode:** Start in `read_only=true` for inspection, switch to `read_only=false` for specific provisioning steps if not using direct SQL.

If your MCP client config currently looks like:

```json
{
  "mcpServers": {
    "supabase-mcp": {}
  }
}
```

add the server-scoped settings required by your MCP client runtime (at minimum: project scoping and an access token mechanism). Keep all tokens server-side only.

### 7.2 Key MCP Actions
*   **Schema Introspection:** The agent uses MCP to list tables and columns to verify the current state before applying changes.
*   **Policy Verification:** The agent queries `pg_policies` via MCP to confirm RLS is correctly applied.
*   **Data Seeding:** (Optional) The agent can insert sample data into the provisioned environment for the preview.

### 7.3 MCP tool mapping (orchestrator nodes)

This is the required mapping from LangGraph nodes to MCP-driven operations. Names below describe capabilities; use the equivalent operations exposed by your Supabase MCP server.

* `ingest_vibe`
  * No MCP required
* `generate_plan`
  * No MCP required
* `provision_environment`
  * Preferred: Management API (server-side) for project/branch creation
  * Optional: MCP if your server supports branch/project management
* `apply_migrations`
  * MCP: execute SQL migration files against the provisioned environment
  * MCP: verify schema state (list tables, columns, constraints)
* `configure_rls`
  * MCP: enable RLS on domain tables
  * MCP: create RLS policies
  * MCP: verify RLS/policies by querying `pg_class` and `pg_policies`
* `deploy_edge_functions`
  * MCP: deploy Edge Function code and secrets to the provisioned environment
  * MCP: verify function exists and returns expected shape
* `configure_analytics`
  * MCP: create analytics wrapper objects (views/functions) in the provisioned environment
  * MCP: run a read-only query to validate non-empty results

### 7.4 MCP audit logging requirements

Every MCP call made by the orchestrator must be logged to `public.build_events.payload` with:
* tool name
* target environment identifier
* input summary with secrets removed
* output summary with secrets removed
* timestamps and duration

---

---

### 8.1 Control Plane Security
* The Control Plane backend service is the only actor that writes to `build_sessions`, `build_events`, `spec_chunks`, and `drift_alerts`.
* If anonymous sharing is required, use `share_token` with a narrow RPC/Edge Function boundary rather than broad table `select` policies.

### 8.2 Provisioned Environment Baseline (Template)
The generated app must adhere to strict security defaults:
*   **RLS Enabled:** MUST be enabled on all tables.
*   **Public Access:** No public `insert/update/delete` unless explicitly required by the spec.
*   **Service Role:** The frontend should never use the service role key.

#### Example Policy Template (Marketplace)
*   `listings`:
    *   `SELECT`: Public.
    *   `INSERT/UPDATE/DELETE`: `auth.uid() == owner_id`.
*   `bids`:
    *   `SELECT`: `auth.uid() == bidder_id` OR `auth.uid() == listing_owner_id`.
    *   `INSERT`: Authenticated users only.

---

## 9. Provisioned Environment (Generated Backend) Specification

This section defines what the orchestrator provisions in the target Supabase environment. v1 supports templates with predictable outputs.

### 9.1 Common primitives (all templates)

#### 9.1.1 `profiles` table + new-user trigger

```sql
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  display_name text,
  avatar_url text
);

alter table public.profiles enable row level security;

create policy "profiles_read_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());
```

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'avatar_url')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
```

#### 9.1.2 `updated_at` trigger utility

```sql
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
```

### 9.2 Template A: Marketplace (recommended v1)

#### 9.2.1 Tables

```sql
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  price_cents int not null check (price_cents >= 0),
  status text not null default 'active' check (status in ('active', 'sold', 'archived'))
);

create trigger listings_set_updated_at
before update on public.listings
for each row execute function public.set_updated_at();
```

```sql
create table if not exists public.bids (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  bidder_id uuid not null references public.profiles(id) on delete cascade,
  amount_cents int not null check (amount_cents > 0)
);

create index if not exists bids_listing_idx on public.bids (listing_id);
create index if not exists bids_bidder_idx on public.bids (bidder_id);
```

```sql
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete restrict,
  total_cents int not null check (total_cents >= 0),
  status text not null default 'created' check (status in ('created', 'paid', 'canceled', 'fulfilled'))
);

create index if not exists orders_buyer_idx on public.orders (buyer_id);
```

#### 9.2.2 RLS policies

```sql
alter table public.listings enable row level security;
alter table public.bids enable row level security;
alter table public.orders enable row level security;

create policy "listings_read_public"
on public.listings
for select
to anon, authenticated
using (status = 'active');

create policy "listings_write_owner"
on public.listings
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "bids_read_own"
on public.bids
for select
to authenticated
using (bidder_id = auth.uid());

create policy "bids_insert_own"
on public.bids
for insert
to authenticated
with check (bidder_id = auth.uid());

create policy "orders_read_own"
on public.orders
for select
to authenticated
using (buyer_id = auth.uid());

create policy "orders_insert_own"
on public.orders
for insert
to authenticated
with check (buyer_id = auth.uid());
```

### 9.3 Edge Functions (Provisioned Environment)

v1 must deploy at least one Edge Function. Recommended functions:
* `drift_check`: inspects schema/RLS/policies and returns drift findings.
* `analytics_query`: executes a read-only analytics query and returns results with provenance.

Edge Functions must:
* Validate JWTs from `Authorization: Bearer ...` when acting as-user.
* Use least-privilege keys and never return secrets in responses.

#### 9.3.0 Required SQL functions (called by Edge Functions)

```sql
create or replace function public.inspect_security_state()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  tables_json jsonb;
  policies_json jsonb;
begin
  select jsonb_agg(jsonb_build_object('table', c.relname, 'rls_enabled', c.relrowsecurity))
  into tables_json
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relname in ('profiles','listings','bids','orders');

  select jsonb_agg(
    jsonb_build_object(
      'table', tablename,
      'policy', policyname,
      'cmd', cmd,
      'roles', roles
    )
  )
  into policies_json
  from pg_policies
  where schemaname = 'public'
    and tablename in ('profiles','listings','bids','orders');

  return jsonb_build_object('tables', coalesce(tables_json, '[]'::jsonb), 'policies', coalesce(policies_json, '[]'::jsonb));
end;
$$;

revoke all on function public.inspect_security_state() from public;
grant execute on function public.inspect_security_state() to authenticated;
```

```sql
create or replace function public.run_analytics_query()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(t), '[]'::jsonb)
  from (
    select
      date_trunc('day', created_at) as day,
      count(*) as orders,
      sum(total_cents) as gross_cents
    from public.orders
    group by 1
    order by 1 desc
    limit 30
  ) t
$$;

revoke all on function public.run_analytics_query() from public;
grant execute on function public.run_analytics_query() to authenticated;
```

#### 9.3.1 `drift_check` (Deno)

```ts
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return new Response("Unauthorized", { status: 401 });

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data, error } = await supabase.rpc("inspect_security_state");
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true, state: data });
});
```

#### 9.3.2 `analytics_query` (Deno)

```ts
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data, error } = await supabase.rpc("run_analytics_query");

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true, provenance: "wrapper", rows: data ?? [] });
});
```

### 9.4 Storage (optional v1 demo)

If the template requires file uploads (e.g., listing images), implement Storage with private-by-default buckets and folder-based isolation.

RLS policies on `storage.objects` for a bucket named `listing-images`:

```sql
create policy "listing_images_read_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "listing_images_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "listing_images_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "listing_images_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);
```

---

## 10. Drift Detection & Analytics (Control Plane)

### 10.1 Drift Sentinel
A scheduled process (or Edge Function) that monitors the provisioned environment.
*   **Triggers:** `pg_cron` in the Control Plane or an external scheduler.
*   **Checks:**
    1.  Is RLS enabled on all tables?
    2.  Do required policies exist?
    3.  Are there schema deviations from the plan?
*   **Action:**
    *   Create a row in `drift_alerts`.
    *   Broadcast a `drift_detected` event.
    *   Use vector search on `spec_chunks` to explain *why* the drift matters.

### 10.2 Iceberg/S3 Wrapper (Analytics)
*   **Demo Approach:** Pre-provision a wrapper to a read-only S3 bucket containing sample data.
*   **Function:** `run_analytics_query(sessionId)` executes a query against this wrapper and returns results + metadata to prove the integration works.

---

## 11. Backend Verification Checklist

This checklist is designed to be executed via Supabase MCP (read-only where possible).

### 11.1 Control plane schema checks

```sql
select to_regclass('public.build_sessions') is not null as build_sessions_exists;
select to_regclass('public.build_events') is not null as build_events_exists;
select to_regclass('public.spec_chunks') is not null as spec_chunks_exists;
select to_regclass('public.drift_alerts') is not null as drift_alerts_exists;
```

```sql
select relname, relrowsecurity
from pg_class
where relname in ('build_sessions','build_events','spec_chunks','drift_alerts')
order by relname;
```

### 11.2 Provisioned environment schema checks (Marketplace)

```sql
select relname, relrowsecurity
from pg_class
where relname in ('profiles','listings','bids','orders')
order by relname;
```

```sql
select tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles','listings','bids','orders')
order by tablename, policyname;
```

### 11.3 RLS behavior checks (as-user vs anonymous)

Execute as anonymous:
* `select * from public.orders` returns zero rows (or is denied) depending on policy choices.

Execute as authenticated user:
* Inserting into `orders` with `buyer_id = auth.uid()` succeeds.
* Inserting into `orders` with `buyer_id != auth.uid()` fails RLS.

### 11.4 Edge function checks

* `POST /functions/v1/drift_check` returns `{ ok: true, drift: [...] }`
* `POST /functions/v1/analytics_query` returns `{ ok: true, rows: [...] }` and a non-empty `rows` array in demo mode
