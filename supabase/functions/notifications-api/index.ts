import { verifyUser } from "../_shared/auth.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Handles user notifications.
 */
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authResult = await verifyUser(req);
    if ("error" in authResult) {
      return errorResponse(authResult.error, authResult.status);
    }
    const { supabase, user } = authResult;

    const { action, id } = await req.json();

    switch (action) {
      case "list":
        return await handleList(supabase, user.id);
      case "mark-read":
        return await handleMarkRead(supabase, id, user.id);
      case "mark-all-read":
        return await handleMarkAllRead(supabase, user.id);
      default:
        return errorResponse(`Action '${action}' not found`, 404);
    }
  } catch (err: any) {
    console.error("Notifications API Error:", err);
    return errorResponse(err, 500);
  }
});

async function handleList(supabase: any, userId: string) {
  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);
  
  if (error) return errorResponse(error);
  return jsonResponse({ notifications });
}

async function handleMarkRead(supabase: any, id: string, userId: string) {
  if (!id) return errorResponse("Notification ID is required");

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", id)
    .eq("user_id", userId);
  
  if (error) return errorResponse(error);
  return jsonResponse({ success: true });
}

async function handleMarkAllRead(supabase: any, userId: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);
  
  if (error) return errorResponse(error);
  return jsonResponse({ success: true });
}
