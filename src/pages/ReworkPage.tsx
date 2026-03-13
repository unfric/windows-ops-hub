import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportDataToExcel } from "@/lib/excelUtils";

export default function ReworkPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [reworkMap, setReworkMap] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [oRes, rRes] = await Promise.all([
        supabase.from("orders").select("*").order("created_at", { ascending: false }),
        (supabase.from("rework_logs" as any) as any).select("*"),
      ]);
      if (oRes.error) { toast.error("Failed to load orders"); return; }
      setOrders(oRes.data || []);

      const rm: Record<string, any[]> = {};
      (rRes.data || []).forEach((l: any) => {
        if (!rm[l.order_id]) rm[l.order_id] = [];
        rm[l.order_id].push(l);
      });
      setReworkMap(rm);
      setLoading(false);
    };
    fetch();
  }, []);

  const ordersWithRework = orders.filter((o) => (reworkMap[o.id] || []).length > 0);
  const pendingOrders = ordersWithRework.filter((o) => (reworkMap[o.id] || []).some((r: any) => r.status === "Pending"));
  const inProgressOrders = ordersWithRework.filter((o) => (reworkMap[o.id] || []).some((r: any) => r.status === "In Progress"));
  const solvedOrders = ordersWithRework.filter((o) => (reworkMap[o.id] || []).every((r: any) => r.status === "Solved" || r.status === "Closed"));

  const getLatestIssue = (id: string) => {
    const logs = reworkMap[id] || [];
    if (logs.length === 0) return { issue: "—", resp: "—", date: "—" };
    const latest = [...logs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    return {
      issue: `${latest.rework_qty}× ${latest.issue_type || latest.rework_issue || "—"}`,
      resp: latest.responsible_person || "—",
      date: new Date(latest.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
    };
  };

  const handleExport = (activeTab: string) => {
    let list = ordersWithRework;
    if (activeTab === "pending") list = pendingOrders;
    else if (activeTab === "inprogress") list = inProgressOrders;
    else if (activeTab === "solved") list = solvedOrders;

    const headers = ["Order", "Owner", "Salesperson", "Status", "Latest Issue", "Qty", "Responsible", "Reported Date", "Value"];
    const data = list.map(o => {
      const logs = reworkMap[o.id] || [];
      const latest = logs[0] || {};
      return {
        "Order": o.order_name,
        "Owner": o.dealer_name,
        "Salesperson": o.salesperson || "",
        "Status": getStatus(o.id),
        "Latest Issue": latest.issue_type || latest.rework_issue || "",
        "Qty": latest.rework_qty || 0,
        "Responsible": latest.responsible_person || "",
        "Reported Date": latest.created_at ? new Date(latest.created_at).toLocaleDateString() : "",
        "Value": o.order_value || 0
      };
    });
    exportDataToExcel(data, headers, `rework_export_${activeTab}.xlsx`);
  };

  const getStatus = (id: string) => {
    const logs = reworkMap[id] || [];
    if (logs.length === 0) return "—";
    const hasP = logs.some((r: any) => r.status === "Pending");
    const hasIP = logs.some((r: any) => r.status === "In Progress");
    if (hasP) return "Pending";
    if (hasIP) return "In Progress";
    return "Solved";
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "Pending": return "bg-warning/15 text-warning border-warning/20";
      case "In Progress": return "bg-blue-500/15 text-blue-600 border-blue-500/20";
      case "Solved": return "bg-green-500/15 text-green-600 border-green-500/20";
      default: return "";
    }
  };

  const renderTable = (list: any[]) => (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order</TableHead>
            <TableHead>Salesperson</TableHead>
            <TableHead>Issue / Responsible</TableHead>
            <TableHead>Reported</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
          ) : list.length === 0 ? (
            <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No orders</TableCell></TableRow>
          ) : list.map((o) => (
            <TableRow key={o.id}>
              <TableCell>
                <Link to={`/orders/${o.id}`} className="font-medium text-primary hover:underline">{o.order_name}</Link>
                <div className="text-[10px] text-muted-foreground uppercase">{o.dealer_name}</div>
                <div className="text-[10px] text-muted-foreground">Q: {o.quote_no || "—"} | S: {o.sales_order_no || "—"}</div>
              </TableCell>
              <TableCell className="text-sm">{o.salesperson || "—"}</TableCell>
              <TableCell className="text-sm">
                <div className="font-medium text-destructive">{getLatestIssue(o.id).issue}</div>
                <div className="text-xs text-muted-foreground">Responsible: {getLatestIssue(o.id).resp}</div>
              </TableCell>
              <TableCell className="text-sm">{getLatestIssue(o.id).date}</TableCell>
              <TableCell>
                <Badge variant="outline" className={statusColor(getStatus(o.id))}>{getStatus(o.id)}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rework</h1>
          <p className="text-sm text-muted-foreground">Track defects, complaints, and corrective work</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport("all")}>
            <Download className="mr-2 h-4 w-4" /> Export All
          </Button>
        </div>
      </div>
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending Issues ({pendingOrders.length})</TabsTrigger>
          <TabsTrigger value="inprogress">In Progress ({inProgressOrders.length})</TabsTrigger>
          <TabsTrigger value="solved">Solved ({solvedOrders.length})</TabsTrigger>
          <TabsTrigger value="all">All Issues ({ordersWithRework.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4">{renderTable(pendingOrders)}</TabsContent>
        <TabsContent value="inprogress" className="mt-4">{renderTable(inProgressOrders)}</TabsContent>
        <TabsContent value="solved" className="mt-4">{renderTable(solvedOrders)}</TabsContent>
        <TabsContent value="all" className="mt-4">{renderTable(ordersWithRework)}</TabsContent>
      </Tabs>
    </div>
  );
}
