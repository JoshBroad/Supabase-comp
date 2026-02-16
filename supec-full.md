# PRD — The Vibe-Architect (Supabase Power-User Competition Entry)

**Product type:** Web app + orchestration engine
**Frontend:** Next.js 14 (App Router), TypeScript, Tailwind
**Backend/orchestration:** LangGraph + Supabase MCP + Supabase Management API + Supabase Realtime + Postgres (pgvector/HNSW) + Edge Functions + Iceberg/S3 wrapper demo
**Version:** v1 (competition demo)

---

## 1) Summary

**The Vibe-Architect** is a multiplayer “Build Room” that transforms a high-level business **Vibe Spec** into a live, secured, data-connected Supabase environment (branch or project) **in real time**. Users can watch the AI “cursor” building tables, toggling RLS, and deploying Edge Functions. After provisioning, the user immediately interacts with a working preview app. A **Spec-Drift Sentinel** monitors for violations (e.g., RLS disabled) and alerts in real time with recommended fixes.

---

## 2) Problem

AI-generated backends are fast but unreliable in the ways that matter:

* “Vibe coding” creates **code**, not **infrastructure** (projects/branches, schema, policies, secrets).
* Security is usually an afterthought: **RLS missing**, weak policy defaults, secrets distributed.
* There’s no transparent UX: users can’t tell what the agent changed.
* Over time, teams introduce **spec drift** (schema/policies diverge from requirements).
* Analytics queries often impact transactional DB; teams want a lakehouse pattern.

---

## 3) Goals & Success Criteria

### Primary goals (competition)

1. **Showcase Supabase power-user features** in a visible, demoable way.
2. Deliver a “wow” UX: **Realtime ghost cursor + live schema build**.
3. Prove correctness and safety: **RLS enforced** and **drift detection** works.
4. Demonstrate “open warehouse” linkage via **Iceberg/S3 wrapper** query.

### Success criteria (v1)

* **Time-to-preview:** P50 < 120s from “Start Build” to “Preview Ready”.
* **RLS proof:** at least 1 domain table with RLS; signed-out access fails/returns empty by policy.
* **Realtime proof:** at least 20 distinct build events + presence updates visible in UI.
* **Iceberg proof:** one analytics query returns non-empty results via wrapper.
* **Drift proof:** 1 simulated drift event triggers real-time alert with fix guidance.
* **Reliability:** build completes successfully in >80% of demo runs (controlled environment).

---

## 4) Non-goals (v1)

* Perfect NL→schema for any domain; v1 supports **templates** (1–2) with AI customization.
* Full production-grade provisioning for any cloud configuration (IAM/bucket policies wizard).
* Full 3D schema visualization (2D graph + animation is sufficient).
* Deep Multigres dependency; include as roadmap positioning, not required for demo.

---

## 5) Target Users & Personas

### Persona A — Hackathon Builder (primary)

* Wants a working backend immediately.
* Cares about speed and “it works.”

### Persona B — Supabase Judge / Platform Engineer (primary)

* Cares about feature depth (Management API, Realtime, RLS, keys, Iceberg).
* Wants evidence of safe defaults and clever integration.

### Persona C — Consultant/Agency (secondary)

* Spins up client POCs quickly; wants repeatability and handoff.

### Persona D — Security-minded Team Lead (secondary)

* Wants guardrails: spec drift detection, audit logs, RLS baseline.

---

## 6) Core Use Case (Primary)

### “Vibe → Live Build Room → Working Preview”

**User story (core):**
As a builder, I paste a vibe describing my app and the system provisions a secure Supabase backend (branch/project), shows the AI building it live, and gives me a working preview app with auth + CRUD + analytics demo.

**Why the frontend matters:** It’s the judge-visible proof the AI is safely orchestrating real Supabase capabilities, not just generating code.

---

## 7) User Journey & UX Flows (Next.js)

### Flow 1 — Vibe Intake (`/`)

**Must**

* Input: vibe text + template selection (e.g., Marketplace, SaaS).
* Create a **Build Session** and redirect to Build Room.
* Show a high-level **Build Plan preview** (tables/policies/functions/analytics steps).

**Should**

