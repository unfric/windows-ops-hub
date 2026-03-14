import { supabase } from "@/integrations/supabase/client";

/** Call the send-alert edge function for email alerts */
export async function sendEmailAlert(orderId: string, orderName: string, field: string, newValue: string, oldValue?: string) {
  try {
    await supabase.functions.invoke("send-alert", {
      body: { order_id: orderId, order_name: orderName, field, new_value: newValue, old_value: oldValue },
    });
  } catch (e) {
    console.error("Email alert failed:", e);
  }
}

interface NotifyRoleParams {
  role: string;
  title: string;
  message: string;
  type?: string;
  entityType?: string;
  entityId?: string;
}

/**
 * Send an in-app notification to all users with a specific role.
 */
export async function notifyRole({ role, title, message, type = "info", entityType, entityId }: NotifyRoleParams) {
  try {
    // We keep notifyRole as is for now as it's often called from other client-side logic,
    // but in a full migration, this should also move to a notification-api edge function.
    // For now, let's keep it but ideally we should move this to the backend.
    
    const { data: roleUsers } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", role as any);

    if (!roleUsers || roleUsers.length === 0) return;

    const notifications = roleUsers.map((r) => ({
      user_id: r.user_id,
      title,
      message,
      type,
      entity_type: entityType || null,
      entity_id: entityId || null,
    }));

    await supabase.from("notifications" as any).insert(notifications);
  } catch (err) {
    console.error("Failed to notify role:", err);
  }
}

/**
 * Trigger notifications based on order status changes.
 */
export async function triggerStatusNotification(
  orderId: string,
  orderName: string,
  field: string,
  newValue: string
) {
  const notifications: { role: string; title: string; message: string; type: string }[] = [];

  // Payment pending → notify finance
  if (field === "finance_status" && newValue === "Pending Approval") {
    notifications.push({
      role: "finance",
      title: "Payment Pending",
      message: `Order "${orderName}" is waiting for payment approval.`,
      type: "warning",
    });
  }

  // Materials missing → notify procurement
  if (field === "design_status" && newValue === "Released") {
    notifications.push({
      role: "procurement",
      title: "Materials Needed",
      message: `Order "${orderName}" design released — materials procurement required.`,
      type: "warning",
    });
  }

  // Ready for dispatch → notify dispatch
  if (field === "dispatch_status" && (newValue === "Not Dispatched" || newValue === "Partially Dispatched")) {
    notifications.push({
      role: "dispatch",
      title: "Ready for Dispatch",
      message: `Order "${orderName}" is ready for dispatch.`,
      type: "info",
    });
  }

  // Order blocked → notify management
  if (field === "commercial_status" && newValue === "Pipeline") {
    notifications.push({
      role: "management",
      title: "Order Blocked",
      message: `Order "${orderName}" moved back to Pipeline.`,
      type: "error",
    });
  }

  for (const n of notifications) {
    await notifyRole({ ...n, entityType: "orders", entityId: orderId });
  }

  // Also trigger email alerts via edge function
  sendEmailAlert(orderId, orderName, field, newValue);
}
