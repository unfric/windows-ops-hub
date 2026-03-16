import { api } from "@/services/api";

/** Call the send-alert edge function for email alerts */
export async function sendEmailAlert(orderId: string, orderName: string, field: string, newValue: string) {
  try {
    // This calls the specific email alert function
    await api.notifications.triggerAlert({ orderId, orderName, field, newValue });
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
 * Send an in-app notification to all users with a specific role via Edge Function.
 */
export async function notifyRole(params: NotifyRoleParams) {
  try {
    await api.notifications.notifyRole(params);
  } catch (err) {
    console.error("Failed to notify role:", err);
  }
}

export async function triggerStatusNotification(
  orderId: string,
  orderName: string,
  field: string,
  newValue: string
) {
  try {
    // Both in-app and email-triggering logic is now consolidated in the edge function
    await api.notifications.triggerAlert({ orderId, orderName, field, newValue });
  } catch (err) {
    console.error("Failed to trigger status notification:", err);
  }
}
