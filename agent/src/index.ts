import "dotenv/config";
import express from "express";
import cors from "cors";
import { buildGraph } from "./graph/graph.js";
import { updateSessionStatus, emitEvent } from "./broadcast.js";

const app = express();
app.use(cors());
app.use(express.json());

const agent = buildGraph();

// Health check
app.get("/health", (_req, res) => {
  res.json({ ok: true, agent: "data-lake-to-sql" });
});

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
