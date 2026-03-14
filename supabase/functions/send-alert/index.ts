import { corsHeaders } from "../_shared/cors.ts";
import { getSupabaseAdmin, createErrorResponse } from "../_shared/auth.ts";

interface AlertPayload {
  order_id: string;
  order_name: string;
  field: string;
  new_value: string;
  old_value?: string;
}

// Maps status changes to the role that should receive the email alert
const ALERT_RULES: Record<string, { role: string; subject: string; bodyFn: (p: AlertPayload) => string }[]> = {
  finance_status: [
    {
      role: "finance",
      subject: "Payment Pending",
      bodyFn: (p) => `Order "${p.order_name}" requires payment approval. Current status: ${p.new_value}.`,
    },
  ],
  design_status: [
    {
      role: "procurement",
      subject: "Materials Required",
      bodyFn: (p) => `Order "${p.order_name}" design has been released. Please begin material procurement.`,
    },
  ],
  dispatch_status: [
    {
      role: "dispatch",
      subject: "Order Ready for Dispatch",
      bodyFn: (p) => `Order "${p.order_name}" is ready for dispatch. Status: ${p.new_value}.`,
    },
  ],
  installation_status: [
    {
      role: "installation",
      subject: "Installation Required",
      bodyFn: (p) => `Order "${p.order_name}" is awaiting installation. Status: ${p.new_value}.`,
    },
  ],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: AlertPayload = await req.json();
    const { field } = payload;

    const rules = ALERT_RULES[field];
    if (!rules || rules.length === 0) {
      return new Response(JSON.stringify({ message: "No alert rules for this field" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = getSupabaseAdmin();
    const results: string[] = [];

    for (const rule of rules) {
      // Get users with this role
      const { data: roleUsers } = await adminClient
        .from("user_roles")
        .select("user_id")
        .eq("role", rule.role);

      if (!roleUsers || roleUsers.length === 0) {
        results.push(`No users with role ${rule.role}`);
        continue;
      }

      // Get emails from profiles
      const userIds = roleUsers.map((r: any) => r.user_id);
      const { data: profiles } = await adminClient
        .from("profiles")
        .select("email, name")
        .in("user_id", userIds);

      if (!profiles || profiles.length === 0) {
        results.push(`No profiles found for role ${rule.role}`);
        continue;
      }

      const emailBody = rule.bodyFn(payload);

      // Log the alert (in production, integrate with an email service)
      const notifications = userIds.map((uid: string) => ({
        user_id: uid,
        title: `📧 ${rule.subject}`,
        message: emailBody,
        type: "warning",
        entity_type: "orders",
        entity_id: payload.order_id,
      }));

      await adminClient.from("notifications").insert(notifications);

      results.push(
        `Alert sent to ${profiles.length} ${rule.role} user(s): ${profiles.map((p: any) => p.email).join(", ")}`
      );
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-alert:", error);
    return createErrorResponse(error.message, 500);
  }
});
