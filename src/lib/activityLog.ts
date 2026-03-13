import { supabase } from "@/integrations/supabase/client";

export async function logActivity(params: {
  orderId: string;
  module: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await (supabase.from("order_activity_log" as any) as any).insert({
    order_id: params.orderId,
    module: params.module,
    field_name: params.fieldName,
    old_value: params.oldValue,
    new_value: params.newValue,
    updated_by: user?.id || null,
    timestamp: new Date().toISOString(),
  });

  if (error) {
    console.error("logActivity failed:", error);
  }
}
