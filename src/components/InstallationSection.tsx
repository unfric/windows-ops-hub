import { useState } from "react";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import OrderActivityLog from "./OrderActivityLog";

interface Props {
  orderId: string;
  order: any;
  onRefresh: () => void;
  updateOrder: (field: string, value: any) => void;
  readOnly?: boolean;
}

export default function InstallationSection({ orderId, order, onRefresh, updateOrder, readOnly }: Props) {
  const [adding, setAdding] = useState(false);
  const [installDate, setInstallDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [windowsCount, setWindowsCount] = useState("");
  const [supervisor, setSupervisor] = useState("");
  const [remarks, setRemarks] = useState("");

  const installLogs = order.installation_logs || [];
  const dispatchLogs = order.dispatch_logs || [];

  const totalDispatched = dispatchLogs.reduce((sum: number, d: any) => sum + d.windows_dispatched, 0);
  const totalInstalled = installLogs.reduce((sum: number, l: any) => sum + l.windows_installed, 0);
  const pendingInstall = totalDispatched - totalInstalled;

  const handleAdd = async () => {
    const count = Number(windowsCount);
    if (!count || count <= 0) { toast.error("Enter valid window count"); return; }
    if (count > pendingInstall) {
      toast.error(`Cannot install ${count}. Only ${pendingInstall} pending.`);
      return;
    }

    try {
      await api.orders.addLog("installation_logs", {
        order_id: orderId,
        windows_installed: count,
        installation_date: installDate || null,
        site_supervisor: supervisor || null,
        remarks: remarks || null,
      });

      toast.success(`${count} windows installed`);
      setAdding(false);
      setWindowsCount("");
      setSupervisor("");
      setRemarks("");
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (totalDispatched === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No windows dispatched yet. Installation will be available after dispatch.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Installation Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-md border p-3 text-center">
              <p className="text-xs text-muted-foreground">Dispatched</p>
              <p className="text-lg font-semibold">{totalDispatched}</p>
            </div>
            <div className="rounded-md border p-3 text-center">
              <p className="text-xs text-muted-foreground">Installed</p>
              <p className="text-lg font-semibold">{totalInstalled}</p>
            </div>
            <div className="rounded-md border p-3 text-center">
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-lg font-semibold">{pendingInstall}</p>
            </div>
          </div>

          <div className="mt-4">
            {!adding ? (
              <Button size="sm" onClick={() => setAdding(true)} disabled={readOnly || pendingInstall <= 0}>
                {readOnly ? "View Only" : "Add Installation Entry"}
              </Button>
            ) : (
              <div className="rounded-md border p-4 bg-muted/30 space-y-3">
                <p className="font-medium text-sm">New Installation Entry</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Installation Date</Label>
                    <Input type="date" value={installDate} onChange={(e) => setInstallDate(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Windows Installed</Label>
                    <Input type="number" min={1} max={pendingInstall} value={windowsCount} onChange={(e) => setWindowsCount(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Site Supervisor</Label>
                    <Input value={supervisor} onChange={(e) => setSupervisor(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Remarks</Label>
                    <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAdd}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Installation History</CardTitle>
        </CardHeader>
        <CardContent>
          {installLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No installation entries yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Windows</TableHead>
                  <TableHead>Supervisor</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {installLogs.map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-sm">{l.installation_date || "—"}</TableCell>
                    <TableCell className="text-right font-medium">{l.windows_installed}</TableCell>
                    <TableCell className="text-sm">{l.site_supervisor || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{l.remarks || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <OrderActivityLog orderId={orderId} module="Installation" refreshKey={order.updated_at || order.created_at} />
    </div >
  );
}
