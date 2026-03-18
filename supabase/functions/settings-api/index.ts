import { verifyUser, getSupabaseAdmin } from "../_shared/auth.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Handles system-wide settings and configuration lists.
 */
// @ts-ignore
Deno.serve(async (req: Request) => {
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
  const [
    settingsRes,
    salespersonsRes,
    commercialRes,
    dealersRes,
    projectNamesRes,
    projectClientNamesRes,
    productTypesRes,
    colourShadesRes,
    unitsRes,
    vendorsRes,
    tatConfigRes
  ] = await Promise.all([
    adminClient.from("app_settings").select("*"),
    adminClient.from("salespersons").select("*").order("name"),
    adminClient.from("commercial_statuses").select("*").order("name"),
    adminClient.from("dealers").select("*").order("name"),
    adminClient.from("project_names").select("*").order("name"),
    adminClient.from("project_client_names").select("*").order("name"),
    adminClient.from("other_product_types").select("*").order("name"),
    adminClient.from("colour_shades").select("*").order("name"),
    adminClient.from("production_units").select("*").order("name"),
    adminClient.from("coating_vendors").select("*").order("name"),
    adminClient.from("tat_config").select("*"),
  ]);

  return jsonResponse({
    app_settings: settingsRes.data || [],
    salespersons: salespersonsRes.data || [],
    commercial_statuses: commercialRes.data || [],
    dealers: dealersRes.data || [],
    project_names: projectNamesRes.data || [],
    project_client_names: projectClientNamesRes.data || [],
    other_product_types: productTypesRes.data || [],
    colour_shades: colourShadesRes.data || [],
    production_units: unitsRes.data || [],
    coating_vendors: vendorsRes.data || [],
    tat_config: tatConfigRes.data || [],
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
    .upsert(data)
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
