import "dotenv/config";
import express from "express";
import cors from "cors";
import { buildGraph } from "./graph/graph.js";
import { updateSessionStatus, emitEvent } from "./broadcast.js";
import { getSupabaseAdmin } from "./supabase.js";

const app = express();

// --- DEBUG LOGGING ---
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

process.on('uncaughtException', (err) => {
  console.error('❌ UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION:', reason);
});
// ---------------------

app.use(cors());
app.use(express.json());

const agent = buildGraph();

// Health check
app.get("/health", (_req, res) => {
  res.json({ ok: true, agent: "data-lake-to-sql" });
});

// --- API Endpoints (Replacing Supabase Edge Functions for Local Dev) ---

// POST /sessions - Create a session
app.post("/sessions", async (req, res) => {
  try {
    const { fileKeys, vibeText, template, options } = req.body;
    const supabase = getSupabaseAdmin();

    // Data lake mode: fileKeys provided
    if (fileKeys && fileKeys.length > 0) {
      const { data, error } = await supabase.rpc("session_create", {
        p_vibe_text: vibeText ?? "",
        p_template: template ?? "data_lake",
        p_options: options ?? {},
        p_file_keys: fileKeys,
      });

      if (error) throw error;
      res.json({ sessionId: data });
      return;
    }

    res.status(400).json({ error: "fileKeys[] required" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error creating session:", message);
    res.status(500).json({ error: message });
  }
});

// GET /sessions - Get session details
app.get("/sessions", async (req, res) => {
  try {
    const sessionId = req.query.id as string;
    const shareToken = req.query.share_token as string;
    const supabase = getSupabaseAdmin();

    if (shareToken) {
      const { data, error } = await supabase.rpc("get_session_by_share_token", { p_share_token: shareToken });
      if (error) throw error;
      if (!data) {
        res.status(404).json({ error: "not found" });
        return;
      }
      res.json(data);
      return;
    }

    if (!sessionId) {
      res.status(400).json({ error: "id required" });
      return;
    }

    const { data, error } = await supabase.rpc("session_get", { p_session_id: sessionId });
    if (error) throw error;
    if (!data) {
      res.status(404).json({ error: "not found" });
      return;
    }
    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error getting session:", message);
    res.status(500).json({ error: message });
  }
});

// GET /events - Get session events
app.get("/events", async (req, res) => {
  try {
    const sessionId = req.query.session_id as string;
    if (!sessionId) {
      res.status(400).json({ error: "session_id required" });
      return;
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("session_events", { p_session_id: sessionId });
    if (error) throw error;

    res.json(data ?? []);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error getting events:", message);
    res.status(500).json({ error: message });
  }
});

// -----------------------------------------------------------------------

// GraphQL proxy — forwards queries to Supabase pg_graphql RPC
app.post("/graphql", async (req, res) => {
  try {
    const { query, variables, operationName } = req.body;
    if (!query) {
      res.status(400).json({ error: "query required" });
      return;
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("graphql", {
      operationName: operationName ?? null,
      query,
      variables: variables ?? {},
      extensions: {},
    });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("GraphQL proxy error:", message);
    res.status(500).json({ errors: [{ message }] });
  }
});

// Trigger agent run
app.post("/run", async (req, res) => {
  const { sessionId, fileKeys, options } = req.body;

  if (!sessionId || !fileKeys || !Array.isArray(fileKeys)) {
    res.status(400).json({ error: "sessionId and fileKeys[] required" });
    return;
  }

  // Return immediately — agent runs async
  res.json({ ok: true, sessionId });

  // Run the agent asynchronously using streaming
  (async () => {
    try {
      await updateSessionStatus(sessionId, "running");

      const stream = await agent.stream(
        {
          sessionId,
          fileKeys,
          targetDialect: options?.targetDialect ?? "postgres",
          parsedFiles: [],
          entities: [],
          sqlSchema: "",
          sqlInserts: "",
          validationIssues: [],
          iterationCount: 0,
          maxIterations: 3,
          status: "parsing",
          error: null,
        },
        {
          streamMode: "updates",
          configurable: { thread_id: sessionId },
        }
      );

      for await (const update of stream) {
        // Each update is keyed by the node name that just completed
        const nodeNames = Object.keys(update);
        for (const nodeName of nodeNames) {
          console.log(`[Stream] Node completed: ${nodeName}`);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(`Agent failed for session ${sessionId}:`, message);
      await updateSessionStatus(sessionId, "failed", { error: message });
      await emitEvent(sessionId, "build_failed", `Agent error: ${message}`, {
        error: message,
      });
    }
  })();
});

// Semantic search over indexed data lake chunks
app.post("/search", async (req, res) => {
  try {
    const { query, sessionId, matchCount } = req.body;
    if (!query) {
      res.status(400).json({ error: "query required" });
      return;
    }

    const { searchDocuments } = await import("./embeddings/index.js");
    const results = await searchDocuments(query, sessionId, matchCount || 5);
    res.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Search error:", message);
    res.status(500).json({ error: message });
  }
});

// Resume a previously interrupted run from its last checkpoint
app.post("/resume", async (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    res.status(400).json({ error: "sessionId required" });
    return;
  }

  res.json({ ok: true, sessionId, resumed: true });

  (async () => {
    try {
      await updateSessionStatus(sessionId, "running");
      await emitEvent(sessionId, "node_started", "Resuming from last checkpoint...");

      const stream = await agent.stream(null, {
        streamMode: "updates",
        configurable: { thread_id: sessionId },
      });

      for await (const update of stream) {
        const nodeNames = Object.keys(update);
        for (const nodeName of nodeNames) {
          console.log(`[Stream/Resume] Node completed: ${nodeName}`);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(`Resume failed for session ${sessionId}:`, message);
      await updateSessionStatus(sessionId, "failed", { error: message });
      await emitEvent(sessionId, "build_failed", `Resume error: ${message}`, {
        error: message,
      });
    }
  })();
});

const PORT = parseInt(process.env.PORT || "3001", 10);
app.listen(PORT, () => {
  console.log(`Data Lake Agent running on http://localhost:${PORT}`);
});
