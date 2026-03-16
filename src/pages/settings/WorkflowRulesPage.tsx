import { useEffect, useState, useCallback } from "react";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Save, Workflow, Loader2, Info } from "lucide-react";
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
  { key: "material_dependency_cutting", label: "Cutting Readiness", description: "Required materials for cutting phase" },
  { key: "material_dependency_assembly", label: "Assembly Readiness", description: "Required materials for assembly phase" },
  { key: "material_dependency_glazing", label: "Glazing Readiness", description: "Required materials for glazing phase" },
];

/**
 * Page for configuring industrial workflow dependencies and automation rules.
 */
export default function WorkflowRulesPage() {
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const data = await api.settings.list();
      const items = (data.app_settings as AppSetting[]) || [];
      setSettings(items);
      const vals: Record<string, string> = {};
      items.forEach((s) => { vals[s.key] = s.value; });
      setEditValues(vals);
    } catch (err) {
      console.error("Error fetching workflow settings:", err);
      toast.error("Failed to load workflow rules");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    fetchSettings(); 
  }, [fetchSettings]);

  const save = async (key: string) => {
    setSavingKey(key);
    const setting = settings.find((s) => s.key === key);
    try {
      await api.settings.upsert("app_settings", { 
        id: setting?.id, 
        key, 
        value: editValues[key] 
      });
      toast.success("Rule updated");
      await fetchSettings();
    } catch (err: any) {
      toast.error(err.message || "Failed to save rule");
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl pb-20 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <Accordion type="multiple" className="space-y-4" defaultValue={["dependencies"]}>
        <AccordionItem value="dependencies" className="border rounded-xl bg-card overflow-hidden shadow-sm">
          <AccordionTrigger className="hover:no-underline px-6 py-4 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Workflow className="h-4 w-4 text-primary" />
              </div>
              <div className="text-left">
                <span className="text-sm font-bold uppercase tracking-widest text-slate-900 block">Material Dependencies</span>
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">Automated Phase Locking Rules</span>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pt-4 pb-6 space-y-8">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex gap-4">
               <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
               <div className="space-y-1">
                 <p className="text-xs font-bold uppercase tracking-wider text-slate-700">How rules work</p>
                 <p className="text-xs text-slate-500 leading-relaxed">
                   Enter comma-separated material names. Phases will remain <span className="font-bold text-slate-700">LOCKED</span> until 
                   all specified materials are marked as <span className="font-bold text-emerald-600 uppercase">Ready</span> in the Store module.
                 </p>
               </div>
            </div>

            <div className="space-y-6">
              {WORKFLOW_KEYS.map(({ key, label, description }) => {
                const setting = settings.find((s) => s.key === key);
                if (!setting) return null;
                
                const hasChanges = editValues[key] !== setting.value;
                const isSaving = savingKey === key;

                return (
                  <div key={key} className="space-y-3 group">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-900">{label}</Label>
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">{description}</p>
                      </div>
                      {hasChanges && !isSaving && (
                        <Badge variant="outline" className="text-[9px] font-black uppercase text-amber-600 border-amber-100 bg-amber-50 animate-pulse">
                          Unsaved Changes
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={editValues[key] || ""}
                        placeholder="e.g. Profiles, Hardware, Gaskets"
                        onChange={(e) => setEditValues({ ...editValues, [key]: e.target.value })}
                        className="h-10 text-sm focus-visible:ring-primary shadow-none flex-1 font-medium text-slate-700"
                        disabled={isSaving}
                      />
                      <Button
                        size="sm"
                        variant={hasChanges ? "default" : "outline"}
                        onClick={() => save(key)}
                        disabled={!hasChanges || isSaving}
                        className="h-10 px-4 transition-all"
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" /> 
                            <span className="font-bold uppercase text-[11px]">Save Rule</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
