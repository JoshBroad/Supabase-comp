import { randomUUID } from "crypto";
import { getSupabaseAdmin } from "./supabase.js";

interface BuildEvent {
  id: string;
  session_id: string;
  ts: string;
  type: string;
  message: string;
  payload: Record<string, unknown>;
}

/**
 * Insert an event into build_events and broadcast it via Supabase Realtime.
 * Matches the pattern from the existing orchestrate Edge Function.
 */
export async function emitEvent(
  sessionId: string,
  type: string,
  message: string,
  payload: Record<string, unknown> = {}
): Promise<BuildEvent> {
  const supabase = getSupabaseAdmin();

  // Insert into build_events table
  const { data, error } = await supabase
    .from("build_events")
    .insert({
      session_id: sessionId,
      type,
      message,
      payload,
    })
    .select()
    .single();

  if (error) {
    console.error(`Failed to insert event: ${error.message}`);
    // Create a fallback event for broadcasting even if DB insert fails
    const fallbackEvent: BuildEvent = {
      id: randomUUID(),
      session_id: sessionId,
      ts: new Date().toISOString(),
      type,
      message,
      payload,
    };
    await broadcastToRealtime(sessionId, fallbackEvent);
    return fallbackEvent;
  }

  // Broadcast via Realtime
  await broadcastToRealtime(sessionId, data as BuildEvent);
  return data as BuildEvent;
}

/**
 * Broadcast an event payload to the Realtime channel.
 * Uses the same HTTP API as the existing Deno broadcast.ts.
 */
async function broadcastToRealtime(
  sessionId: string,
  event: BuildEvent
): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing Supabase URL or Service Role Key for broadcast");
    return;
  }

  const realtimeUrl = `${supabaseUrl}/realtime/v1/api/broadcast`;

  try {
    const response = await fetch(realtimeUrl, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            topic: `build:${sessionId}`,
            event: "build_event",
            payload: event,
          },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`Broadcast failed: ${response.status} ${text}`);
    }
  } catch (err) {
    console.error("Error broadcasting event:", err);
  }
}

/**
 * Update the session status in the database.
 */
export async function updateSessionStatus(
  sessionId: string,
  status: string,
  extra: Record<string, unknown> = {}
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("build_sessions")
    .update({ status, ...extra })
    .eq("id", sessionId);

  if (error) {
    console.error(`Failed to update session status: ${error.message}`);
  }
}
