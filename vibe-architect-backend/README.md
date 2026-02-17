# Data Lake Backend (Supabase)

This directory contains the **Supabase** configuration, migrations, and edge functions for the Data Lake to SQL platform.

## 🗄️ Database Schema

The backend uses a standard PostgreSQL database hosted on Supabase.

### Core Tables

-   `build_sessions`: Tracks each "Data Lake to SQL" job.
    -   `id`: UUID
    -   `status`: `pending`, `parsing`, `inferring`, `generating_sql`, `executing_sql`, `completed`, `failed`
    -   `file_keys`: Array of paths to files in Storage.
-   `build_events`: An append-only log of every action taken by the AI agent.
    -   `type`: `table_created`, `row_inserted`, `drift_detected`, etc.
    -   `payload`: JSON detail (e.g., schema definition, error message).

### RPC Functions

-   **`exec_sql(query text)`**:
    -   A **Security Definer** function that allows the AI Agent (via Service Role) to execute dynamic SQL.
    -   **Critical Security Note**: This function runs with elevated privileges. It should **only** be callable by the Service Role key (the Agent), never by the public/anon key (Frontend).

## 📂 Storage

-   **`uploads` Bucket**:
    -   Stores raw files uploaded by the user.
    -   Accessible by the Agent for parsing.

## ⚡ Edge Functions

*Note: In the current local development setup, the AI Agent runs as a standalone Node.js service (`agent/`) and handles the logic that would typically be in Edge Functions. The definitions here serve as a reference or for future cloud deployment.*

-   `sessions`: (Replaced by local Agent API)
-   `events`: (Replaced by local Agent API)
-   `orchestrate`: (Replaced by LangGraph in Agent)

## 🚀 Deployment

1.  **Link Project**:
    ```bash
    supabase link --project-ref your-project-ref
    ```

2.  **Push Migrations**:
    ```bash
    supabase db push
    ```
    *This applies the schema and RPC functions to your remote database.*

3.  **Set Secrets** (if using Edge Functions):
    ```bash
    supabase secrets set OPENROUTER_API_KEY=...
    ```
