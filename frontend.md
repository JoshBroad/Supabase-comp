# FRONTEND.md — Vibe-Architect Frontend Repo
**Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS  
**Purpose:** The judge-facing UI: Vibe Intake → Build Room (Realtime + Ghost Cursor) → Preview App → (optional) 3D schema/knowledge graph visualization.

---

## 1) Goals (v1)
- Provide a **3-screen** flow:
  1) Vibe Intake: create build session
  2) Build Room: live build timeline + AI presence + schema graph
  3) Preview: auth + CRUD + RLS proof + analytics query demo
- Render the “wow”:
  - **Realtime presence** (“ghost cursor”)
  - **Build events timeline**
  - **Schema graph** evolving as events arrive
- Be repo-separable: frontend can run against mock endpoints first, then connect to backend repo later.

---

## 2) Repo Structure (recommended)
/app
/page.tsx # Vibe Intake
/build/[sessionId]/page.tsx # Build Room
/preview/[sessionId]/page.tsx # Preview App
/api # optional proxy endpoints (only if needed)
/components
/ui # shadcn-like components (optional)
BuildTimeline.tsx
PresenceBar.tsx
SchemaGraph2D.tsx
SchemaGraph3D.tsx
DriftAlerts.tsx
PreviewTabs.tsx
/lib
supabaseClient.ts
types.ts
realtime.ts
api.ts
/styles
globals.css


---

## 3) UX Flows

### 3.1 Vibe Intake (`/`)
**UI elements**
- Textarea: Vibe Spec
- Template picker (Marketplace / SaaS)
- Toggle: Enable analytics (Iceberg/S3)
- Toggle: Enable drift sentinel
- CTA: “Start Build”

**API calls**
- `POST {BACKEND_BASE_URL}/sessions`
  - body: `{ vibeText, template, options }`
  - response: `{ sessionId }`
- Redirect to `/build/{sessionId}`

---

### 3.2 Build Room (`/build/[sessionId]`)
**UI layout**
- Header: session status, progress bar, environment refs (when ready)
- Left: BuildTimeline (event feed)
- Right: SchemaGraph (2D first; 3D optional)
- Top bar: Presence avatars + “Architect is doing X”
- Bottom/right: DriftAlerts panel

**Realtime subscription contract**
- Channel: `build:{sessionId}`
- Presence payload:
  - `{ actor: "architect", step, focus: {type,name}, progress }`
- Events:
  - `plan_created`, `environment_created`, `table_created`, `rls_enabled`,
    `policy_created`, `edge_function_deployed`, `analytics_configured`,
    `build_succeeded`, `build_failed`, `drift_detected`

**Required behavior**
- On load: fetch existing history:
  - `GET {BACKEND_BASE_URL}/sessions/{sessionId}`
  - `GET {BACKEND_BASE_URL}/sessions/{sessionId}/events`
- Then subscribe to realtime updates:
  - Append new events
  - Update schema graph nodes/edges from event payloads
  - Update presence bar from presence state

---

### 3.3 Preview (`/preview/[sessionId]`)
**Goal:** prove it works + prove RLS
- Auth card: sign up / sign in (Supabase client)
- CRUD card: create/list one entity (template-defined)
- RLS demo:
  - “Signed out view” fails/returns empty
  - UI shows “RLS Protected”
- Analytics tab:
  - button: “Run Iceberg Query”
  - show table results + provenance label

**Where preview gets connection info**
- `GET {BACKEND_BASE_URL}/sessions/{sessionId}` includes:
  - `environment`: `{ projectRef, url, anonKey (or a safe ephemeral token strategy), previewConfig }`

> Constraint: the frontend must never receive service-role keys.  
> The backend must provide browser-safe details only.

---

## 4) Tailwind CSS Implementation

### 4.1 Setup
- Tailwind configured via `tailwind.config.ts`
- `globals.css` includes:
  - `@tailwind base; @tailwind components; @tailwind utilities;`
- Use design tokens via CSS variables if desired.

### 4.2 UI Style Guidelines (competition polish)
- Background: neutral/gradient
- Cards: rounded-2xl, shadow-sm, border
- Typography:
  - page titles: `text-2xl font-semibold`
  - body: `text-sm text-muted-foreground`
- Motion:
  - subtle transitions for event insertion and node creation

### 4.3 Component styling patterns
- Use `clsx` or `tailwind-merge` for conditional classes.
- Define shared primitives:
  - `Card`, `Badge`, `Button`, `Tabs`, `Skeleton`
- Recommended class palette:
  - `bg-zinc-950 text-zinc-50` (dark) or `bg-white text-zinc-900` (light)
  - accent: `bg-emerald-500` for success, `bg-amber-500` for warn, `bg-rose-500` for error

---

## 5) Schema Graph Visualization (2D + 3D)

### 5.1 v1 (2D) — Must-have
- Render nodes: tables
- Render edges: relations
- Animate nodes on arrival
- Input: derived from build events:
  - `table_created` includes columns
  - (optional) `fk_created` includes relationships

**Implementation options**
- `reactflow` (fast 2D graph)
- custom SVG layout (minimal nodes, simple lines)

### 5.2 v2 (3D) — Nice-to-have “wow”
- Use Three.js via `@react-three/fiber`
- Render:
  - nodes as spheres with labels
  - edges as lines
  - camera orbit controls
- Use event stream to add nodes progressively

**Component contract**
- `SchemaGraph3D` takes:
  - `nodes: {id, label, type, meta}[]`
  - `edges: {id, source, target, label?}[]`
  - `activeFocus?: {type,name}` from presence payload

---

## 6) Types (shared contracts)
Create `/lib/types.ts`:

### 6.1 BuildSession
- `id`, `status`, `template`, `vibeText`
- `environment`: `{ projectRef?, branchRef?, dashboardUrl?, previewConfig? }`
- `options`: `{ enableAnalytics, enableDriftSentinel }`

### 6.2 BuildEvent
- `id`, `ts`, `type`, `message`, `payload`

### 6.3 DriftAlert
- `id`, `severity`, `resource`, `recommendation`, `specChunkId?`

### 6.4 PresenceState
- `actor`, `step`, `focus`, `progress`

---

## 7) Frontend Acceptance Tests (manual)
- [ ] Create session from `/` and land in `/build/[id]`
- [ ] Timeline renders history then streams new events
- [ ] Presence shows “Architect step” and updates focus
- [ ] Schema graph updates as tables are created
- [ ] “Build succeeded” reveals Preview link
- [ ] Preview: can sign up and create record
- [ ] Sign out: RLS blocks/empties data (visible)
- [ ] Drift alert appears and is readable
- [ ] Analytics query tab shows rows (or clear failure if disabled)

---

## 8) Integration Notes (two-repo merge plan)
- Use `NEXT_PUBLIC_BACKEND_BASE_URL` to point to backend repo.
- Use `NEXT_PUBLIC_REALTIME_URL` if subscribing directly to Supabase Realtime.
- Keep all backend contracts stable:
  - `/sessions`, `/sessions/:id`, `/sessions/:id/events`
  - Realtime channel: `build:{sessionId}`

---

## 9) Open Questions (optional to answer later)
- Whether preview connects directly to provisioned env or through a proxy.
- Whether schema graph is derived purely from events or also from DB introspection.
