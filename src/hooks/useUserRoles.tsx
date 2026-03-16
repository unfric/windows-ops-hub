import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/services/api";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export function useUserRoles() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setRoles([]); setLoading(false); return; }

    api.users.getRoles()
      .then((roles) => {
        setRoles(roles);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch roles:", err);
        setRoles([]);
        setLoading(false);
      });
  }, [user]);

  const hasRole = (role: AppRole) => roles.includes(role);

  return { roles, loading, hasRole };
}
