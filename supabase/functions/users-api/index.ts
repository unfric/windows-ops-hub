import { verifyUser, getSupabaseAdmin } from "../_shared/auth.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Handles user-related operations and metadata.
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
    const { user, supabase } = authResult;

    const { action, ...payload } = await req.json();

    switch (action) {
      case "get-roles":
        return await handleGetRoles(supabase, user.id);
      case "get-profile":
        return await handleGetProfile(supabase, user.id);
      case "list":
        return await handleList(user.id);
      case "update":
        return await handleUpdate(payload.id, payload.data);
      default:
        return errorResponse(`Action '${action}' not found`, 404);
    }
  } catch (err: any) {
    console.error("Users API Error:", err);
    return errorResponse(err, 500);
  }
});

async function handleGetRoles(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (error) return errorResponse(error);
  return jsonResponse(data.map((r: any) => r.role));
}

async function handleGetProfile(supabase: any, userId: string) {
  // Use admin client to get full auth user metadata if needed, 
  // but usually profiles table is enough.
  const adminClient = getSupabaseAdmin();
  const { data: { user }, error } = await adminClient.auth.admin.getUserById(userId);
  
  if (error) return errorResponse(error);
  return jsonResponse(user);
}

async function handleList(requestorId: string) {
  const adminClient = getSupabaseAdmin();
  
  // Verify requester is admin/management (security check)
  const { data: roles } = await adminClient.from("user_roles").select("role").eq("user_id", requestorId);
  const isAdmin = roles?.some((r: any) => r.role === "admin" || r.role === "management");
  if (!isAdmin) return errorResponse("Unauthorized", 403);

  const [pRes, rRes] = await Promise.all([
    adminClient.from("profiles").select("*").order("created_at", { ascending: false }),
    adminClient.from("user_roles").select("*"),
  ]);

  if (pRes.error) return errorResponse(pRes.error);

  return jsonResponse({
    profiles: pRes.data,
    roles: rRes.data
  });
}

async function handleUpdate(userId: string, data: any) {
  if (!userId || !data) return errorResponse("User ID and data are required");

  const adminClient = getSupabaseAdmin();
  const { profile, roles } = data;

  // 1. Update Profile if provided
  if (profile) {
    const { error: pErr } = await adminClient
      .from("profiles")
      .update(profile)
      .eq("user_id", userId);
    if (pErr) return errorResponse(pErr);
  }

  // 2. Update Roles if provided (Sync logic)
  if (roles && Array.isArray(roles)) {
    const { error: dErr } = await adminClient
      .from("user_roles")
      .delete()
      .eq("user_id", userId);
    if (dErr) return errorResponse(dErr);

    if (roles.length > 0) {
      const { error: iErr } = await adminClient
        .from("user_roles")
        .insert(roles.map((role: string) => ({ user_id: userId, role })));
      if (iErr) return errorResponse(iErr);
    }
  }

  return jsonResponse({ success: true });
}
