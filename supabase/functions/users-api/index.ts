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
      case "invite":
        return await handleInvite(payload.data, user.id);
      case "update":
        return await handleUpdate(payload.id, payload.data);
      case "delete":
        return await handleDelete(payload.id, user.id);
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
  const { data, error } = await supabase
    .from("profiles")
    .select("name, email, status")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return errorResponse(error);
  return jsonResponse(data);
}

async function handleInvite(data: any, requestorId: string) {
  if (!data?.email) return errorResponse("Email is required");

  const adminClient = getSupabaseAdmin();

  // Security check
  const { data: roles } = await adminClient.from("user_roles").select("role").eq("user_id", requestorId);
  const isAdmin = roles?.some((r: any) => r.role === "admin" || r.role === "management");
  if (!isAdmin) return errorResponse("Unauthorized", 403);

  // 1. Invite the user via Supabase Auth
  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(data.email, {
    data: { 
      name: data.name || "",
      is_admin_invite: true,
      roles: data.roles ? data.roles.join(", ") : "user"
    },
  });
  if (inviteError) return errorResponse(inviteError);

  const newUserId = inviteData.user.id;

  // 2. Create a profile row
  const { error: profileError } = await adminClient.from("profiles").upsert({
    user_id: newUserId,
    email: data.email,
    name: data.name || "",
    status: "invited",
    active: true,
    invited_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (profileError) return errorResponse(profileError);

  // 3. Assign initial roles
  if (data.roles && data.roles.length > 0) {
    const { error: rolesError } = await adminClient.from("user_roles").insert(
      data.roles.map((role: string) => ({ user_id: newUserId, role }))
    );
    if (rolesError) return errorResponse(rolesError);
  }

  return jsonResponse({ success: true, user_id: newUserId });
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

async function handleDelete(targetUserId: string, requestorId: string) {
  if (!targetUserId) return errorResponse("User ID is required");
  if (targetUserId === requestorId) return errorResponse("You cannot delete your own account");

  const adminClient = getSupabaseAdmin();

  // Verify requestor is admin
  const { data: roles } = await adminClient.from("user_roles").select("role").eq("user_id", requestorId);
  const isAdmin = roles?.some((r: any) => r.role === "admin");
  if (!isAdmin) return errorResponse("Only Admins can delete users", 403);

  // Deleting from Auth admin automatically cascades to public.profiles and user_roles 
  // due to the ON DELETE CASCADE foreign keys in the database.
  const { error } = await adminClient.auth.admin.deleteUser(targetUserId);
  
  if (error) return errorResponse(error);
  return jsonResponse({ success: true, message: "User deleted successfully" });
}
