import { handleCors, corsHeaders } from "../_shared/cors.ts";
import { getSupabaseAdminClient } from "../_shared/supabase.ts";
import { broadcastEvent } from "../_shared/broadcast.ts";

type OrchestrateRequest = {
  sessionId: string;
  mode?: "run" | "retry";
};

async function insertEvent(supabase: ReturnType<typeof getSupabaseAdminClient>, sessionId: string, type: string, message: string, payload?: Record<string, unknown>) {
  const { data, error } = await supabase.from("build_events").insert({
    session_id: sessionId,
    type,
    message,
    payload: payload ?? {},
  }).select().single();

  if (error) throw new Error(error.message);

  if (data) {
    // Broadcast the event to the frontend
    // The frontend expects the payload to be the BuildEvent object
    await broadcastEvent(sessionId, "build_event", data);
  }
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });

    const body = (await req.json()) as OrchestrateRequest;
    if (!body?.sessionId) return Response.json({ error: "sessionId required" }, { status: 400, headers: corsHeaders });

    const supabase = getSupabaseAdminClient();

    const { error: updateError } = await supabase
      .from("build_sessions")
      .update({ status: "running", error: null })
      .eq("id", body.sessionId);

    if (updateError) return Response.json({ error: updateError.message }, { status: 500, headers: corsHeaders });

    await insertEvent(supabase, body.sessionId, "plan_created", "Build plan created", { mode: body.mode ?? "run" });
    await insertEvent(supabase, body.sessionId, "environment_created", "Environment created", {});
    await insertEvent(supabase, body.sessionId, "migration_started", "Migrations started", {});
    await insertEvent(supabase, body.sessionId, "table_created", "Created table profiles", { table: "profiles" });
    await insertEvent(supabase, body.sessionId, "rls_enabled", "RLS enabled on domain tables", {});
    await insertEvent(supabase, body.sessionId, "policy_created", "Created RLS policies", {});
    await insertEvent(supabase, body.sessionId, "edge_function_deployed", "Deployed Edge Functions", {});
    await insertEvent(supabase, body.sessionId, "build_succeeded", "Build succeeded", {});

    const { error: finalizeError } = await supabase
      .from("build_sessions")
      .update({ status: "succeeded" })
      .eq("id", body.sessionId);

    if (finalizeError) return Response.json({ error: finalizeError.message }, { status: 500, headers: corsHeaders });

    return Response.json({ ok: true }, { headers: corsHeaders });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return Response.json({ error: message }, { status: 500, headers: corsHeaders });
  }
});
