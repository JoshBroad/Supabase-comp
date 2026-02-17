import { handleCors, corsHeaders } from "../_shared/cors.ts";
import { getSupabaseAdminClient } from "../_shared/supabase.ts";

type CreateSessionRequest = {
  vibeText: string;
  template: "marketplace" | "saas" | string;
  options?: Record<string, unknown>;
};

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(req.url);
    const supabase = getSupabaseAdminClient();

    if (req.method === "POST") {
      const body = (await req.json()) as CreateSessionRequest;
      if (!body?.vibeText || body.vibeText.trim().length < 10) {
        return Response.json({ error: "vibeText too short" }, { status: 400, headers: corsHeaders });
      }
      if (!body?.template) {
        return Response.json({ error: "template required" }, { status: 400, headers: corsHeaders });
      }

      const { data, error } = await supabase.rpc("session_create", {
        p_vibe_text: body.vibeText,
        p_template: body.template,
        p_options: body.options ?? {},
      });

      if (error) return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });

      // Trigger orchestration asynchronously
      const orchestratePromise = supabase.functions.invoke("orchestrate", {
        body: { sessionId: data },
      });

      // deno-lint-ignore no-explicit-any
      const edgeRuntime = (globalThis as any).EdgeRuntime;
      if (edgeRuntime) {
        edgeRuntime.waitUntil(orchestratePromise);
      } else {
        orchestratePromise.catch((err) => console.error("Orchestrate trigger failed:", err));
      }

      return Response.json({ sessionId: data }, { headers: corsHeaders });
    }

    if (req.method === "GET") {
      const sessionId = url.searchParams.get("id");
      const shareToken = url.searchParams.get("share_token");

      if (shareToken) {
        const { data, error } = await supabase.rpc("get_session_by_share_token", { p_share_token: shareToken });
        if (error) return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
        if (!data) return Response.json({ error: "not found" }, { status: 404, headers: corsHeaders });
        return Response.json(data, { headers: corsHeaders });
      }

      if (!sessionId) return Response.json({ error: "id required" }, { status: 400, headers: corsHeaders });

      const { data, error } = await supabase.rpc("session_get", { p_session_id: sessionId });
      if (error) return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
      if (!data) return Response.json({ error: "not found" }, { status: 404, headers: corsHeaders });
      return Response.json(data, { headers: corsHeaders });
    }

    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return Response.json({ error: message }, { status: 500, headers: corsHeaders });
  }
});
