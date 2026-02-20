import { getSupabaseAdmin } from "./src/supabase.js";
import "dotenv/config";

// Mock fetch if not available (Node 18+ has it)
const AGENT_URL = "http://localhost:3001";

async function runTest() {
  console.log("--- Testing MySQL Dialect Generation ---");

  // 1. Create a session via Agent API (which calls Supabase RPC)
  console.log("Creating session...");
  const createRes = await fetch(`${AGENT_URL}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileKeys: ["customers.csv"], // Uses local sample data
      options: { targetDialect: "MySQL" }
    }),
  });

  if (!createRes.ok) {
    console.error("Failed to create session:", await createRes.text());
    return;
  }

  const { sessionId } = await createRes.json();
  console.log(`Session created: ${sessionId}`);

  // 2. Trigger the run with options
  console.log("Triggering agent run...");
  const runRes = await fetch(`${AGENT_URL}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId,
      fileKeys: ["customers.csv"],
      options: { targetDialect: "MySQL" }
    }),
  });

  if (!runRes.ok) {
    console.error("Failed to run agent:", await runRes.text());
    return;
  }

  console.log("Agent started. Polling for events...");

  // 3. Poll for completion
  let completed = false;
  let attempts = 0;
  
  while (!completed && attempts < 60) {
    await new Promise(r => setTimeout(r, 2000));
    attempts++;

    const eventsRes = await fetch(`${AGENT_URL}/events?session_id=${sessionId}`);
    const events = await eventsRes.json();
    
    const lastEvent = events[events.length - 1];
    if (lastEvent) {
        process.stdout.write(`\rCurrent Status: ${lastEvent.type} - ${lastEvent.message.substring(0, 50)}...`);
        
        if (lastEvent.type === 'build_succeeded' || lastEvent.type === 'build_failed') {
            console.log("\n\nFinal Event:", JSON.stringify(lastEvent, null, 2));
            completed = true;
        }
        
        // Check for specific dialect messages
        if (lastEvent.message.includes("MySQL")) {
            console.log(`\n\n[SUCCESS] Found MySQL reference in event: "${lastEvent.message}"`);
        }
    }
  }
}

runTest().catch(console.error);
