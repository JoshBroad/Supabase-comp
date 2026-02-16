# SUPABASE_BACKEND.md — Vibe-Architect Supabase/Backend Repo
**Stack:** Node.js (or Deno for Edge Functions), TypeScript, LangGraph, Supabase MCP, Supabase Management API, Supabase Realtime, Postgres + pgvector (HNSW), optional Iceberg/S3 wrapper demo.

**Purpose:** The “control plane” that orchestrates provisioning and streams events/presence to the frontend.

---

## 1) Goals (v1)
- Accept a Vibe Spec and create a build session.
- Run a LangGraph orchestration that:
  - generates a build plan from template + vibe
  - provisions a Supabase branch/project
  - applies schema migrations and RLS policies
  - deploys at least one Edge Function
  - configures (or attaches) Iceberg/S3 wrapper demo
- Stream build progress to frontend:
  - Realtime Presence (“ghost cursor”)
  - Build events timeline
- Store spec chunks as embeddings and detect drift.

---

## 2) Architecture Overview
### 2.1 Control Plane vs Provisioned Environment
**Control Plane Supabase Project**
- Stores:
  - sessions/events/spec embeddings/drift alerts
- Publishes:
  - realtime channels `build:{sessionId}`
- Runs:
  - orchestration service (LangGraph runner)
  - scheduled drift checks (pg_cron OR external scheduler)

**Provisioned Environment (branch/project)**
- The generated backend: schema/RLS/storage/edge functions
- A “Preview-ready” environment

---

## 3) Public API (for frontend repo)
### POST `/sessions`
**Body**
- `{ vibeText: string, template: "marketplace"|"saas", options: { enableAnalytics: boolean, enableDriftSentinel: boolean, environmentMode: "branch"|"project" } }`

**Response**
- `{ sessionId: string }`

### GET `/sessions/:id`
**Response**
- `{ id, status, template, vibeText, options, environment, outputs, error? }`

### GET `/sessions/:id/events`
**Response**
- `BuildEvent[]` ordered by ts

> Note: Keep API stable so frontend integrates cleanly.

---

## 4) Realtime Contract
**Channel:** `build:{sessionId}`

### 4.1 Presence (architect)
- `actor: "architect"`
- `step: string`
- `focus: { type: "table"|"policy"|"function"|"analytics", name: string }`
- `progress: number 0..1`

### 4.2 Events
Emit events with:
- `type`, `message`, `payload`, `ts`

Minimum event types:
- `plan_created`
- `environment_created`
- `migration_started`
- `table_created`
- `rls_enabled`
- `policy_created`
- `edge_function_deployed`
- `analytics_configured`
- `build_succeeded`
- `build_failed`
- `drift_detected`

---

## 5) Control Plane Database Schema (v1)
### `build_sessions`
- id (uuid pk)
- created_at
- status (queued|running|succeeded|failed|canceled)
- template (text)
- vibe_text (text)
- options (jsonb)
- plan (jsonb)
- environment (jsonb) — project/branch refs + urls
- outputs (jsonb) — preview config
- error (text null)

### `build_events`
- id uuid pk
- session_id fk
- ts timestamptz
- type text
- message text
- payload jsonb

### `spec_chunks`
- id uuid pk
- session_id fk
- chunk_index int
- content text
- embedding vector
- metadata jsonb

### `drift_alerts`
- id uuid pk
- session_id fk
- ts
- severity
- type
- resource
- spec_chunk_id (nullable)
- recommendation text

---

## 6) LangGraph Orchestrator (node graph)
### Node list (recommended)
1. `ingest_vibe`
   - chunk vibe into sections
   - create embeddings and store in `spec_chunks`
   - emit `plan_created` (draft plan)

2. `generate_plan`
   - select template baseline
   - map vibe requirements into plan fields:
     - tables, policies, functions, analytics steps
   - persist plan to session

3. `provision_environment`
   - environmentMode:
     - branch: create branch from main
     - project: create new project
   - store refs + urls in session
   - emit `environment_created`

