# Supabase + Supabase MCP + LangGraph — First Research Results (BMAD / Spec-Driven Dev)

> Scope: competition build using “vibe coding” + **LangGraph**, with backend on **Supabase**, optionally connected via **Supabase MCP** from tools like **Trae** or **Claude Code**.

---

## 1) What Supabase is (capabilities you can safely “build a product on”)

### Signal summary
Supabase is a backend platform built around **Postgres**, with integrated **Auth**, **Row Level Security (RLS)**, **Storage**, **Realtime**, and developer tooling. It’s commonly framed as a “Firebase alternative,” but with Postgres semantics.

### Why it matters for a spec-driven build
For a competition app, Supabase gives you:
- **Fast MVP path** (Auth + DB + APIs + Storage quickly)
- **Production-shaped primitives** (Postgres constraints, RLS, migrations)
- A natural home for **agent memory + checkpoints** when using LangGraph (Postgres persistence)

### Practical application pattern
Use Supabase for:
- **Primary relational store** (Postgres)
- **Policy enforcement** (RLS) as your “backend firewall”
- **Auth** for user identity + JWTs
- **Realtime** for “live agent status / workflow progress”
- **Storage** for attachments (docs, images) your agent references

### Evidence grade
Vendor docs + widely used product (**production-proven** platform; your usage pattern maturity depends on how you implement RLS/migrations).

---

## 2) Supabase MCP (Model Context Protocol): what it enables for “vibe coding”

### Signal summary
Supabase provides an **official MCP endpoint** (`https://mcp.supabase.com/mcp`) and an **open MCP server repo** that lets AI tools connect and operate on Supabase projects via MCP.

**Primary sources**
- Supabase docs: https://supabase.com/docs/guides/getting-started/mcp
- Supabase MCP repo: https://github.com/supabase-community/supabase-mcp

### Why it matters for brownfield/spec-driven delivery
MCP becomes a **tool contract** between the assistant and your backend:
- your agent/IDE can **inspect schema**, **query data**, **manage tables**, and in some setups help with **security policy work**
- you can implement spec-driven workflows where the agent proves compliance by executing checks (e.g., “verify RLS exists for tables X/Y/Z”)

### Practical application pattern
Configure Supabase MCP in your coding agent and run it in:
- **project-scoped mode** (`project_ref=...`)
- **read-only by default** (`read_only=true`)

(These are explicitly supported options in the MCP server config.)

### Security / governance note (competition-judge friendly)
Supabase explicitly calls out restricting access and following security best practices when connecting LLM tools.

### Evidence grade
Vendor docs + official OSS repo (**emerging-to-production** depending on how you constrain access).

---

## 3) Tooling fit: Claude Code + Trae as MCP clients (what’s real today)

### Claude Code
Claude Code supports connecting to MCP servers and documents common MCP workflows.

- Claude Code MCP docs: https://code.claude.com/docs/en/mcp

### Trae
Trae publishes MCP documentation and describes MCP integrations.

- Trae MCP docs: https://docs.trae.ai/ide/model-context-protocol?_lang=en

### Practical implication
You can credibly say:
> “We will vibe-code with Claude Code or Trae, using Supabase MCP to keep the code and backend in sync (schema, RLS, sample data, checks).”

### Evidence grade
Vendor docs + vendor blog/docs (**emerging**, but implementable now).

---

## 4) LangGraph + Supabase: the “agentic workflow backbone”

### Signal summary
LangGraph supports **persistence/checkpointing**; Postgres-backed checkpointers exist and Postgres is a natural match for Supabase.

- LangGraph persistence docs: https://docs.langchain.com/oss/python/langgraph/persistence

### Why it matters
Checkpointing makes agent workflows:
- **resumable** (crash/retry)
- **auditable** (what happened, when, with what state)
- **more governable** (you can replay/inspect)

### Practical application pattern
Use Supabase Postgres for:
- LangGraph **checkpoint tables**
- conversation/workflow **audit log**
- “business objects” your workflow manipulates (tickets, tasks, submissions)

