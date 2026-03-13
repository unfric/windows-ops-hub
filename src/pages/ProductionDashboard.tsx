import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, Download } from "lucide-react";
import { toast } from "sonner";
import { exportDataToExcel } from "@/lib/excelUtils";

const STAGES = ["Cutting", "Assembly", "Glazing", "Quality", "Packed"] as const;

interface OrderWithProduction {
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
  approval_for_production: string;
  hardware_availability: string;
  extrusion_availability: string;
  glass_availability: string;
  coated_extrusion_availability: string;
  stageTotals: Record<string, number>;
}

export default function ProductionDashboard() {
  const [orders, setOrders] = useState<OrderWithProduction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [ordersRes, logsRes] = await Promise.all([
        supabase.from("orders").select("id, order_name, dealer_name, order_type, quote_no, sales_order_no, colour_shade, salesperson, product_type, total_windows, design_released_windows, sqft, order_value, approval_for_production, hardware_availability, extrusion_availability, glass_availability, coated_extrusion_availability").order("created_at", { ascending: false }),
        supabase.from("production_logs" as any).select("order_id, stage, windows_completed"),
      ]);

      if (!ordersRes.data) { setLoading(false); return; }

      const logs = (logsRes.data || []) as any[];
      const logMap: Record<string, Record<string, number>> = {};
      logs.forEach((l: any) => {
        if (!logMap[l.order_id]) logMap[l.order_id] = {};
        logMap[l.order_id][l.stage] = (logMap[l.order_id][l.stage] || 0) + l.windows_completed;
      });

      const mapped: OrderWithProduction[] = (ordersRes.data as any[]).map((o) => ({
        ...o,
        stageTotals: logMap[o.id] || {},
      }));

      setOrders(mapped);
      setLoading(false);
    };
    fetchData();
  }, []);

  const avlToWork = (o: OrderWithProduction) => o.design_released_windows || 0;

  const overallProgress = (o: OrderWithProduction) => {
    const atw = avlToWork(o) || 1;
    const avg = STAGES.reduce((sum, s) => sum + ((o.stageTotals[s] || 0) / atw) * 100, 0) / STAGES.length;
    return Math.min(100, Math.round(avg));
  };

  const isReadyForProduction = (o: OrderWithProduction) =>
    o.approval_for_production === "Approved" && o.design_released_windows > 0 && !Object.keys(o.stageTotals).length;

  const isInProduction = (o: OrderWithProduction) => {
    const atw = avlToWork(o);
    const packedCount = o.stageTotals["Packed"] || 0;
    return (o.stageTotals["Cutting"] || 0) > 0 && packedCount === 0;
  };

  const isPartiallyPacked = (o: OrderWithProduction) => {
    const atw = avlToWork(o);
    const packedCount = o.stageTotals["Packed"] || 0;
    return packedCount > 0 && packedCount < atw;
  };

  const isCompletelyPacked = (o: OrderWithProduction) => {
    const atw = avlToWork(o);
    const packedCount = o.stageTotals["Packed"] || 0;
    return atw > 0 && packedCount >= atw;
  };

  const getFilteredOrders = (tab: string) => {
    switch (tab) {
      case "ready": return orders.filter(isReadyForProduction);
      case "in_production": return orders.filter(isInProduction);
      case "partially_packed": return orders.filter(isPartiallyPacked);
      case "completely_packed": return orders.filter(isCompletelyPacked);
      default: return orders.filter(o => o.approval_for_production === "Approved" && o.design_released_windows > 0);
    }
  };

  const handleExport = (activeTab: string) => {
    const list = getFilteredOrders(activeTab);
    const headers = ["Order", "Owner", "Quote No", "SO No", "Windows", "ATW", ...STAGES, "Progress %"];
    const data = list.map(o => ({
      "Order": o.order_name,
      "Owner": o.dealer_name,
      "Quote No": o.quote_no || "",
      "SO No": o.sales_order_no || "",
      "Windows": o.total_windows,
      "ATW": avlToWork(o),
      "Cutting": o.stageTotals["Cutting"] || 0,
      "Assembly": o.stageTotals["Assembly"] || 0,
      "Glazing": o.stageTotals["Glazing"] || 0,
      "Quality": o.stageTotals["Quality"] || 0,
      "Packed": o.stageTotals["Packed"] || 0,
      "Progress %": overallProgress(o)
    }));
    exportDataToExcel(data, headers, `production_export_${activeTab}.xlsx`);
  };

  const renderTable = (list: OrderWithProduction[]) => (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order</TableHead>
            <TableHead>Quote No</TableHead>
            <TableHead>SO No</TableHead>
            <TableHead className="text-right">Windows</TableHead>
            <TableHead className="text-right">Avl to Work</TableHead>
            <TableHead className="min-w-[140px]">Materials</TableHead>
            {STAGES.map((s) => (
              <TableHead key={s} className="text-center">{s}</TableHead>
            ))}
            <TableHead className="w-32">Progress</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow><TableCell colSpan={6 + STAGES.length + 2} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
          ) : list.length === 0 ? (
            <TableRow><TableCell colSpan={6 + STAGES.length + 2} className="text-center py-8 text-muted-foreground">No orders</TableCell></TableRow>
          ) : (
            list.map((order) => {
              const atw = avlToWork(order);
              const progress = overallProgress(order);
              return (
                <TableRow key={order.id}>
                  <TableCell>
                    <Link to={`/orders/${order.id}`} className="font-medium text-primary hover:underline">
                      {order.order_name}
                    </Link>
                    <div className="text-xs text-muted-foreground">{order.dealer_name}</div>
                  </TableCell>
                  <TableCell className="text-sm">{order.quote_no || "—"}</TableCell>
                  <TableCell className="text-sm">{order.sales_order_no || "—"}</TableCell>
                  <TableCell className="text-right font-medium">{order.total_windows}</TableCell>
                  <TableCell className="text-right">{atw}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5 min-w-[130px] text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Hdw:</span>
                        <span className={order.hardware_availability === "In Stock / Available" || order.hardware_availability === "Not Required" ? "text-green-600 font-medium" : order.hardware_availability === "Partially Available" || order.hardware_availability === "PO Placed" ? "text-amber-600 font-medium" : "text-red-500"}>
                          {order.hardware_availability}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis mr-2">Ext:</span>
                        <span className={order.extrusion_availability === "In Stock / Available" || order.extrusion_availability === "Not Required" ? "text-green-600 font-medium" : order.extrusion_availability === "Partially Available" || order.extrusion_availability === "PO Placed" ? "text-amber-600 font-medium whitespace-nowrap text-ellipsis overflow-hidden text-right" : "text-red-500 whitespace-nowrap text-ellipsis overflow-hidden text-right"} title={order.extrusion_availability}>
                          {order.extrusion_availability}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis mr-2">Gls:</span>
                        <span className={order.glass_availability === "In Stock / Available" || order.glass_availability === "Not Required" ? "text-green-600 font-medium" : order.glass_availability === "Partially Available" || order.glass_availability === "PO Placed" ? "text-amber-600 font-medium whitespace-nowrap text-ellipsis overflow-hidden text-right" : "text-red-500 whitespace-nowrap text-ellipsis overflow-hidden text-right"} title={order.glass_availability}>
                          {order.glass_availability}
                        </span>
                      </div>
                      <div className="flex justify-between mt-[1px]">
                        <span className="text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis mr-1">Coat:</span>
                        <span className={order.coated_extrusion_availability === "In Stock / Available" || order.coated_extrusion_availability === "Not Required" ? "text-green-600 font-medium max-w-[80px] whitespace-nowrap text-ellipsis overflow-hidden text-right inline-block" : order.coated_extrusion_availability === "Partially Available" || order.coated_extrusion_availability === "Sent to Coating" ? "text-amber-600 font-medium max-w-[80px] whitespace-nowrap text-ellipsis overflow-hidden text-right inline-block" : "text-red-500 max-w-[80px] whitespace-nowrap text-ellipsis overflow-hidden text-right inline-block"} title={order.coated_extrusion_availability}>
                          {order.coated_extrusion_availability}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  {STAGES.map((s) => (
                    <TableCell key={s} className="text-center">
                      <span className={(order.stageTotals[s] || 0) >= atw && atw > 0 ? "text-green-600 font-medium" : ""}>
                        {order.stageTotals[s] || 0}
                      </span>
                    </TableCell>
                  ))}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={progress} className="h-2 flex-1" />
                      <span className="text-xs text-muted-foreground w-8">{progress}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Production Dashboard</h1>
          <p className="text-sm text-muted-foreground">{orders.filter(o => o.approval_for_production === "Approved" && o.design_released_windows > 0).length} orders in production pipeline</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {STAGES.map((stage) => {
          const allOrders = orders.filter(o => o.approval_for_production === "Approved" && o.design_released_windows > 0);
          const totalCompleted = allOrders.reduce((sum, o) => sum + (o.stageTotals[stage] || 0), 0);
          const totalAtw = allOrders.reduce((sum, o) => sum + avlToWork(o), 0);
          return (
            <Card key={stage}>
              <CardContent className="pt-4 pb-3 px-4">
                <p className="text-xs text-muted-foreground">{stage}</p>
                <p className="text-lg font-semibold">{totalCompleted} / {totalAtw}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="all">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="ready">Ready for Production</TabsTrigger>
            <TabsTrigger value="in_production">In Production</TabsTrigger>
            <TabsTrigger value="partially_packed">Partially Packed</TabsTrigger>
            <TabsTrigger value="completely_packed">Completely Packed</TabsTrigger>
            <TabsTrigger value="all">All Orders</TabsTrigger>
          </TabsList>
          <TabsContent value="ready" className="m-0">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleExport("ready")}>
              <Download className="h-4 w-4" /> Export
            </Button>
          </TabsContent>
          <TabsContent value="in_production" className="m-0">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleExport("in_production")}>
              <Download className="h-4 w-4" /> Export
            </Button>
          </TabsContent>
          <TabsContent value="partially_packed" className="m-0">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleExport("partially_packed")}>
              <Download className="h-4 w-4" /> Export
            </Button>
          </TabsContent>
          <TabsContent value="completely_packed" className="m-0">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleExport("completely_packed")}>
              <Download className="h-4 w-4" /> Export
            </Button>
          </TabsContent>
          <TabsContent value="all" className="m-0">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleExport("all")}>
              <Download className="h-4 w-4" /> Export
            </Button>
          </TabsContent>
        </div>
        <TabsContent value="ready" className="mt-0">{renderTable(getFilteredOrders("ready"))}</TabsContent>
        <TabsContent value="in_production" className="mt-0">{renderTable(getFilteredOrders("in_production"))}</TabsContent>
        <TabsContent value="partially_packed" className="mt-0">{renderTable(getFilteredOrders("partially_packed"))}</TabsContent>
        <TabsContent value="completely_packed" className="mt-0">{renderTable(getFilteredOrders("completely_packed"))}</TabsContent>
        <TabsContent value="all" className="mt-0">{renderTable(getFilteredOrders("all"))}</TabsContent>
      </Tabs>
    </div>
  );
}
