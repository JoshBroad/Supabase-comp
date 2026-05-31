import { handleCors, corsHeaders } from "../_shared/cors.ts";
import { getSupabaseAdminClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    if (req.method !== "GET") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });

    const url = new URL(req.url);
    const sessionId = url.searchParams.get("session_id");
    if (!sessionId) return Response.json({ error: "session_id required" }, { status: 400, headers: corsHeaders });

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.rpc("session_events", { p_session_id: sessionId });
    if (error) return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });

    return Response.json(data ?? [], { headers: corsHeaders });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return Response.json({ error: message }, { status: 500, headers: corsHeaders });
  }
});
