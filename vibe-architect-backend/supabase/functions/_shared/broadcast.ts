
export async function broadcastEvent(
  sessionId: string,
  event: string,
  payload: Record<string, unknown>
) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing Supabase URL or Service Role Key for broadcast");
    return;
  }

  // Construct the Realtime API URL
  // Typically: https://project.supabase.co/realtime/v1/api/broadcast
  const realtimeUrl = `${supabaseUrl}/realtime/v1/api/broadcast`;

  const message = {
    topic: `build:${sessionId}`,
    event: event,
    payload: payload,
    ref: null,
  };

  try {
    const response = await fetch(realtimeUrl, {
      method: "POST",
      headers: {
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [message],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`Failed to broadcast event: ${response.status} ${text}`);
    }
  } catch (err) {
    console.error("Error broadcasting event:", err);
  }
}
