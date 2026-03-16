
import { useEffect, useState } from "react";
import { api } from "@/services/api";

export interface SettingsItem {
  id: string;
  name: string;
  active: boolean;
}

export interface SettingsData {
  project_names: SettingsItem[];
  dealers: SettingsItem[];
  project_client_names: SettingsItem[];
  colour_shades: SettingsItem[];
  salespersons: SettingsItem[];
  other_product_types: SettingsItem[];
  commercial_statuses: SettingsItem[];
  app_settings: { key: string; value: string }[];
}

/**
 * Hook to fetch and provide shared settings options for forms and filters.
 */
export function useSettingsOptions(enabled: boolean = true) {
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    async function fetchSettings() {
      setLoading(true);
      try {
        const settings = await api.settings.list();
        setData(settings);
      } catch (err: any) {
        setError(err.message || "Failed to fetch settings");
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, [enabled]);

  const ownerOptions = [
    ...(data?.dealers || []).map((d) => ({ label: `${d.name} (Dealer)`, value: d.name })),
    ...(data?.project_client_names || []).map((c) => ({ label: `${c.name} (Client)`, value: c.name })),
  ];

  const getAppSetting = (key: string) => data?.app_settings.find((s) => s.key === key)?.value;

  const reworkCategories = getAppSetting("rework_categories")?.split(",").map((s) => s.trim()) || [];
  const reworkTeams = getAppSetting("rework_responsible_teams")?.split(",").map((s) => s.trim()) || [];

  return {
    settings: data,
    ownerOptions,
    reworkCategories,
    reworkTeams,
    getAppSetting,
    loading,
    error,
  };
}
