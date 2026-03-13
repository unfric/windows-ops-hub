import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { logActivity } from "@/lib/activityLog";
import { format } from "date-fns";
import OrderActivityLog from "./OrderActivityLog";

import StatusDropdown from "./StatusDropdown";

interface Props {
  orderId: string;
  order: any;
  onRefresh: () => void;
  updateOrder: (field: string, value: any) => void;
  readOnly?: boolean;
}

export default function DispatchSection({ orderId, order, onRefresh, updateOrder, readOnly }: Props) {
  const [dispatchLogs, setDispatchLogs] = useState<any[]>([]);
  const [productionLogs, setProductionLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [dispatchDate, setDispatchDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [windowsCount, setWindowsCount] = useState("");
  const [transporter, setTransporter] = useState("");
  const [vehicleDetails, setVehicleDetails] = useState("");
  const [remarks, setRemarks] = useState("");

  const fetchData = async () => {
    const [dRes, pRes] = await Promise.all([
      (supabase.from("dispatch_logs" as any) as any).select("*").eq("order_id", orderId).order("created_at", { ascending: false }),
      (supabase.from("production_logs" as any) as any).select("*").eq("order_id", orderId),
    ]);
    setDispatchLogs(dRes.data || []);
    setProductionLogs(pRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [orderId]);

  const PackedTotal = productionLogs.filter((l: any) => l.stage === "Packed").reduce((sum: number, l: any) => sum + l.windows_completed, 0);
  const totalDispatched = dispatchLogs.reduce((sum: number, d: any) => sum + d.windows_dispatched, 0);
  const balanceToDispatch = PackedTotal - totalDispatched;

  const handleAddDispatch = async () => {
    const count = Number(windowsCount);
    if (!count || count <= 0) { toast.error("Enter valid window count"); return; }
    if (count > balanceToDispatch) {
      toast.error(`Cannot dispatch ${count}. Only ${balanceToDispatch} available.`);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await (supabase.from("dispatch_logs" as any) as any).insert({
      order_id: orderId,
      windows_dispatched: count,
      dispatch_date: dispatchDate || null,
      transporter: transporter || null,
      vehicle_details: vehicleDetails || null,
      remarks: remarks || null,
      entered_by: user?.id || null,
    });

    if (error) { toast.error(error.message); return; }

    await logActivity({
      orderId,
      module: "Dispatch",
      fieldName: "windows_dispatched",
      oldValue: String(totalDispatched),
      newValue: String(totalDispatched + count),
    });

    toast.success(`${count} windows dispatched`);
    setAdding(false);
    setWindowsCount("");
    setTransporter("");
    setVehicleDetails("");
    setRemarks("");
    fetchData();
    onRefresh();
  };

  if (order.approval_for_dispatch !== "Approved") {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Dispatch blocked until finance approval is granted.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dispatch Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-md border p-3 text-center">
              <p className="text-xs text-muted-foreground">Ready for Dispatch</p>
              <p className="text-lg font-semibold">{PackedTotal}</p>
            </div>
            <div className="rounded-md border p-3 text-center">
              <p className="text-xs text-muted-foreground">Dispatched</p>
              <p className="text-lg font-semibold">{totalDispatched}</p>
            </div>
            <div className="rounded-md border p-3 text-center">
              <p className="text-xs text-muted-foreground">Balance</p>
              <p className="text-lg font-semibold">{balanceToDispatch}</p>
            </div>
          </div>

          <div className="mt-4">
            {!adding ? (
              <Button size="sm" onClick={() => setAdding(true)} disabled={readOnly || balanceToDispatch <= 0}>
                {readOnly ? "View Only" : "Add Dispatch Entry"}
              </Button>
            ) : (
              <div className="rounded-md border p-4 bg-muted/30 space-y-3">
                <p className="font-medium text-sm">New Dispatch Entry</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Dispatch Date</Label>
                    <Input type="date" value={dispatchDate} onChange={(e) => setDispatchDate(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Windows Dispatched</Label>
                    <Input type="number" min={1} max={balanceToDispatch} value={windowsCount} onChange={(e) => setWindowsCount(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Transporter</Label>
                    <Input value={transporter} onChange={(e) => setTransporter(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Vehicle Details</Label>
                    <Input value={vehicleDetails} onChange={(e) => setVehicleDetails(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Remarks</Label>
                  <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional" />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddDispatch}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dispatch History</CardTitle>
        </CardHeader>
        <CardContent>
          {dispatchLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No dispatch entries yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Windows</TableHead>
                  <TableHead>Transporter</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dispatchLogs.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell className="text-sm">{d.dispatch_date || "—"}</TableCell>
                    <TableCell className="text-right font-medium">{d.windows_dispatched}</TableCell>
                    <TableCell className="text-sm">{d.transporter || "—"}</TableCell>
                    <TableCell className="text-sm">{d.vehicle_details || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{d.remarks || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <OrderActivityLog orderId={orderId} module="Dispatch" refreshKey={order.updated_at || order.created_at} />
    </div>
  );
}