* Allow “Edit vibe” before starting.
* Provide “Demo mode” toggle (uses pre-provisioned datasets where needed).

---

### Flow 2 — Build Room (`/build/[sessionId]`)

**Must**

* Live **Build Timeline** (events from orchestrator).
* Live **Presence** (Architect ghost cursor + collaborators).
* Schema view that updates as tables/relations are created.
* Clear state: queued/running/succeeded/failed, with retry instructions.

**Should**

* “Replay build” from stored events.
* “Copy outputs” (dashboard link, preview link, environment id).

---

### Flow 3 — Preview App (`/preview/[sessionId]`)

**Must**

* Auth: sign up/sign in.
* CRUD: create + list records in one generated domain table.
* RLS demo: signed-out should fail/return empty in a visible way.
* Analytics demo: run a query via Iceberg/S3 wrapper path and display results.

**Should**

* “Policies tab”: human-readable policy summaries.
* “Handoff tab”: environment details and export spec.json.

---

## 8) Product Requirements

### 8.1 Functional Requirements

#### FR1 — Session + Plan

* System **must** create `build_session` record for each vibe submission.
* System **must** generate a build plan from template + vibe text.
* System **must** persist plan and show it in UI before execution (or immediately after start).

#### FR2 — Provisioning (Branch/Project)

* System **must** provision an isolated environment:

  * v1 option A: Supabase **Branch** (recommended for speed)
  * v1 option B: new Supabase **Project** (strong flex, may be slower)
* System **must** store environment identifiers in session outputs.

#### FR3 — Schema + RLS

* System **must** apply schema migrations that create:

  * at least 1 domain table (e.g., `listings`, `orders`, `bids`)
  * an audit/events table (e.g., `architect_audit`)
* System **must** enable RLS for domain tables.
* System **must** create at least one policy that restricts rows to authenticated user.

#### FR4 — Edge Functions

* System **must** deploy at least one Edge Function used by the product:

  * recommended: `drift_check` (reads schema/policies, compares against invariants/spec)
  * optional: `spec_gate` (blocks contradictory changes in demo workflow)

#### FR5 — Realtime Build Streaming

* System **must** publish build events to `build:{sessionId}` channel.
* System **must** publish Presence state for:

  * `architect` (AI builder)
  * `user` and any collaborators
* UI **must** subscribe and render updates without refresh.

#### FR6 — Spec Memory (pgvector + HNSW)

* System **must** chunk vibe text into spec chunks and embed them.
* System **must** store embeddings and support similarity search.
* System **should** link drift alerts to most relevant spec chunk(s).

#### FR7 — Iceberg/S3 Wrapper Demo

* System **must** demonstrate at least one analytics query that reads from an Iceberg-backed table (or wrapper-mapped source).
* System **should** label results with provenance (“Iceberg wrapper source”).

#### FR8 — Spec Drift Sentinel

* System **must** detect drift for at least one demo scenario:

  * RLS disabled on a domain table
  * policy removed/modified
  * critical table missing
* System **must** broadcast a realtime alert and persist it.

#### FR9 — Auditability

* System **must** store build events (and drift alerts) for replay.
* System **should** store tool calls and results in redacted form.

---

### 8.2 Non-Functional Requirements

* **Security:** no service role keys or privileged secrets may reach the browser.
* **Performance:** build progress must stream (user sees activity) even if provisioning is slow.
* **Reliability:** orchestration must gracefully handle partial failures and mark session failed with actionable error.
* **Observability:** each session has logs, last event timestamp, and environment refs.

---

## 9) Scope: v1 Templates

To ship fast, v1 supports **two templates** with predictable outputs:

### Template A — Marketplace (recommended demo)

* Tables: `profiles`, `listings`, `bids`, `orders`, `architect_audit`
* RLS: listings owner-only edits; bids user-owned; orders user-owned
* Storage: `listing-images` bucket policy skeleton (optional demo)
* Analytics: `orders` replicated or queried via wrapper for CFO-like reporting

### Template B — SaaS Multi-tenant (optional)

* Tables: `tenants`, `memberships`, `projects`, `architect_audit`
* RLS: tenant isolation by membership

---

## 10) Data Model (Control Plane)

