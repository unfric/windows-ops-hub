import { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, Palette, Settings, RefreshCw, Users, Database, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfigList } from "@/components/settings/ConfigList";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface AppSetting {
  id: string;
  key: string;
  value: string;
}

const ALL_ROLES = [
  "sales", "finance", "survey", "design", "procurement",
  "stores", "production", "quality", "dispatch", "installation",
  "management", "admin",
];

const THEME_COLORS = [
  { name: "Ocean Blue", value: "213 50% 32%" },
  { name: "Deep Purple", value: "262 83% 58%" },
  { name: "Emerald", value: "142 71% 45%" },
  { name: "Crimson", value: "346 84% 61%" },
  { name: "Midnight", value: "220 40% 15%" },
  { name: "Amber", value: "38 92% 50%" },
];

export default function GeneralSettingsPage() {
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  /**
   * Applies the theme colors to the document root.
   */
  const applyTheme = useCallback((color: string) => {
    if (!color) return;
    document.documentElement.style.setProperty('--primary', color);
    document.documentElement.style.setProperty('--ring', color);
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const data = await api.settings.list();
      const items = (data.app_settings as AppSetting[]) || [];
      setSettings(items);
      
      const vals: Record<string, string> = {};
      items.forEach((s) => { 
        vals[s.key] = s.value; 
        if (s.key === "theme_primary") {
          applyTheme(s.value);
        }
      });
      setEditValues(vals);
    } catch (err) {
      console.error("Error fetching app settings:", err);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, [applyTheme]);

  useEffect(() => { 
    fetchSettings(); 
  }, [fetchSettings]);

  const save = async (key: string, explicitValue?: string) => {
    setSavingKey(key);
    const setting = settings.find((s) => s.key === key);
    const value = explicitValue !== undefined ? explicitValue : editValues[key];
    
    try {
      await api.settings.upsert("app_settings", { 
        id: setting?.id, 
        key, 
        value 
      });
      
      toast.success("Setting saved");
      if (key === "theme_primary") {
        applyTheme(value);
      }
      await fetchSettings();
    } catch (err: any) {
      toast.error(err.message || "Failed to save setting");
    } finally {
      setSavingKey(null);
    }
  };

  const currentTheme = useMemo(() => editValues["theme_primary"] || "213 50% 32%", [editValues]);

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl pb-20 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <Accordion type="multiple" className="space-y-4">
        {/* Appearance & Branding */}
        <AccordionItem value="appearance" className="border rounded-xl bg-card overflow-hidden shadow-sm">
          <AccordionTrigger className="hover:no-underline px-6 py-4 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Palette className="h-4 w-4 text-primary" />
              </div>
              <div className="text-left">
                <span className="text-sm font-bold uppercase tracking-widest text-slate-900 block">Appearance</span>
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">Theme and Branding Control</span>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-4">
            <div className="space-y-6">
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 block">Primary Accent Color</Label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {THEME_COLORS.map((c) => (
                    <button
                      key={c.value}
                      disabled={savingKey === "theme_primary"}
                      onClick={() => {
                        setEditValues({ ...editValues, theme_primary: c.value });
                        save("theme_primary", c.value);
                      }}
                      className={cn(
                        "group relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all",
                        currentTheme === c.value 
                          ? "border-primary bg-primary/5 shadow-inner" 
                          : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      <div
                        className="h-10 w-10 rounded-full shadow-md border-2 border-white"
                        style={{ backgroundColor: `hsl(${c.value})` }}
                      />
                      <span className="text-[9px] font-black uppercase tracking-tight text-slate-600">{c.name}</span>
                      {currentTheme === c.value && (
                        <div className="absolute top-1 right-1">
                          {savingKey === "theme_primary" ? (
                            <Loader2 className="h-3 w-3 animate-spin text-primary" />
                          ) : (
                            <div className="h-3 w-3 bg-primary rounded-full" />
                          )}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Global Rules */}
        <AccordionItem value="global-rules" className="border rounded-xl bg-card overflow-hidden shadow-sm">
          <AccordionTrigger className="hover:no-underline px-6 py-4 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Settings className="h-4 w-4 text-primary" />
              </div>
              <div className="text-left">
                <span className="text-sm font-bold uppercase tracking-widest text-slate-900 block">Business Logic</span>
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">Core Operational Constants</span>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-4 space-y-4">
            <ConfigList table="commercial_statuses" title="Commercial Statuses" />
          </AccordionContent>
        </AccordionItem>

        {/* Rework Configuration */}
        <AccordionItem value="rework" className="border rounded-xl bg-card overflow-hidden shadow-sm">
          <AccordionTrigger className="hover:no-underline px-6 py-4 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <RefreshCw className="h-4 w-4 text-primary" />
              </div>
              <div className="text-left">
                <span className="text-sm font-bold uppercase tracking-widest text-slate-900 block">Quality Pulse</span>
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">Rework & Rejection Rules</span>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-4 space-y-8">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Rework Categories</Label>
                <p className="text-[10px] font-medium text-slate-400 italic">Comma separated values</p>
              </div>
              <div className="flex gap-2">
                <Input
                  value={editValues["rework_categories"] || ""}
                  placeholder="e.g. Manufacturing, Design, Survey"
                  onChange={(e) => setEditValues({ ...editValues, rework_categories: e.target.value })}
                  className="h-10 text-sm focus-visible:ring-primary shadow-none flex-1"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => save("rework_categories")}
                  disabled={savingKey === "rework_categories"}
                  className="h-10 px-4"
                >
                  {savingKey === "rework_categories" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" /> Save
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Responsible Teams</Label>
                <p className="text-[10px] font-medium text-slate-400 italic">Comma separated values</p>
              </div>
              <div className="flex gap-2">
                <Input
                  value={editValues["rework_responsible_teams"] || ""}
                  placeholder="e.g. Factory, Sales, Logistics"
                  onChange={(e) => setEditValues({ ...editValues, rework_responsible_teams: e.target.value })}
                  className="h-10 text-sm focus-visible:ring-primary shadow-none flex-1"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => save("rework_responsible_teams")}
                  disabled={savingKey === "rework_responsible_teams"}
                  className="h-10 px-4"
                >
                  {savingKey === "rework_responsible_teams" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" /> Save
                    </>
                  )}
                </Button>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* User Roles (Read-Only) */}
        <AccordionItem value="roles" className="border rounded-xl bg-card overflow-hidden shadow-sm">
          <AccordionTrigger className="hover:no-underline px-6 py-4 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div className="text-left">
                <span className="text-sm font-bold uppercase tracking-widest text-slate-900 block">Access Control</span>
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">System-Defined Roles Registry</span>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-4">
            <div className="flex flex-wrap gap-2">
              {ALL_ROLES.map((role) => (
                <Badge key={role} variant="secondary" className="capitalize text-xs font-bold px-3 py-1 bg-slate-100 hover:bg-slate-200 border-none transition-colors">
                  {role}
                </Badge>
              ))}
            </div>
            <div className="mt-4 p-3 rounded-lg bg-blue-50/50 border border-blue-100 flex gap-3">
               <Database className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
               <p className="text-xs text-blue-700 leading-relaxed font-medium">
                 Roles are fundamental to the ecosystem and determine access to specific operational modules. 
                 Changes to role definitions require system-level migration.
               </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* System Information */}
        <AccordionItem value="system" className="border rounded-xl bg-card overflow-hidden shadow-sm">
          <AccordionTrigger className="hover:no-underline px-6 py-4 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Database className="h-4 w-4 text-primary" />
              </div>
              <div className="text-left">
                <span className="text-sm font-bold uppercase tracking-widest text-slate-900 block">System Pulse</span>
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">Integrity and Version Status</span>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-4">
            <div className="grid grid-cols-2 gap-6 max-w-sm">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Version</span>
                <p className="text-sm font-mono font-bold bg-slate-100 px-2 py-0.5 rounded w-fit text-slate-700">v1.2.4-Pulse</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cluster Status</span>
                <Badge variant="outline" className="text-[10px] font-bold text-emerald-600 border-emerald-100 bg-emerald-50 h-6">Operational</Badge>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
