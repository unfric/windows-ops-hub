import { corsHeaders } from "../_shared/cors.ts";
import { errorResponse } from "../_shared/response.ts";
import { verifyUser, getSupabaseAdmin } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authResult = await verifyUser(req);
    if ("error" in authResult) {
      return errorResponse(authResult.error, authResult.status);
    }
    const { user, supabase } = authResult;
    
    // Check for admin role
    const adminClient = getSupabaseAdmin();
    const { data: roles } = await adminClient.from("user_roles").select("role").eq("user_id", user.id);
    const roleNames = roles?.map((r: any) => r.role) || [];
    if (!roleNames.includes("admin") && !roleNames.includes("management")) {
      return errorResponse("Admin or Management access required", 403);
    }

    const { orderId } = await req.json();
    if (!orderId) {
      return errorResponse("Order ID is required", 400);
    }

    // 1. Fetch current order state for business logic validation
    const { data: order, error: fetchErr } = await adminClient
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!order) return errorResponse("Order not found", 404);

    // 2. Business Logic Validation
    if ((order.survey_done_windows || 0) > 0) {
      return errorResponse("Cannot delete: Order has progressed to Survey module. Survey must be reverted back to 0 first.", 400);
    }
    if ((order.design_released_windows || 0) > 0) {
      return errorResponse("Cannot delete: Order has progressed to Design module. Design must be reverted back to 0 first.", 400);
    }

    // Check for logs in production_logs
    const { count: prodCount } = await adminClient
      .from("production_logs")
      .select("*", { count: 'exact', head: true })
      .eq("order_id", orderId);
    
    if ((prodCount || 0) > 0) {
      return errorResponse("Cannot delete: Order has production logs. Production logs must be deleted first.", 400);
    }

    // Check for logs in payment_logs
    const { count: paymentCount } = await adminClient
      .from("payment_logs")
      .select("*", { count: 'exact', head: true })
      .eq("order_id", orderId);
    
    if ((paymentCount || 0) > 0) {
      return errorResponse("Cannot delete: Order has payment logs. Finance must delete logs first.", 400);
    }

    // 3. Atomically delete all child records
    const tables = [
      "order_activity_log",
      "dispatch",
      "dispatch_logs",
      "installation",
      "installation_logs",
      "material_status",
      "production_status",
      "payment_logs",
      "production_logs",
      "rework_logs",
      "notifications"
    ];

    for (const table of tables) {
      const { error: childErr } = await adminClient.from(table).delete().eq("order_id", orderId);
      if (childErr && childErr.code !== "PGRST116") {
        console.warn(`Attempted delete from ${table} for order ${orderId}, result:`, childErr.message);
      }
    }

    // Polymorphic audit log cleanup
    await adminClient.from("audit_log").delete().eq("entity_id", orderId).eq("entity_type", "orders");

    // 4. Finally delete the order itself
    const { error: deleteErr } = await adminClient.from("orders").delete().eq("id", orderId);
    if (deleteErr) throw deleteErr;

    return new Response(JSON.stringify({ success: true, message: "Order deleted successfully" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
});
