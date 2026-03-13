import { supabase } from "@/integrations/supabase/client";

export async function logAuditEntry(params: {
  entityType: string;
  entityId: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("audit_log").insert({
    entity_type: params.entityType,
    entity_id: params.entityId,
    field: params.field,
    old_value: params.oldValue,
    new_value: params.newValue,
    updated_by: user?.id || null,
  } as any);
}
