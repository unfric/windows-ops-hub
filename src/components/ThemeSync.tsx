import { useEffect } from "react";
import { api } from "@/services/api";

export default function ThemeSync() {
  useEffect(() => {
    const fetchTheme = async () => {
      try {
        const data = await api.settings.list();
        const settings = data.app_settings || [];
        const theme = settings.find((s: any) => s.key === "theme_primary");

        if (theme?.value) {
          const color = theme.value;
          document.documentElement.style.setProperty('--primary', color);
          document.documentElement.style.setProperty('--ring', color);
        }
      } catch (err) {
        console.error("Failed to sync theme from Pulse API:", err);
      }
    };

    fetchTheme();
  }, []);

  return null;
}
