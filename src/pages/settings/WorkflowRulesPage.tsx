import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, Workflow } from "lucide-react";
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

const WORKFLOW_KEYS = [
  { key: "material_dependency_cutting", label: "Material Rule: Cutting" },
  { key: "material_dependency_assembly", label: "Material Rule: Assembly" },
  { key: "material_dependency_glazing", label: "Material Rule: Glazing" },
];

export default function WorkflowRulesPage() {
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const fetchSettings = async () => {
    const { data } = await (supabase.from("app_settings" as any).select("*") as any);
    const items = (data as AppSetting[]) || [];
    setSettings(items);
    const vals: Record<string, string> = {};
    items.forEach((s) => { vals[s.key] = s.value; });
    setEditValues(vals);
    setLoading(false);
  };

  useEffect(() => { fetchSettings(); }, []);

  const save = async (key: string) => {
    const setting = settings.find((s) => s.key === key);
    if (!setting) return;
    const { error } = await (supabase.from("app_settings" as any) as any)
      .update({ value: editValues[key], updated_at: new Date().toISOString() })
      .eq("id", setting.id);
    if (error) toast.error(error.message);
    else toast.success("Rule saved");
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>;

  return (
    <div className="max-w-3xl pb-20">
      <Accordion type="multiple" className="space-y-4">
        <AccordionItem value="dependencies" className="border rounded-lg bg-card px-4">
          <AccordionTrigger className="hover:no-underline flex items-center gap-2">
            <Workflow className="h-4 w-4 text-primary" />
            <span className="font-semibold">Material Dependency Rules</span>
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-6 space-y-4">
            {WORKFLOW_KEYS.map(({ key, label }) => {
              const setting = settings.find((s) => s.key === key);
              if (!setting) return null;
              return (
                <div key={key} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{label}</Label>
                  <div className="flex gap-2">
                    <Input
                      value={editValues[key] || ""}
                      onChange={(e) => setEditValues({ ...editValues, [key]: e.target.value })}
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => save(key)}
                      disabled={editValues[key] === setting.value}
                    >
                      <Save className="h-3.5 w-3.5 mr-1" /> Save
                    </Button>
                  </div>
                </div>
              );
            })}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
