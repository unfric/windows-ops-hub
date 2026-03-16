import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";

interface ConfigItem {
  id: string;
  name: string;
  active: boolean;
}

interface ConfigListProps {
  table: string;
  title: string;
}

/**
 * A reusable component to manage simple configuration lists (names/active status).
 */
export function ConfigList({ table, title }: ConfigListProps) {
  const [items, setItems] = useState<ConfigItem[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

  useEffect(() => {
    fetchItems();
  }, []);

  const add = async () => {
    const name = newName.trim();
    if (!name) return;
    setActionLoading("adding");
    try {
      await api.settings.upsert(table, { name });
      toast.success(`${title} added`);
      setNewName("");
      await fetchItems();
    } catch (err: any) {
      toast.error(err.message || "Failed to add item");
    } finally {
      setActionLoading(null);
    }
  };

  const toggle = async (item: ConfigItem) => {
    setActionLoading(item.id);
    try {
      await api.settings.upsert(table, { 
        id: item.id, 
        name: item.name, 
        active: !item.active 
      });
      await fetchItems();
    } catch (err: any) {
      toast.error(err.message || "Failed to update item");
    } finally {
      setActionLoading(null);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm(`Are you sure you want to delete this ${title.toLowerCase().replace(/s$/, "")}?`)) return;
    
    setActionLoading(id);
    try {
      await api.settings.delete(table, id);
      await fetchItems();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete item");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="py-4">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary/40" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-6 border-2 border-dashed rounded-lg bg-slate-50/50">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">No {title.toLowerCase()} configured</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
              {items.map((item) => (
                <div 
                  key={item.id} 
                  className={`flex items-center justify-between group rounded-lg border px-3 py-2 transition-all ${
                    !item.active ? "bg-slate-50 opacity-60" : "bg-white hover:border-primary/30 hover:shadow-sm"
                  }`}
                >
                  <span className={`text-sm font-medium ${!item.active ? "text-slate-400 line-through" : "text-slate-700"}`}>
                    {item.name}
                  </span>
                  <div className="flex items-center gap-2">
                    {actionLoading === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <>
                        <Switch 
                          checked={item.active} 
                          onCheckedChange={() => toggle(item)} 
                          className="scale-90"
                        />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-slate-300 hover:text-destructive hover:bg-destructive/10 transition-colors"
                          onClick={() => remove(item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex gap-2 pt-2 border-t border-slate-100">
          <Input
            placeholder={`Add new ${title.toLowerCase().replace(/s$/, "")}...`}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            className="h-9 text-sm focus-visible:ring-primary shadow-none"
            disabled={actionLoading === "adding"}
          />
          <Button 
            size="sm" 
            onClick={add} 
            disabled={!newName.trim() || actionLoading === "adding"}
            className="h-9 shadow-sm"
          >
            {actionLoading === "adding" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1.5" /> 
                <span className="font-bold">ADD</span>
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