### Evidence grade
Framework docs + published packages (**emerging-to-production**; production depends on operational hardening).

---

# Business Case (competition-ready)

## Problem
Teams building products fast (especially with AI coding) often end up with:
- drifting schemas vs app code
- weak access controls
- “demo-ware” with no audit trail
- unreliable multi-step AI workflows (no persistence / recoverability)

## Proposed solution
A **spec-driven build system for Supabase-backed apps** using:
- **LangGraph** for structured agent workflows
- **Supabase** for backend primitives (Auth, Postgres, RLS, Storage, Realtime)
- **Supabase MCP** to let the coding agent operate on Supabase safely (scoped + read-only by default)

## Value
- Faster iteration (“vibe coding”) **without losing control**
- Spec-to-backend alignment (agent can verify schema/RLS/data)
- Auditability: checkpointed workflows + DB-based logs

---

# High-value Use Cases (pick 2–3 for the entry)

## Use Case A — Spec-to-Schema & RLS Generator + Verifier
**What it does**
1) From a feature spec, propose schema changes + migrations  
2) Generate RLS policies  
3) Run MCP queries to verify policies exist and behave as expected

**Why it’s compelling**
Judges love “security + correctness” beyond a UI demo.

**Optional supporting reference**
- Continue workflow example (RLS + Supabase MCP): https://docs.continue.dev/guides/supabase-mcp-database-workflow

**Maturity**
Emerging (very feasible at competition scope)

---

## Use Case B — Agentic Admin Console / Ops Copilot for Supabase-backed apps
**What it does**
- Natural language ops: inspect tables/config/logs, run safe queries, produce summaries
- Constrained by read-only mode unless elevated

**Why it’s compelling**
Shows immediate productivity value to teams shipping on Supabase.

**Maturity**
Emerging-to-production (depends on permission boundaries)

---

## Use Case C — Long-running workflow app (applications, claims, approvals, onboarding)
**What it does**
LangGraph runs a multi-step workflow (collect info → verify → request docs → decision).  
Supabase stores:
- user identity (Auth)
- documents (Storage)
- workflow state (Postgres checkpoints)
- real-time progress (Realtime)

**Why it’s compelling**
Demonstrates structured orchestration + robust backend. Checkpointing story is strong for reliability.

**Maturity**
Production-shaped pattern (if scope is tight)

---

# Actionable Experiments / Backlog Items (BMAD/spec-friendly)

1) **MCP connectivity spike**
   - Connect Claude Code or Trae to Supabase MCP
   - Enforce `project_ref` + `read_only=true` initially  
   Ref: https://supabase.com/docs/guides/getting-started/mcp

2) **Schema introspection tool**
   - Agent lists tables/columns/constraints via MCP
   - Output “schema snapshot” artifact committed with the spec

3) **RLS baseline**
   - Create 2 tables + minimal RLS policies
   - Add “policy verification” LangGraph node that checks RLS presence/coverage

4) **LangGraph persistence**
   - Add Postgres checkpointing (Supabase Postgres)
   - Demo resume-after-failure in a multi-step workflow  
   Ref: https://docs.langchain.com/oss/python/langgraph/persistence

5) **Audit log**
   - Log every tool call + decision into an append-only table
   - Useful for governance + judging

---

# Watchlist (track while building)

- Supabase MCP docs + server repo changes (tools/auth/config)
  - https://supabase.com/docs/guides/getting-started/mcp
  - https://github.com/supabase-community/supabase-mcp

- Claude Code MCP changes (config, allowlists/denylists, restrictions)
  - https://code.claude.com/docs/en/mcp

- Trae MCP marketplace behavior (how it scopes secrets/toggles servers)
  - https://docs.trae.ai/ide/model-context-protocol?_lang=en

- LangGraph Postgres checkpointing API stability
  - https://docs.langchain.com/oss/python/langgraph/persistence

---
