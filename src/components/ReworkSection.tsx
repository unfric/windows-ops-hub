import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { logActivity } from "@/lib/activityLog";
import OrderActivityLog from "./OrderActivityLog";

const REWORK_STATUSES = ["Pending", "In Progress", "Solved", "Closed"];

interface ReworkSectionProps {
  orderId: string;
  readOnly?: boolean;
}

export default function ReworkSection({ orderId, readOnly }: ReworkSectionProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [qty, setQty] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [categories, setCategories] = useState<string[]>(["Manufacturing", "Design", "Survey", "Installation", "Damage"]);
  const [responsibleTeams, setResponsibleTeams] = useState<string[]>(["Factory", "Sales", "Installation Team", "Logistics"]);
  const [submitting, setSubmitting] = useState(false);

  const fetchConfig = async () => {
    const { data } = await (supabase.from("app_settings" as any).select("*") as any);
    if (data) {
      const cats = data.find((s: any) => s.key === "rework_categories");
      if (cats?.value) setCategories(cats.value.split(",").map((s: string) => s.trim()));

      const teams = data.find((s: any) => s.key === "rework_responsible_teams");
      if (teams?.value) setResponsibleTeams(teams.value.split(",").map((s: string) => s.trim()));
    }
  };

  const fetchLogs = async () => {
    const { data } = await (supabase.from("rework_logs" as any) as any)
      .select("*")
      .eq("order_id", orderId)
      .order("reported_at", { ascending: false });
    setLogs(data || []);
  };

  useEffect(() => {
    fetchLogs();
    fetchConfig();
  }, [orderId]);

  const handleAdd = async () => {
    const q = Number(qty) || 0;
    if (q <= 0) return toast.error("Qty must be > 0");
    if (!issueDescription.trim()) return toast.error("Description is required");

    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await (supabase.from("rework_logs" as any) as any).insert({
      order_id: orderId,
      rework_qty: q,
      rework_issue: issueDescription.trim(),
      status: "Pending",
      reported_by: user?.id || null,
      reported_date: format(new Date(), "yyyy-MM-dd"),
    });
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
    } else {
      await logActivity({
        orderId,
        module: "Rework",
        fieldName: "rework_added",
        oldValue: null,
        newValue: `Qty: ${q}, Issue: ${issueDescription.trim()}`,
      });
      toast.success("Rework logged");
      setQty(""); setIssueDescription("");
      setShowForm(false);
      fetchLogs();
    }
  };

  const updateLog = async (logId: string, field: string, value: any) => {
    const { error } = await (supabase.from("rework_logs" as any) as any)
      .update({
        [field]: value,
        ...(field === "status" ? {
          resolved: value === "Solved" || value === "Closed",
          resolved_at: (value === "Solved" || value === "Closed") ? new Date().toISOString() : null,
        } : {})
      })
      .eq("id", logId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Updated");
      fetchLogs();
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "Pending": return "bg-warning/15 text-warning border-warning/20";
      case "In Progress": return "bg-blue-500/15 text-blue-600 border-blue-500/20";
      case "Solved": return "bg-green-500/15 text-green-600 border-green-500/20";
      case "Closed": return "bg-muted text-muted-foreground border-muted";
      default: return "";
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Rework Log ({logs.reduce((s: number, l: any) => s + (l.rework_qty || 0), 0)} total qty)</CardTitle>
        {!readOnly && (
          <Button size="sm" className="gap-1" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4" /> Add Rework Issue
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {showForm && (
          <div className="mb-4 p-4 border rounded-md space-y-4 bg-muted/30">
            <p className="text-sm font-medium">Log New Issue (Sales)</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Qty *</Label>
                <Input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Issue Description *</Label>
                <Input value={issueDescription} onChange={(e) => setIssueDescription(e.target.value)} placeholder="e.g. glass scratch, wrong dimension" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={submitting}>{submitting ? "Saving…" : "Save Record"}</Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No rework entries yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Date</TableHead>
                <TableHead className="text-right w-16">Qty</TableHead>
                <TableHead className="min-w-[150px]">Issue (Sales)</TableHead>
                <TableHead className="w-32">Category</TableHead>
                <TableHead className="w-32">Responsible</TableHead>
                <TableHead>Solution / Fix</TableHead>
                <TableHead className="text-right w-24">Cost</TableHead>
                <TableHead className="w-32">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs">{log.reported_date || format(new Date(log.reported_at), "dd MMM yyyy")}</TableCell>
                  <TableCell className="text-right font-medium">{log.rework_qty}</TableCell>
                  <TableCell className="text-sm italic">{log.rework_issue}</TableCell>
                  <TableCell>
                    <Select disabled={readOnly} value={log.issue_type || ""} onValueChange={(val) => updateLog(log.id, "issue_type", val)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select disabled={readOnly} value={log.responsible_person || ""} onValueChange={(val) => updateLog(log.id, "responsible_person", val)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Team" /></SelectTrigger>
                      <SelectContent>
                        {responsibleTeams.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      className="h-8 text-xs"
                      defaultValue={log.solution || ""}
                      placeholder={readOnly ? "" : "Add solution"}
                      readOnly={readOnly}
                      onBlur={(e) => {
                        if (e.target.value !== (log.solution || "")) updateLog(log.id, "solution", e.target.value);
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      className="h-8 text-xs text-right"
                      defaultValue={log.cost || ""}
                      placeholder="0"
                      readOnly={readOnly}
                      onBlur={(e) => {
                        const val = Number(e.target.value);
                        if (val !== (log.cost || 0)) updateLog(log.id, "cost", val);
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Select disabled={readOnly} value={log.status || "Pending"} onValueChange={(val) => updateLog(log.id, "status", val)}>
                      <SelectTrigger className={`h-8 text-xs font-medium ${statusColor(log.status)}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REWORK_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <OrderActivityLog orderId={orderId} module="Rework" refreshKey={new Date().toISOString()} />
    </Card>
  );
}
