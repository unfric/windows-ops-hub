import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

serve(async (req) => {
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const results: string[] = [];

    for (const rule of rules) {
      // Get users with this role
      const { data: roleUsers } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", rule.role);

      if (!roleUsers || roleUsers.length === 0) {
        results.push(`No users with role ${rule.role}`);
        continue;
      }

      // Get emails from profiles
      const userIds = roleUsers.map((r: any) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("email, name")
        .in("user_id", userIds);

      if (!profiles || profiles.length === 0) {
        results.push(`No profiles found for role ${rule.role}`);
        continue;
      }

      const emailBody = rule.bodyFn(payload);

      // Log the alert (in production, integrate with an email service)
      // For now, we create in-app notifications and log the intent
      const notifications = userIds.map((uid: string) => ({
        user_id: uid,
        title: `📧 ${rule.subject}`,
        message: emailBody,
        type: "warning",
        entity_type: "orders",
        entity_id: payload.order_id,
      }));

      await supabase.from("notifications").insert(notifications);

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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
