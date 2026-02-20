# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Data Lake to SQL — an AI-powered platform that converts raw file uploads (CSV, JSON, XML, Text) into a normalized PostgreSQL database. Users upload files, a LangGraph agent analyzes them via LLM, infers a relational schema, generates SQL, and executes it against Supabase PostgreSQL. The frontend visualizes the process in real-time.

## Monorepo Structure

- **`frontend/`** — Next.js 14 (App Router) on port 3000. UI for file uploads, build visualization (2D via React Flow, 3D via React Three Fiber), and event timeline.
- **`agent/`** — Node.js/TypeScript Express server on port 3001. LangGraph state machine that orchestrates the ETL pipeline (parse → infer → generate SQL → validate → execute).
- **`backend/`** — Supabase configuration. SQL migrations in `backend/supabase/migrations/`. Provides PostgreSQL, Storage ("uploads" bucket), Realtime, and Auth.
- **`sample-data/`** — Test data files for development.

## Common Commands

### Frontend (`frontend/`)
```bash
npm run dev          # Start dev server (port 3000)
npm run build        # Production build
npm run lint         # Run ESLint
npx playwright test  # Run Playwright e2e tests
npx playwright test tests/foo.spec.ts  # Run a single test file
```

### Agent (`agent/`)
```bash
npm run dev          # Start with tsx watch (port 3001)
npm run build        # Compile TypeScript (tsc → dist/)
npm run start        # Run compiled output
```

### Backend (`backend/`)
```bash
npx supabase start   # Start local Supabase (API:54321, DB:54322, Studio:54323)
npx supabase db push # Apply migrations
npx supabase stop    # Stop local Supabase
```

## Architecture

### Agent Pipeline (LangGraph)

The agent (`agent/src/graph/`) is a 7-node LangGraph state machine:

```
parse_files → infer_entities → generate_sql → validate_schema
                                                    ↓
                                  (errors?) → correct_schema (max 3 retries)
                                                    ↓
                                            generate_inserts → execute_sql → END
```

- **State definition**: `graph/state.ts` — LangGraph Annotation-based with reducer functions, cost accumulation, iteration counter
- **Graph wiring**: `graph/graph.ts` — StateGraph construction with conditional edges
- **Node implementations**: `graph/nodes.ts` — All 7 nodes (~458 lines)
- **LLM integration**: `llm/client.ts` + `llm/prompts.ts` — Uses Anthropic Claude via OpenRouter
- **Parsers**: `parsers/` — Format-specific parsers (csv, json, xml, text) with auto-detection

### Agent REST API (`agent/src/index.ts`)

- `POST /sessions` — Create a build session with fileKeys
- `GET /sessions?id={id}` or `?share_token={token}` — Fetch session
- `GET /events?session_id={id}` — Fetch event log
- `POST /run` — Trigger agent pipeline asynchronously

### Frontend Key Pages

- `app/page.tsx` — Home/upload page
- `app/build/[sessionId]/page.tsx` — Real-time build visualization

### Database Schema (Supabase PostgreSQL)

Core control-plane tables defined in `backend/supabase/migrations/`:

- **`build_sessions`** — Tracks jobs (status: queued/running/succeeded/failed/canceled), stores file_keys array, template, vibe_text, options
- **`build_events`** — Append-only event log (types: parsing_started, file_parsed, entities_inferred, table_created, data_inserted, etc.)
- **`exec_sql(query)`** — Security-definer RPC function, callable only by service_role. This is how the agent executes generated DDL/DML.

### Security Model

- Frontend uses the **anon key** (safe for client)
- Agent uses the **service_role key** (admin access, required for `exec_sql`)
- RLS blocks direct public access to control-plane tables; all access goes through security-definer RPC functions
- Share tokens enable unauthenticated session viewing

## Environment Variables

**Frontend** (`frontend/.env.local`):
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_BACKEND_BASE_URL` (default: `http://localhost:3001`)

**Agent** (`agent/.env`):
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENROUTER_API_KEY`, `PORT` (default: 3001)

## Key Patterns

- **Event-driven frontend**: Build page subscribes to Supabase Realtime channels for live updates; schema graphs are derived from build_events payloads
- **Self-correcting agent**: validate_schema → correct_schema loop runs up to 3 times before giving up
- **JSON/SQL extraction**: Agent includes robust extraction of JSON and SQL from LLM responses (handles fenced code blocks and delimiters)
- **Fallback parsing**: Agent falls back to local `sample-data/` if Supabase Storage download fails
- **Agent is ESM**: `agent/` uses `"type": "module"` — all imports need `.js` extensions in compiled output
- **UI components**: Frontend uses Shadcn UI (Radix + Tailwind) — components live in `frontend/components/ui/`
