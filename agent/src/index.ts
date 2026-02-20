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

// Trigger agent run
app.post("/run", async (req, res) => {
  const { sessionId, fileKeys } = req.body;

  if (!sessionId || !fileKeys || !Array.isArray(fileKeys)) {
    res.status(400).json({ error: "sessionId and fileKeys[] required" });
    return;
  }

  // Return immediately — agent runs async
  res.json({ ok: true, sessionId });

  // Run the agent asynchronously
  (async () => {
    try {
      await updateSessionStatus(sessionId, "running");

      await agent.invoke({
        sessionId,
        fileKeys,
        parsedFiles: [],
        entities: [],
        sqlSchema: "",
        sqlInserts: "",
        validationIssues: [],
        iterationCount: 0,
        maxIterations: 3,
        status: "parsing",
        error: null,
      });
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

const PORT = parseInt(process.env.PORT || "3001", 10);
app.listen(PORT, () => {
  console.log(`Data Lake Agent running on http://localhost:${PORT}`);
});
