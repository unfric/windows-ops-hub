import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function ThemeSync() {
  useEffect(() => {
    const fetchTheme = async () => {
      try {
        const { data } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", "theme_primary")
          .maybeSingle();

        if (data?.value) {
          const color = data.value;
          document.documentElement.style.setProperty('--primary', color);
          document.documentElement.style.setProperty('--ring', color);
        }
      } catch (err) {
        console.error("Failed to sync theme from Supabase:", err);
      }
    };

    fetchTheme();
  }, []);

  return null;
}
