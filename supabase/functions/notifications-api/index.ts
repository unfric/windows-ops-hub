import { verifyUser, getSupabaseAdmin } from "../_shared/auth.ts";
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
      case "notify-role":
        return await handleNotifyRole(req);
      case "trigger-status-alert":
        return await handleTriggerStatusAlert(req);
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

async function handleNotifyRole(req: Request) {
  const { role, title, message, type, entityType, entityId } = await req.json();
  const adminClient = getSupabaseAdmin();

  const { data: roleUsers, error: roleError } = await adminClient
    .from("user_roles")
    .select("user_id")
    .eq("role", role);

  if (roleError) return errorResponse(roleError);
  if (!roleUsers || roleUsers.length === 0) return jsonResponse({ success: true, message: "No users found for role" });

  const notifications = roleUsers.map((r: any) => ({
    user_id: r.user_id,
    title,
    message,
    type: type || "info",
    entity_type: entityType || null,
    entity_id: entityId || null,
  }));

  const { error: insertError } = await adminClient.from("notifications").insert(notifications);
  if (insertError) return errorResponse(insertError);

  return jsonResponse({ success: true });
}

async function handleTriggerStatusAlert(req: Request) {
  const { orderId, orderName, field, newValue } = await req.json();
  const adminClient = getSupabaseAdmin();
  const notifications: { role: string; title: string; message: string; type: string }[] = [];

  // Logic moved from src/lib/notifications.ts
  if (field === "finance_status" && newValue === "Pending Approval") {
    notifications.push({
      role: "finance",
      title: "Payment Pending",
      message: `Order "${orderName}" is waiting for payment approval.`,
      type: "warning",
    });
  }

  if (field === "design_status" && newValue === "Released") {
    notifications.push({
      role: "procurement",
      title: "Materials Needed",
      message: `Order "${orderName}" design released — materials procurement required.`,
      type: "warning",
    });
  }

  if (field === "dispatch_status" && (newValue === "Not Dispatched" || newValue === "Partially Dispatched")) {
    notifications.push({
      role: "dispatch",
      title: "Ready for Dispatch",
      message: `Order "${orderName}" is ready for dispatch.`,
      type: "info",
    });
  }

  if (field === "commercial_status" && newValue === "Pipeline") {
    notifications.push({
      role: "management",
      title: "Order Blocked",
      message: `Order "${orderName}" moved back to Pipeline.`,
      type: "error",
    });
  }

  for (const n of notifications) {
    const { data: roleUsers } = await adminClient
      .from("user_roles")
      .select("user_id")
      .eq("role", n.role);

    if (roleUsers && roleUsers.length > 0) {
      const inserts = roleUsers.map((r: any) => ({
        user_id: r.user_id,
        title: n.title,
        message: n.message,
        type: n.type,
        entity_type: "orders",
        entity_id: orderId,
      }));
      await adminClient.from("notifications").insert(inserts);
    }
  }

  return jsonResponse({ success: true });
}
