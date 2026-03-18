import { verifyUser, getSupabaseAdmin } from "../_shared/auth.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Handles retrieval of audit and activity logs.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authResult = await verifyUser(req);
    if ("error" in authResult) {
      return errorResponse(authResult.error, authResult.status);
    }

    const { action, ...payload } = await req.json();

    switch (action) {
      case "fetch":
        return await handleFetch(payload.type, payload.filters);
      default:
        return errorResponse(`Action '${action}' not found`, 404);
    }
  } catch (err: any) {
    console.error("Logs API Error:", err);
    return errorResponse(err, 500);
  }
});

async function handleFetch(type: string, filters: any = {}) {
  if (!type) return errorResponse("Log type is required ('audit' or 'activity')");

  const adminClient = getSupabaseAdmin();
  const table = type === "audit" ? "audit_log" : "order_activity_log";

  let query = adminClient.from(table).select("*");

  if (filters.order_id) {
    query = query.eq(type === "audit" ? "entity_id" : "order_id", filters.order_id);
    if (type === "audit") query = query.eq("entity_type", "orders");
  }

  if (filters.module) {
    query = query.eq(type === "audit" ? "field" : "module", filters.module); // Simplified mapping
  }

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query.order("timestamp", { ascending: false });

  if (error) return errorResponse(error);
  return jsonResponse(data);
}