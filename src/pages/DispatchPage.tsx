import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Download } from "lucide-react";
import { exportDataToExcel } from "@/lib/excelUtils";

interface OrderWithDispatch {
  id: string;
  order_name: string;
  dealer_name: string;
  order_type: string;
  quote_no: string | null;
  sales_order_no: string | null;
  colour_shade: string | null;
  salesperson: string | null;
  product_type: string;
  total_windows: number;
  design_released_windows: number;
  sqft: number;
  order_value: number;
  approval_for_dispatch: string;
  PackedTotal: number;
  dispatched: number;
  balance: number;
}

export default function DispatchPage() {
  const [orders, setOrders] = useState<OrderWithDispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await api.orders.list();
        if (!data.orders) { setLoading(false); return; }

        const PackedMap: Record<string, number> = {};
        ((data.production_logs || []) as any[]).forEach((l: any) => {
          if (l.stage === "Packed") PackedMap[l.order_id] = (PackedMap[l.order_id] || 0) + l.windows_completed;
        });

        const dispMap: Record<string, number> = {};
        ((data.dispatch_logs || []) as any[]).forEach((d: any) => {
          dispMap[d.order_id] = (dispMap[d.order_id] || 0) + d.windows_dispatched;
        });

        const mapped: OrderWithDispatch[] = (data.orders as any[])
          .filter((o) => (PackedMap[o.id] || 0) > 0 || (dispMap[o.id] || 0) > 0)
          .map((o) => {
            const Packed = PackedMap[o.id] || 0;
            const disp = dispMap[o.id] || 0;
            return {
              ...o,
              PackedTotal: Packed,
              dispatched: disp,
              balance: Packed - disp
            };
          });

        setOrders(mapped);
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleExport = (activeTab: string) => {
    const list = getFiltered(activeTab);
    const headers = ["Order", "Owner", "Quote No", "SO No", "Salesperson", "Product Type", "Shade", "Sqft", "Windows", "Fin Appr", "Ready", "Dispatched", "Balance"];
    const data = list.map(o => ({
      "Order": o.order_name,
      "Owner": o.dealer_name,
      "Quote No": o.quote_no || "",
      "SO No": o.sales_order_no || "",
      "Salesperson": o.salesperson || "",
      "Product Type": o.product_type || "",
      "Shade": o.colour_shade || "",
      "Sqft": o.sqft || 0,
      "Windows": o.total_windows,
      "Fin Appr": o.approval_for_dispatch,
      "Ready": o.PackedTotal,
      "Dispatched": o.dispatched,
      "Balance": o.balance
    }));
    exportDataToExcel(data, headers, `dispatch_export_${activeTab}.xlsx`);
  };

  const getFiltered = (tab: string) => {
    switch (tab) {
      case "ready":
        return orders.filter((o) => o.PackedTotal > 0 && o.dispatched === 0);
      case "partial":
        return orders.filter((o) => o.dispatched > 0 && o.dispatched < (o.design_released_windows || 0));
      case "full":
        return orders.filter((o) => o.dispatched > 0 && o.dispatched >= (o.design_released_windows || 0) && (o.design_released_windows || 0) > 0);
      default:
        return orders;
    }
  };

  const renderTable = (list: OrderWithDispatch[]) => (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order</TableHead>
            <TableHead>Salesperson</TableHead>
            <TableHead>Product / Shade</TableHead>
            <TableHead className="text-right">Sqft</TableHead>
            <TableHead className="text-right">Windows</TableHead>
            <TableHead className="text-center">Fin Appr</TableHead>
            <TableHead className="text-right">Ready</TableHead>
            <TableHead className="text-right">Dispatch</TableHead>
            <TableHead className="text-right">Balance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
          ) : list.length === 0 ? (
            <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No orders</TableCell></TableRow>
          ) : (
            list.map((o) => (
              <TableRow key={o.id}>
                <TableCell>
                  <Link to={`/orders/${o.id}`} className="font-medium text-primary hover:underline">{o.order_name}</Link>
                  <div className="text-[10px] text-muted-foreground uppercase">{o.dealer_name}</div>
                  <div className="text-[10px] text-muted-foreground">Q: {o.quote_no || "—"} | S: {o.sales_order_no || "—"}</div>
                </TableCell>
                <TableCell className="text-sm">{o.salesperson || "—"}</TableCell>
                <TableCell className="text-sm">
                  <div className="truncate max-w-[120px]" title={o.product_type}>{o.product_type}</div>
                  <div className="text-xs text-muted-foreground">{o.colour_shade || "—"}</div>
                </TableCell>
                <TableCell className="text-right text-sm">{o.sqft?.toFixed(1) || "0.0"}</TableCell>
                <TableCell className="text-right font-medium">{o.total_windows}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={o.approval_for_dispatch === "Approved" ? "success" : "secondary"} className="text-[10px]">
                    {o.approval_for_dispatch}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-bold text-blue-600">{o.PackedTotal}</TableCell>
                <TableCell className="text-right font-bold text-green-600">{o.dispatched}</TableCell>
                <TableCell className="text-right font-bold text-destructive">{o.balance}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dispatch</h1>
          <p className="text-sm text-muted-foreground">{orders.length} orders in queue</p>
        </div>
        <Button onClick={() => handleExport(activeTab)} variant="outline" size="sm" className="h-8">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="ready">Ready for Dispatch</TabsTrigger>
          <TabsTrigger value="partial">Partially Dispatched</TabsTrigger>
          <TabsTrigger value="full">Fully Dispatched</TabsTrigger>
          <TabsTrigger value="all">All Orders</TabsTrigger>
        </TabsList>
        <TabsContent value="ready" className="mt-4">{renderTable(getFiltered("ready"))}</TabsContent>
        <TabsContent value="partial" className="mt-4">{renderTable(getFiltered("partial"))}</TabsContent>
        <TabsContent value="full" className="mt-4">{renderTable(getFiltered("full"))}</TabsContent>
        <TabsContent value="all" className="mt-4">{renderTable(getFiltered("all"))}</TabsContent>
      </Tabs>
    </div>
  );
}
