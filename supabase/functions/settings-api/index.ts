import { verifyUser, getSupabaseAdmin } from "../_shared/auth.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Handles system-wide settings and configuration lists.
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
    const { user } = authResult;

    const { action, ...payload } = await req.json();

    switch (action) {
      case "list":
        return await handleList();
      case "upsert":
        return await handleUpsert(payload.table, payload.data, user.id);
      case "delete":
        return await handleDelete(payload.table, payload.id, user.id);
      default:
        return errorResponse(`Action '${action}' not found`, 404);
    }
  } catch (err: any) {
    console.error("Settings API Error:", err);
    return errorResponse(err, 500);
  }
});

async function handleList() {
  const adminClient = getSupabaseAdmin();

  // Fetch all config data in parallel
  const [settingsRes, salespersonsRes, commercialRes] = await Promise.all([
    adminClient.from("app_settings").select("*"),
    adminClient.from("salespersons").select("*").order("name"),
    adminClient.from("commercial_statuses").select("*").order("name"),
  ]);

  return jsonResponse({
    settings: settingsRes.data || [],
    salespersons: salespersonsRes.data || [],
    commercial_statuses: commercialRes.data || [],
  });
}

async function handleUpsert(table: string, data: any, userId: string) {
  if (!table || !data) return errorResponse("Table and data are required");

  const adminClient = getSupabaseAdmin();
  
  // Security check: only admin/management can modify settings
  const { data: roles } = await adminClient.from("user_roles").select("role").eq("user_id", userId);
  const isAdmin = roles?.some((r: any) => r.role === "admin" || r.role === "management");
  if (!isAdmin) return errorResponse("Unauthorized", 403);

  const { data: result, error } = await adminClient
    .from(table)
    .upsert({ ...data, updated_at: new Date().toISOString() })
    .select()
    .single();

  if (error) return errorResponse(error);
  return jsonResponse(result);
}

async function handleDelete(table: string, id: string, userId: string) {
  if (!table || !id) return errorResponse("Table and ID are required");

  const adminClient = getSupabaseAdmin();

  // Security check
  const { data: roles } = await adminClient.from("user_roles").select("role").eq("user_id", userId);
  const isAdmin = roles?.some((r: any) => r.role === "admin" || r.role === "management");
  if (!isAdmin) return errorResponse("Unauthorized", 403);

  const { error } = await adminClient
    .from(table)
    .delete()
    .eq("id", id);

  if (error) return errorResponse(error);
  return jsonResponse({ success: true });
}
