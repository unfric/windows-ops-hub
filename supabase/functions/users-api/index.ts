import { verifyUser, getSupabaseAdmin } from "../_shared/auth.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Handles user-related operations and metadata.
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
        return await handleInvite(req, payload.data, user.id);
      case "resend-invite":
        return await handleResendInvite(req, payload.id, user.id);
      case "get-module-users":
        return await handleGetModuleUsers(payload.module);
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

async function handleInvite(req: Request, data: any, requestorId: string) {
  if (!data?.email) return errorResponse("Email is required");

  const adminClient = getSupabaseAdmin();

  // Security check
  const { data: roles } = await adminClient.from("user_roles").select("role").eq("user_id", requestorId);
  const isAdmin = roles?.some((r: any) => r.role === "admin" || r.role === "management");
  if (!isAdmin) return errorResponse("Unauthorized", 403);

  // 1. Invite the user via Supabase Auth
  const redirectUrl = `${new URL(req.url).origin}/set-password`;
  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(data.email, {
    redirectTo: redirectUrl,
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
  if (profile && Object.keys(profile).length > 0) {
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

async function handleResendInvite(req: Request, userId: string, requestorId: string) {
  if (!userId) return errorResponse("User ID is required");
  const adminClient = getSupabaseAdmin();

  // Security check: Only admin/management
  const { data: roles } = await adminClient.from("user_roles").select("role").eq("user_id", requestorId);
  const isAdmin = roles?.some((r: any) => r.role === "admin" || r.role === "management");
  if (!isAdmin) return errorResponse("Unauthorized", 403);

  // Get user details
  const { data: profile, error: pErr } = await adminClient.from("profiles").select("email, name").eq("user_id", userId).single();
  if (pErr || !profile) return errorResponse("User profile not found");

  const { data: userRoles } = await adminClient.from("user_roles").select("role").eq("user_id", userId);
  const rolesStr = userRoles?.map((r: any) => r.role).join(", ") || "user";

  // Trigger Supabase Invite
  const redirectUrl = `${new URL(req.url).origin}/set-password`;
  const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(profile.email, {
    redirectTo: redirectUrl,
    data: {
      name: profile.name || "",
      is_admin_invite: true,
      roles: rolesStr
    },
  });

  if (inviteError) return errorResponse(inviteError);
  return jsonResponse({ success: true, message: "Invitation resent" });
}

async function handleGetModuleUsers(moduleName: string) {
  const adminClient = getSupabaseAdmin();
  if (!moduleName) return errorResponse("Module is required");

  // Modern tracking system: Get users who have either the specific module role, 
  // or are high-level admins/management who supervise all modules.
  const searchRoles = [
    moduleName.toLowerCase(), 
    moduleName.charAt(0).toUpperCase() + moduleName.slice(1).toLowerCase(),
    "admin", 
    "management"
  ];

  const { data: rolesData, error: rolesError } = await adminClient
    .from("user_roles")
    .select("user_id, role")
    .in("role", searchRoles);
  
  if (rolesError) {
    console.error("Error fetching roles for module users:", rolesError);
    return errorResponse(rolesError);
  }
  
  const userIds = [...new Set(rolesData?.map((r: any) => r.user_id) || [])];
  if (userIds.length === 0) {
    console.log(`No users found for module: ${moduleName}`);
    return jsonResponse([]);
  }

  // Fetch profiles for these users
  const { data: profiles, error: pError } = await adminClient
    .from("profiles")
    .select("name, email, avatar_url")
    .in("user_id", userIds)
    .eq("active", true)
    .limit(5);

  if (pError) {
    console.error("Error fetching profiles for module users:", pError);
    return errorResponse(pError);
  }

  // Ensure we return name and initials-friendly format
  return jsonResponse(profiles || []);
}
