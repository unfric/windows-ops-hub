import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Save, Palette, Settings, RefreshCw, Users, Database } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface ConfigItem {
  id: string;
  name: string;
  active: boolean;
}

function ConfigList({ table, title }: { table: string; title: string }) {
  const [items, setItems] = useState<ConfigItem[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    try {
      const settings = await api.settings.list();
      if (settings && settings[table]) {
        setItems(settings[table] as ConfigItem[]);
      }
    } catch (err) {
      console.error(`Error fetching ${table}:`, err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const add = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      await api.settings.upsert(table, { name });
      toast.success(`${title} added`);
      setNewName("");
      fetchItems();
    } catch (err: any) {
      toast.error(err.message || "Failed to add item");
    }
  };

  const toggle = async (item: ConfigItem) => {
    try {
      await api.settings.upsert(table, { id: item.id, active: !item.active });
      fetchItems();
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle item");
    }
  };

  const remove = async (id: string) => {
    try {
      await api.settings.delete(table, id);
      fetchItems();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete item");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 mb-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">None configured</p>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                <span className={`text-sm ${!item.active ? "text-muted-foreground line-through" : ""}`}>{item.name}</span>
                <div className="flex items-center gap-2">
                  <Switch checked={item.active} onCheckedChange={() => toggle(item)} />
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(item.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder={`New ${title.toLowerCase().replace(/s$/, "")} name...`}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            className="flex-1"
          />
          <Button size="sm" onClick={add} disabled={!newName.trim()}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export { ConfigList };

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

export default function GeneralSettingsPage() {
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const fetchSettings = async () => {
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  const save = async (key: string) => {
    const setting = settings.find((s) => s.key === key);
    try {
      await api.settings.upsert("app_settings", { 
        id: setting?.id, 
        key, 
        value: editValues[key] 
      });
      toast.success("Setting saved");
      if (key === "theme_primary") {
        applyTheme(editValues[key]);
      }
      fetchSettings();
    } catch (err: any) {
      toast.error(err.message || "Failed to save setting");
    }
  };

  const applyTheme = (color: string) => {
    if (!color) return;
    document.documentElement.style.setProperty('--primary', color);
    document.documentElement.style.setProperty('--ring', color);
  };

  const THEME_COLORS = [
    { name: "Ocean Blue", value: "213 50% 32%" },
    { name: "Deep Purple", value: "262 83% 58%" },
    { name: "Emerald", value: "142 71% 45%" },
    { name: "Crimson", value: "346 84% 61%" },
    { name: "Midnight", value: "220 40% 15%" },
    { name: "Amber", value: "38 92% 50%" },
  ];

  const currentTheme = editValues["theme_primary"] || "213 50% 32%";

  return (
    <div className="max-w-3xl pb-20">
      <Accordion type="multiple" className="space-y-4">
        {/* Appearance & Branding */}
        <AccordionItem value="appearance" className="border rounded-lg bg-card px-4">
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" />
              <span className="text-base font-semibold">Appearance & Branding</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-6 pt-2">
            <div className="space-y-6">
              <div>
                <Label className="text-sm font-medium mb-3 block">Primary Theme Color</Label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {THEME_COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => {
                        setEditValues({ ...editValues, theme_primary: c.value });
                        save("theme_primary");
                      }}
                      className={cn(
                        "group relative flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition-all",
                        currentTheme === c.value ? "border-primary bg-primary/5 shadow-sm" : "border-transparent hover:bg-muted"
                      )}
                    >
                      <div
                        className="h-8 w-8 rounded-full shadow-inner border border-black/5"
                        style={{ backgroundColor: `hsl(${c.value})` }}
                      />
                      <span className="text-[10px] font-medium uppercase tracking-tight">{c.name}</span>
                      {currentTheme === c.value && (
                        <div className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-white rounded-full flex items-center justify-center border-2 border-white">
                          <Save className="h-2 w-2" />
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
        <AccordionItem value="global-rules" className="border rounded-lg bg-card px-4">
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-primary" />
              <span className="text-base font-semibold">Global Business Rules</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-6 pt-2 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-bold italic">Core Business Logic</Label>
              <ConfigList table="commercial_statuses" title="Commercial Statuses" />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Rework Configuration */}
        <AccordionItem value="rework" className="border rounded-lg bg-card px-4">
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-primary" />
              <span className="text-base font-semibold">Rework & Quality Configuration</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-6 pt-2 space-y-6">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-bold uppercase">Rework Categories</Label>
              <div className="flex gap-2">
                <Input
                  value={editValues["rework_categories"] || "Manufacturing, Design, Survey, Installation, Damage"}
                  onChange={(e) => setEditValues({ ...editValues, rework_categories: e.target.value })}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => save("rework_categories")}
                >
                  <Save className="h-3.5 w-3.5 mr-1" /> Save
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">Comma separated values for rework reason dropdowns.</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-bold uppercase">Responsible Teams</Label>
              <div className="flex gap-2">
                <Input
                  value={editValues["rework_responsible_teams"] || "Factory, Sales, Installation Team, Logistics"}
                  onChange={(e) => setEditValues({ ...editValues, rework_responsible_teams: e.target.value })}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => save("rework_responsible_teams")}
                >
                  <Save className="h-3.5 w-3.5 mr-1" /> Save
                </Button>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* User Roles (Read-Only) */}
        <AccordionItem value="roles" className="border rounded-lg bg-card px-4">
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-base font-semibold">System Access Roles</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-6 pt-2">
            <div className="flex flex-wrap gap-2">
              {ALL_ROLES.map((role) => (
                <Badge key={role} variant="secondary" className="capitalize text-sm">{role}</Badge>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Roles are system-defined and manage module access across the Pulse ecosystem.</p>
          </AccordionContent>
        </AccordionItem>

        {/* System Information */}
        <AccordionItem value="system" className="border rounded-lg bg-card px-4">
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              <span className="text-base font-semibold">System Health</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-6 pt-2">
            <div className="text-sm space-y-2 max-w-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version</span>
                <span className="font-mono bg-muted px-1.5 rounded">v1.2.4-Pulse</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Environment</span>
                <Badge variant="outline" className="text-xs font-bold text-emerald-600 border-emerald-100 bg-emerald-50">Production</Badge>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
