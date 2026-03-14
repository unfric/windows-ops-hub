import { corsHeaders } from "../_shared/cors.ts";
import { errorResponse } from "../_shared/response.ts";
import { getSupabaseAdmin } from "../_shared/auth.ts";
import { verifyUser } from "../_shared/auth.ts";

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

    const { email, name, roles, action } = await req.json();

    // Handle resend invite
    if (action === "resend_invite") {
      if (!email) return errorResponse("Email is required", 400);

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      await adminClient.auth.admin.generateLink({
        type: "recovery",
        email,
        options: {
          redirectTo: `${req.headers.get("origin") || supabaseUrl}/login`,
        },
      });
      return new Response(
        JSON.stringify({ success: true, message: "Invite resent successfully." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!email) return errorResponse("Email is required", 400);

    // Check if user already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u: any) => u.email?.toLowerCase() === email.toLowerCase()
    );

    let userId: string;
    let isNewUser = false;

    if (existingUser) {
      userId = existingUser.id;
      if (name) {
        await adminClient.from("profiles").update({ name }).eq("user_id", userId);
      }
    } else {
      const tempPassword = crypto.randomUUID() + "Aa1!";
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { name: name || "" },
      });

      if (createError) return errorResponse(createError.message, 400);

      userId = newUser.user.id;
      isNewUser = true;

      // Ensure profile exists with invited status
      const { data: profileExists } = await adminClient
        .from("profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (!profileExists) {
        await adminClient.from("profiles").insert({
          user_id: userId,
          name: name || "",
          email,
          status: "invited",
          invited_at: new Date().toISOString(),
        });
      } else {
        await adminClient.from("profiles")
          .update({ status: "invited", invited_at: new Date().toISOString() })
          .eq("user_id", userId);
      }
    }

    // Sync roles
    if (roles && Array.isArray(roles)) {
      await adminClient.from("user_roles").delete().eq("user_id", userId);
      if (roles.length > 0) {
        await adminClient.from("user_roles").insert(
          roles.map((role: string) => ({ user_id: userId, role }))
        );
      }
    }

    // Send password reset email for new users
    if (isNewUser) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      await adminClient.auth.admin.generateLink({
        type: "recovery",
        email,
        options: {
          redirectTo: `${req.headers.get("origin") || supabaseUrl}/login`,
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        isNewUser,
        message: isNewUser
          ? "User invited. They will receive a password reset email."
          : "User roles updated.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
});
