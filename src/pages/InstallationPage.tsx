import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/services/api";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportDataToExcel } from "@/lib/excelUtils";

export default function InstallationPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [installMap, setInstallMap] = useState<Record<string, number>>({});
  const [dispatchMap, setDispatchMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await api.orders.list();
        if (!data.orders) { setLoading(false); return; }
        setOrders(data.orders || []);

        const im: Record<string, number> = {};
        (data.installation_logs || []).forEach((l: any) => { 
          im[l.order_id] = (im[l.order_id] || 0) + l.windows_installed; 
        });
        setInstallMap(im);

        const dm: Record<string, number> = {};
        (data.dispatch_logs || []).forEach((l: any) => { 
          dm[l.order_id] = (dm[l.order_id] || 0) + l.windows_dispatched; 
        });
        setDispatchMap(dm);
      } catch (err: any) {
        toast.error("Failed to load orders");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const getDispatched = (id: string) => dispatchMap[id] || 0;
  const getInstalled = (id: string) => installMap[id] || 0;
  const getPending = (id: string) => getDispatched(id) - getInstalled(id);

  const readyOrders = orders.filter((o) => getDispatched(o.id) > 0 && getInstalled(o.id) === 0);
  const partialOrders = orders.filter((o) => getInstalled(o.id) > 0 && getInstalled(o.id) < (o.design_released_windows || 0));
  const fullyOrders = orders.filter((o) => getInstalled(o.id) > 0 && getInstalled(o.id) >= (o.design_released_windows || 0) && (o.design_released_windows || 0) > 0);

  const handleExport = (activeTab: string) => {
    let list = orders;
    if (activeTab === "ready") list = readyOrders;
    else if (activeTab === "partial") list = partialOrders;
    else if (activeTab === "full") list = fullyOrders;

    const headers = ["Order", "Owner", "Quote No", "SO No", "Salesperson", "Status", "Product", "Sqft", "Value", "Dispatched", "Installed", "Pending"];
    const data = list.map(o => ({
      "Order": o.order_name,
      "Owner": o.dealer_name,
      "Quote No": o.quote_no || "",
      "SO No": o.sales_order_no || "",
      "Salesperson": o.salesperson || "",
      "Status": o.installation_status || "Pending",
      "Product": o.product_type || "",
      "Sqft": o.sqft || 0,
      "Value": o.order_value || 0,
      "Dispatched": getDispatched(o.id),
      "Installed": getInstalled(o.id),
      "Pending": getPending(o.id)
    }));
    exportDataToExcel(data, headers, `installation_export_${activeTab}.xlsx`);
  };

  const renderTable = (list: any[]) => (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order</TableHead>
            <TableHead>Salesperson</TableHead>
            <TableHead>Install Status</TableHead>
            <TableHead className="text-right">Sqft</TableHead>
            <TableHead className="text-right">Dispatched</TableHead>
            <TableHead className="text-right">Installed</TableHead>
            <TableHead className="text-right">Pending</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
          ) : list.length === 0 ? (
            <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No orders</TableCell></TableRow>
          ) : list.map((o) => (
            <TableRow key={o.id}>
              <TableCell>
                <Link to={`/orders/${o.id}`} className="font-medium text-primary hover:underline">{o.order_name}</Link>
                <div className="text-[10px] text-muted-foreground uppercase">{o.dealer_name}</div>
                <div className="text-[10px] text-muted-foreground">Q: {o.quote_no || "—"} | S: {o.sales_order_no || "—"}</div>
              </TableCell>
              <TableCell className="text-sm">{o.salesperson || "—"}</TableCell>
              <TableCell>
                <Badge variant={o.installation_status === "Completed" ? "success" : "warning"} className="text-[10px]">
                  {o.installation_status || "Pending"}
                </Badge>
              </TableCell>
              <TableCell className="text-right text-sm">{Number(o.sqft).toFixed(1)}</TableCell>
              <TableCell className="text-right font-medium text-blue-600">{getDispatched(o.id)}</TableCell>
              <TableCell className="text-right font-bold text-green-600">{getInstalled(o.id)}</TableCell>
              <TableCell className="text-right font-bold text-destructive">{getPending(o.id)}</TableCell>
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
          <h1 className="text-2xl font-semibold tracking-tight">Installation</h1>
          <p className="text-sm text-muted-foreground">Track site installation progress</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport("all")}>
            <Download className="mr-2 h-4 w-4" /> Export All
          </Button>
        </div>
      </div>
      <Tabs defaultValue="ready">
        <TabsList>
          <TabsTrigger value="ready">Ready for Installation ({readyOrders.length})</TabsTrigger>
          <TabsTrigger value="partial">Partially Installed ({partialOrders.length})</TabsTrigger>
          <TabsTrigger value="full">Fully Installed ({fullyOrders.length})</TabsTrigger>
          <TabsTrigger value="all">All Orders ({orders.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="ready" className="mt-4">{renderTable(readyOrders)}</TabsContent>
        <TabsContent value="partial" className="mt-4">{renderTable(partialOrders)}</TabsContent>
        <TabsContent value="full" className="mt-4">{renderTable(fullyOrders)}</TabsContent>
        <TabsContent value="all" className="mt-4">{renderTable(orders)}</TabsContent>
      </Tabs>
    </div>
  );
}
