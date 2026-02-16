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
