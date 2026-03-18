import { useState } from "react";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import OrderActivityLog from "./OrderActivityLog";

const STAGES = ["Cutting", "Assembly", "Glazing", "Quality", "Packed"] as const;
const STAGE_ORDER: Record<string, number> = { Cutting: 0, Assembly: 1, Glazing: 2, Quality: 3, Packed: 4 };
const STAGE_PREREQ: Record<string, string> = {
  Assembly: "Cutting",
  Glazing: "Assembly",
  Quality: "Glazing",
  Packed: "Quality",
};

interface Props {
  orderId: string;
  order: any;
  onRefresh: () => void;
  readOnly?: boolean;
}

export default function ProductionSection({ orderId, order, onRefresh, readOnly }: Props) {
  const [addingStage, setAddingStage] = useState<string | null>(null);
  const [entryDate, setEntryDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [entryWindows, setEntryWindows] = useState("");
  const [entryRemarks, setEntryRemarks] = useState("");

  const logs = order.production_logs || [];

  const stageTotals: Record<string, number> = {};
  STAGES.forEach((s) => {
    stageTotals[s] = logs.filter((l: any) => l.stage === s).reduce((sum: number, l: any) => sum + l.windows_completed, 0);
  });

  const atw = order.design_released_windows || 0;

  const handleAddEntry = async (stage: string) => {
    const count = Number(entryWindows);
    if (!count || count <= 0) { toast.error("Enter valid window count"); return; }

    // Check stage prerequisite
    const prereq = STAGE_PREREQ[stage];
    if (prereq) {
      const prereqTotal = stageTotals[prereq] || 0;
      const newTotal = (stageTotals[stage] || 0) + count;
      if (newTotal > prereqTotal) {
        toast.error(`${stage} total (${newTotal}) cannot exceed ${prereq} total (${prereqTotal})`);
        return;
      }
    }

    // Check not exceeding avl to work
    const newTotal = (stageTotals[stage] || 0) + count;
    if (newTotal > atw) {
      toast.error(`${stage} total (${newTotal}) cannot exceed Available to Work (${atw})`);
      return;
    }

    try {
      await api.orders.addLog("production_logs", {
        order_id: orderId,
        stage,
        windows_completed: count,
        entry_date: entryDate,
        remarks: entryRemarks || null,
      });

      toast.success(`${count} windows added to ${stage}`);
      setAddingStage(null);
      setEntryWindows("");
      setEntryRemarks("");
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this production entry?")) return;
    try {
      await api.orders.deleteLog("production_logs", id);
      toast.success("Entry deleted");
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (order.approval_for_production !== "Approved") {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Production blocked until finance approval is granted.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Production Progress — {atw} windows available to work</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-3 mb-4">
            {STAGES.map((stage) => (
              <div key={stage} className="rounded-md border p-3 text-center">
                <p className="text-xs text-muted-foreground">{stage}</p>
                <p className={`text-lg font-semibold ${(stageTotals[stage] || 0) >= atw && atw > 0 ? "text-green-600" : ""}`}>
                  {stageTotals[stage] || 0} / {atw}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 text-xs h-7"
                  onClick={() => { setAddingStage(stage); setEntryWindows(""); setEntryRemarks(""); }}
                  disabled={readOnly || (stageTotals[stage] || 0) >= atw}
                >
                  {readOnly ? "View Only" : "Add Entry"}
                </Button>
              </div>
            ))}
          </div>

          {addingStage && (
            <div className="rounded-md border p-4 bg-muted/30 space-y-3">
              <p className="font-medium text-sm">Add {addingStage} Entry</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Date</Label>
                  <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Windows Completed</Label>
                  <Input type="number" min={1} value={entryWindows} onChange={(e) => setEntryWindows(e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Remarks</Label>
                  <Input value={entryRemarks} onChange={(e) => setEntryRemarks(e.target.value)} placeholder="Optional" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleAddEntry(addingStage)}>Save</Button>
                <Button size="sm" variant="outline" onClick={() => setAddingStage(null)}>Cancel</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Entry History</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No production entries yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead className="text-right">Windows</TableHead>
                  <TableHead>Remarks</TableHead>
                  {!readOnly && <TableHead className="w-10"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-sm">{l.entry_date}</TableCell>
                    <TableCell><Badge variant="outline">{l.stage}</Badge></TableCell>
                    <TableCell className="text-right font-medium">{l.windows_completed}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{l.remarks || "—"}</TableCell>
                    {!readOnly && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleDeleteEntry(l.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <OrderActivityLog orderId={orderId} module="Production" refreshKey={order.updated_at || order.created_at} />
    </div>
  );
}
