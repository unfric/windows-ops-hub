import { useEffect } from "react";
import { api } from "@/services/api";

const THEME_CACHE_KEY = "pulse_theme_primary";

function applyTheme(color: string) {
  document.documentElement.style.setProperty('--primary', color);
  document.documentElement.style.setProperty('--ring', color);
}

export default function ThemeSync() {
  useEffect(() => {
    // Apply cached theme instantly (no flash on page load)
    const cached = localStorage.getItem(THEME_CACHE_KEY);
    if (cached) applyTheme(cached);

    // Then refresh from API
    const fetchTheme = async () => {
      try {
        const data = await api.settings.list();
        const settings = data.app_settings || [];
        const theme = settings.find((s: any) => s.key === "theme_primary");

        if (theme?.value) {
          applyTheme(theme.value);
          localStorage.setItem(THEME_CACHE_KEY, theme.value);
        }
      } catch (err) {
        console.error("Failed to sync theme from Pulse API:", err);
      }
    };

    fetchTheme();
  }, []);

  return null;
}