(These tables live in your “control plane” Supabase project that runs the orchestrator and stores session state.)

### `build_sessions`

* `id` uuid (pk)
* `created_at` timestamptz
* `status` enum: `queued|running|succeeded|failed|canceled`
* `template` text
* `vibe_text` text
* `plan` jsonb
* `environment` jsonb (project/branch refs, dashboard urls)
* `outputs` jsonb (preview url, safe connection hints)
* `error` text nullable

### `build_events`

* `id` uuid pk
* `session_id` fk
* `ts` timestamptz
* `type` text
* `message` text
* `payload` jsonb

### `spec_chunks`

* `id` uuid pk
* `session_id` fk
* `chunk_index` int
* `content` text
* `embedding` vector
* `metadata` jsonb

### `drift_alerts`

* `id` uuid pk
* `session_id` fk
* `ts` timestamptz
* `severity` low|medium|high
* `type` text
* `resource` text
* `spec_chunk_id` fk nullable
* `recommendation` text

---

## 11) Realtime Contract (Frontend ↔ Orchestrator)

**Channel name:** `build:{sessionId}`

### Presence payload (architect)

```json
{
  "actor": "architect",
  "step": "policy_created",
  "focus": { "type": "table", "name": "bids" },
  "progress": 0.64
}
```

### Build event payload

```json
{
  "type": "table_created",
  "message": "Created table bids",
  "payload": { "columns": ["id","auction_id","amount","user_id"] },
  "ts": "2026-02-16T12:34:56Z"
}
```

### Drift alert event payload

```json
{
  "type": "drift_detected",
  "payload": {
    "severity": "high",
    "resource": "public.orders",
    "drift": "rls_disabled",
    "recommendation": "Re-enable RLS and restore policy orders_owner_only",
    "spec_chunk_id": "..."
  }
}
```

---

## 12) Epics, User Stories, Acceptance Criteria

### EPIC 1 — Vibe Intake & Session Management

**Outcome:** user can create a session and see a build plan.

**US1.1 Create session**

* As a user, I submit a vibe and get a shareable Build Room link.
* **AC**

  * Creates `build_sessions` row.
  * Redirects to `/build/[id]`.

**US1.2 Plan generation**

* As a user, I see what will be built before it runs.
* **AC**

  * Plan lists tables, RLS policies, functions, analytics steps.
  * Plan persists to session record.

---

### EPIC 2 — Provisioning & Build Orchestration (LangGraph + MCP)

**Outcome:** environment exists and is configured.

**US2.1 Provision environment**

* As a user, I get an isolated Supabase env for my vibe.
* **AC**

  * Creates branch/project and stores refs in session.
  * Emits `environment_created`.

**US2.2 Apply migrations**

* As a user, I see tables appear.
* **AC**

  * Creates >= 2 tables including 1 domain table.
  * Emits `table_created` per table.

**US2.3 Enable RLS + policies**

* As a user, my data is protected by default.
* **AC**

  * RLS enabled on domain table(s).
  * At least 1 user-owned policy exists.
  * Emits `rls_enabled`, `policy_created`.

**US2.4 Deploy Edge Function**

* As a user, server logic is live.
* **AC**

  * Deploys at least one Edge Function.
  * Emits `edge_function_deployed`.

---

### EPIC 3 — Build Room Realtime UX

**Outcome:** judges can “watch the AI build”.

**US3.1 Live timeline**

* As a user, I see build progress live.
* **AC**

  * Subscribes to channel and renders events.
  * Reconnect resumes from stored history.

**US3.2 Ghost cursor presence**

* As a user, I see what the AI is working on.
* **AC**

  * Presence shows current step + focus + progress.

**US3.3 Schema view**

* As a user, I see schema evolve.
* **AC**

  * Nodes/edges render from event payload.
  * Newly created tables animate in.

---

### EPIC 4 — Preview App Proof (Auth + CRUD + RLS)

**Outcome:** “it works” + “it’s secure”.

**US4.1 Auth**

* As a user, I can sign up / sign in.
* **AC**

  * Shows current user identity.

**US4.2 CRUD**

* As a user, I can create and list a domain record.
* **AC**

  * Create/list works when signed in.

