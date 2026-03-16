
import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Download, Layout } from "lucide-react";
import { cn } from "@/lib/utils";
import { exportDataToExcel } from "@/lib/excelUtils";
import { useAggregatedOrders } from "@/hooks/useAggregatedOrders";
import { AggregatedOrder } from "@/lib/order-logic";
import { SectionHeader } from "@/components/shared/DashboardComponents";

const STAGES = ["Cutting", "Assembly", "Glazing", "Quality", "Packed"] as const;

export default function ProductionDashboard() {
  const { aggregated, loading, stagesMap } = useAggregatedOrders();

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading production pipeline...</div>;

  const activeOrders = aggregated.filter(o => o.approval_for_production === "Approved" && o.atw > 0);

  const isReady = (o: AggregatedOrder) => o.productionPacked === 0 && o.atw > 0;
  const isInProd = (o: AggregatedOrder) => o.productionPacked < o.atw && o.productionPacked === 0 && o.designReleased > 0; // Simplified
  // Actually, use the original logic but adapted
  const isInProduction = (o: AggregatedOrder) => {
    // Basic heuristics: something happened but not packed
    return o.productionPacked === 0 && o.atw > 0; // Placeholder correction below
  };

  const overallProgress = (o: AggregatedOrder) => {
    if (!o.atw) return 0;
    const orderStages = stagesMap[o.id] || { "Cutting": 0, "Assembly": 0, "Glazing": 0, "Quality": 0, "Packed": 0 };
    // Average progress across stages: each stage has equal weight (20%)
    const cutting = Math.min(100, (orderStages["Cutting"] / o.atw) * 100);
    const assembly = Math.min(100, (orderStages["Assembly"] / o.atw) * 100);
    const glazing = Math.min(100, (orderStages["Glazing"] / o.atw) * 100);
    const quality = Math.min(100, (orderStages["Quality"] / o.atw) * 100);
    const packed = Math.min(100, (orderStages["Packed"] / o.atw) * 100);
    
    return Math.round((cutting + assembly + glazing + quality + packed) / 5);
  };

  const getFilteredOrders = (tab: string) => {
    switch (tab) {
      case "ready": return activeOrders.filter(o => o.productionPacked === 0);
      case "in_production": return activeOrders.filter(o => o.productionPacked > 0 && o.productionPacked < o.atw);
      case "completely_packed": return activeOrders.filter(o => o.productionPacked >= o.atw && o.atw > 0);
      default: return activeOrders;
    }
  };

  const handleExport = (activeTab: string) => {
    const list = getFilteredOrders(activeTab);
    const headers = ["Order", "Owner", "Quote No", "SO No", "Windows", "ATW", "Packed", "Progress %"];
    const data = list.map(o => ({
      "Order": o.order_name,
      "Owner": o.dealer_name,
      "Quote No": o.quote_no || "",
      "SO No": o.sales_order_no || "",
      "Windows": o.total_windows,
      "ATW": o.atw,
      "Packed": o.productionPacked,
      "Progress %": overallProgress(o)
    }));
    exportDataToExcel(data, headers, `production_export_${activeTab}.xlsx`);
  };

  const renderTable = (list: AggregatedOrder[]) => (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <Table>
        <TableHeader className="bg-slate-50/50">
          <TableRow>
            <TableHead className="text-[10px] font-black uppercase tracking-wider">Order</TableHead>
            <TableHead className="text-right text-[10px] font-black uppercase tracking-wider">Windows</TableHead>
            <TableHead className="text-right text-[10px] font-black uppercase tracking-wider">ATW</TableHead>
            <TableHead className="text-right text-[10px] font-black uppercase tracking-wider">Packed</TableHead>
            <TableHead className="w-48 text-[10px] font-black uppercase tracking-wider">Progress</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="text-center py-12 text-slate-400 italic">No orders found in this category</TableCell></TableRow>
          ) : (
            list.map((o) => {
              const progress = overallProgress(o);
              const orderStages = stagesMap[o.id] || {};
              return (
                <TableRow key={o.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell>
                    <Link to={`/orders/${o.id}`} className="font-bold text-slate-900 hover:text-primary transition-colors">
                      {o.order_name}
                    </Link>
                    <div className="text-[10px] text-slate-400 font-medium">{o.dealer_name}</div>
                  </TableCell>
                  <TableCell className="text-right font-medium">{o.total_windows}</TableCell>
                  <TableCell className="text-right font-bold text-slate-600">{o.atw}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end gap-1">
                      <span className={o.productionPacked >= o.atw && o.atw > 0 ? "text-emerald-600 font-black" : "font-bold"}>
                        {o.productionPacked}
                      </span>
                      <div className="flex gap-0.5">
                        {STAGES.map(s => (
                          <div 
                            key={s} 
                            title={`${s}: ${orderStages[s] || 0}`}
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              (orderStages[s] || 0) >= o.atw ? "bg-emerald-500" : (orderStages[s] || 0) > 0 ? "bg-blue-400" : "bg-slate-200"
                            )} 
                          />
                        ))}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Progress value={progress} className="h-1.5 flex-1 bg-slate-100" />
                      <span className="text-[10px] font-black text-slate-500 w-8">{progress}%</span>
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
    <div className="p-8 max-w-[1600px] mx-auto space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <SectionHeader title="Production Line" icon={Layout} />
          <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] pl-14">
            {activeOrders.length} Orders in active pipeline
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardContent className="pt-6">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Active Batches</p>
            <p className="text-3xl font-black text-slate-900">{activeOrders.length}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardContent className="pt-6">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Total ATW</p>
            <p className="text-3xl font-black text-slate-900">
              {activeOrders.reduce((sum, o) => sum + o.atw, 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardContent className="pt-6">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Ready for Dispatch</p>
            <p className="text-3xl font-black text-emerald-600">
              {activeOrders.filter(o => o.productionPacked >= o.atw && o.atw > 0).length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardContent className="pt-6">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Production WIP</p>
            <p className="text-3xl font-black text-blue-600">
              {activeOrders.filter(o => o.productionPacked > 0 && o.productionPacked < o.atw).length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <TabsList className="bg-slate-100/50 p-1 rounded-xl">
            <TabsTrigger value="all" className="rounded-lg text-xs font-bold uppercase py-2 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">All Batches</TabsTrigger>
            <TabsTrigger value="ready" className="rounded-lg text-xs font-bold uppercase py-2 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">Awaiting Start</TabsTrigger>
            <TabsTrigger value="in_production" className="rounded-lg text-xs font-bold uppercase py-2 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">In Progress</TabsTrigger>
            <TabsTrigger value="completely_packed" className="rounded-lg text-xs font-bold uppercase py-2 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">Finished</TabsTrigger>
          </TabsList>
          
          <Button variant="outline" size="sm" className="rounded-xl font-bold uppercase tracking-tight text-[10px] gap-2 border-2" onClick={() => handleExport("all")}>
            <Download className="h-3 w-3" /> Export Line Report
          </Button>
        </div>

        <TabsContent value="all">{renderTable(getFilteredOrders("all"))}</TabsContent>
        <TabsContent value="ready">{renderTable(getFilteredOrders("ready"))}</TabsContent>
        <TabsContent value="in_production">{renderTable(getFilteredOrders("in_production"))}</TabsContent>
        <TabsContent value="completely_packed">{renderTable(getFilteredOrders("completely_packed"))}</TabsContent>
      </Tabs>
    </div>
  );
}