4. `apply_migrations`
   - generate SQL migrations (template + vibe)
   - apply to provisioned env
   - emit `migration_started`, `table_created` events

5. `configure_rls`
   - enable RLS on domain tables
   - create policies
   - emit `rls_enabled`, `policy_created`

6. `deploy_edge_functions`
   - deploy `drift_check` (and optional `spec_gate`)
   - emit `edge_function_deployed`

7. `configure_analytics`
   - if enabled: attach/query wrapper to Iceberg demo dataset
   - emit `analytics_configured`

8. `finalize`
   - mark session succeeded/failed
   - emit `build_succeeded` or `build_failed`

### Execution requirement
- Each node must:
  - write durable logs to `build_events`
  - broadcast realtime event
  - update presence step/focus/progress

---

## 7) Supabase MCP Integration
**Goal:** Use MCP so your agent (Claude Code/Trae) can safely perform Supabase ops.

### v1 requirement
- At least one critical provisioning action must be demonstrably driven through MCP tooling (vs only local scripts), such as:
  - creating a branch
  - applying migration
  - deploying Edge Function
  - configuring wrapper

### Operational policy
- All MCP tool calls must be:
  - logged (redacted) into `build_events.payload.tool_calls[]`
  - replayable for judge audit

---

## 8) Provisioning Strategy (pragmatic v1)
### Recommended: Branch-based environment
- Faster than full project creation
- Enough to demonstrate “infra from spec”
- Still judge-worthy when coupled with realtime + drift + analytics

### Alternative: New project creation
- Bigger flex, potentially slower/unreliable for demo cadence
- Use only if you can pre-warm or accept longer times with a strong progress UI

---

## 9) RLS Baseline Policies (template rules)
### Marketplace template (minimum)
- `listings`: select public; insert/update/delete only by owner
- `bids`: select only own bids; insert only for self
- `orders`: select only own orders; insert only by authenticated user

**Must**
- Enable RLS on each domain table.
- Emit events when enabling and when creating policies.

---

## 10) Spec Drift Sentinel (v1)
### What drift means (v1 invariants)
- RLS disabled on any domain table
- A required policy missing (by name or structural check)
- A required table missing

### Drift check execution
Option A: **pg_cron** in control plane triggers Edge Function
Option B: external scheduler calls a control-plane endpoint

### Drift behavior
- On drift detection:
  - insert `drift_alerts` row
  - broadcast `drift_detected` event
  - recommendation must include “fix steps” (SQL/policy restore)

### Vector linkage
- Use embeddings to link alert → most similar spec chunk to explain “why this matters.”

---

## 11) Iceberg/S3 Wrapper Demo (v1)
**Approach:** keep this reliable.
- Pre-provision:
  - a known dataset and wrapper configuration in a demo environment, OR
  - a scriptable “attach” step that is deterministic
- Demo endpoint/function:
  - `run_analytics_query(sessionId)` returns rows + provenance metadata
- Frontend calls this via backend API or directly via provisioned env.

---

## 12) Security Requirements
- Browser must never receive service-role keys or management tokens.
- Management API / provisioning tokens must remain server-side only.
- Any “handoff” keys must be scoped and revocable where possible.
- All build actions must be auditable in `build_events`.

---

## 13) Repo Implementation Plan (v1 milestones)
1. Control plane DB schema + session API
2. Realtime: event broadcasting + presence updates
3. LangGraph skeleton with stub nodes emitting fake events
4. Real provisioning node (branch/project)
5. Migrations + RLS nodes
6. Edge function deploy node
7. Analytics wrapper demo node
8. Drift sentinel + alert broadcast
9. Hardening: retries, error states, redaction

---

## 14) Backend Acceptance Tests (manual)
- [ ] `POST /sessions` creates session row
- [ ] realtime channel streams events & presence
- [ ] environment created and refs stored
- [ ] schema created with at least 1 domain table
- [ ] RLS enabled + policy exists; unauth read blocked/empty
- [ ] edge function deployed
- [ ] analytics query returns rows
- [ ] drift alert broadcast on simulated drift

---