**US4.3 RLS demo**

* As a judge, I see RLS block unauth access.
* **AC**

  * Signed out: read fails or returns empty (per policy).
  * UI displays “RLS Protected” indicator.

---

### EPIC 5 — Open Warehouse Demo

**Outcome:** shows Supabase beyond OLTP.

**US5.1 Analytics query**

* As a user, I can run an analytics query.
* **AC**

  * Returns rows from wrapper-backed source.
  * UI labels provenance.

---

### EPIC 6 — Spec Memory & Drift Sentinel

**Outcome:** “spec-driven” enforcement.

**US6.1 Store embeddings**

* As a system, I embed vibe chunks and store them.
* **AC**

  * Chunks stored + embeddings stored.
  * Vector search returns relevant chunk for a prompt.

**US6.2 Drift detection + alert**

* As a user, I’m alerted when drift occurs.
* **AC**

  * Detect one demo drift scenario.
  * Broadcast realtime alert and persist drift record.

**US6.3 Fix recommendation**

* As a user, I see how to fix it.
* **AC**

  * Alert contains recommended SQL/policy action.
  * Links to relevant spec chunk.

---

## 13) Security & Permissions Model (v1)

* Browser uses only safe client keys; **no admin/service role secrets**.
* Privileged operations (provisioning, migrations, policy creation, wrapper config):

  * **must** run server-side (or via MCP tool runner) with secure tokens.
* Preview environment access:

  * use normal Supabase auth + RLS.
* Drift checks:

  * can run from Edge Function with minimal privileges needed to inspect metadata.

---

## 14) Analytics & Telemetry

**Product metrics**

* build success rate
* time to preview ready
* number of events streamed
* number of collaborators in session
* drift alerts triggered + time-to-detect

**Technical metrics**

* orchestration step durations
* error types (provisioning, migration, RLS, wrapper query)
* reconnect rate / realtime latency

---

## 15) Risks & Mitigations

* **Provisioning latency**: show progress and stream events early; keep schema minimal.
* **Wrapper complexity**: pre-provision dataset and wrapper config for demo; “attach and query” in v1.
* **Invalid SQL**: constrain generation to templates; validate migrations before apply.
* **Secret leakage risk**: strict separation of server-only tokens and browser-safe values.
* **Demo fragility**: include a “demo mode” session with known-good environment.

---

## 16) Rollout Plan (Competition Build Plan)

1. **MVP UX:** Intake → Build Room (stub events) → Preview scaffold
2. **Provisioning:** branch/project creation + migrations
3. **Security:** RLS + policy creation + RLS demo in preview
4. **Realtime wow:** presence + event taxonomy + schema rendering
5. **Iceberg flex:** wrapper query + results UI
6. **Drift sentinel:** drift detection + realtime alert + fix recommendation
7. **Polish:** replay, better errors, judge script, screenshots

---

## 17) Acceptance Test Plan (Demo Script)

1. Paste vibe → create session
2. Watch Build Room:

   * presence shows AI step updates
   * timeline shows table/policy/function creation
3. Open preview:

   * sign up
   * create one record
4. Sign out:

   * RLS blocks unauth access (visible)
5. Run analytics query:

   * returns rows labeled Iceberg/wrapper
6. Trigger drift (simulated change):

   * drift alert appears in Build Room in real time
   * alert includes fix suggestion tied to spec

---

## 18) Build-Ready Checklist

* [ ] Next.js routes: `/`, `/build/[id]`, `/preview/[id]`
* [ ] Realtime contract implemented (presence + events)
* [ ] LangGraph orchestrator emits deterministic event stream
* [ ] Provisioning works (branch/project) and refs stored
* [ ] Migrations + RLS + policies applied
* [ ] Preview proves auth + CRUD + RLS blocking
* [ ] Iceberg wrapper query returns rows
* [ ] Drift sentinel triggers at least one realtime alert
* [ ] No privileged secrets in browser
* [ ] Demo completes under 2 minutes reliably

---

If you want, I can also output a **companion Technical Spec** (API routes, LangGraph nodes, MCP tool mapping, event schemas, and database migration examples) so your team can start “vibe coding” immediately with Claude Code/Trae.
