# Data Lake Agent 🧠

The intelligent core of the Data Lake to SQL platform. This Node.js application uses **LangGraph** and **LangChain** to autonomously transform raw files into structured SQL databases.

## 🌟 How It Works

The agent operates as a state machine with the following nodes:

1.  **`parse_files`**:
    -   Downloads raw files (`CSV`, `JSON`, `XML`, `TXT`) from Supabase Storage.
    -   Parses them into a standardized internal format.
2.  **`infer_entities`**:
    -   Uses an LLM (via OpenRouter) to analyze the data structure.
    -   Identifies entities (tables), attributes (columns), and relationships (foreign keys).
3.  **`generate_sql`**:
    -   Constructs idempotent PostgreSQL `CREATE TABLE` statements.
    -   Generates `INSERT` statements with conflict handling (`ON CONFLICT DO NOTHING`).
4.  **`execute_sql`**:
    -   Connects to Supabase via the `exec_sql` RPC function.
    -   Executes the generated DDL and DML.
    -   Implements rate limiting and retries to handle large datasets.
5.  **`validate_schema`**:
    -   Verifies that the database state matches the intended schema.
    -   Detects data drift or integrity issues.

## 🛠️ Tech Stack

-   **Runtime**: Node.js (TypeScript)
-   **Orchestration**: LangGraph (State Management)
-   **AI/LLM**: LangChain + OpenRouter (DeepSeek R1, GPT-OSS-120B, Llama 3)
-   **API**: Express.js (REST endpoints)
-   **Database**: Supabase (via `supabase-js`)

## 🚀 API Endpoints

The agent exposes a local REST API to interact with the frontend:

-   `POST /run`: Triggers the agent pipeline for a specific session.
-   `POST /sessions`: Creates a new build session.
-   `GET /sessions`: Retrieves session details.
-   `GET /events`: Retrieves the event log for a session.

## ⚙️ Configuration

Create a `.env` file in this directory:

```env
# Server Port
PORT=3001

# Supabase Configuration (Service Role is required for Admin tasks)
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# LLM Provider
OPENROUTER_API_KEY=your_openrouter_api_key
```

## 🏃‍♂️ Development

```bash
# Install dependencies
npm install

# Run in development mode (with hot-reload)
npm run dev
```
