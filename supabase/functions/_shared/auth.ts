import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "./cors.ts";

export const getSupabaseAdmin = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, serviceRoleKey);
};

export const verifyAdminOrManagement = async (req: Request) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { error: "Missing authorization header", status: 401 };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authError } = await callerClient.auth.getUser();

  if (authError || !user) {
    return { error: "Unauthorized", status: 401 };
  }

  const adminClient = getSupabaseAdmin();
  const { data: roles } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const roleNames = roles?.map((r: any) => r.role) || [];
  if (!roleNames.includes("admin") && !roleNames.includes("management")) {
    return { error: "Admin or Management access required", status: 403 };
  }

  return { user, adminClient };
};

export const createErrorResponse = (error: string, status: number) => {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
};
