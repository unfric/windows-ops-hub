import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, Plus } from "lucide-react";
import { toast } from "sonner";
import { exportDataToExcel } from "@/lib/excelUtils";
import DataTableLayout from "@/components/ui/data-table-layout";
import { cn } from "@/lib/utils";

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
  order_date: string | null;
  tat_date: string | null;
  target_delivery_date: string | null;
  dispatch_date: string | null;
  stageTotals: Record<string, number>;
}

export default function ProductionDashboard() {
  const [orders, setOrders] = useState<OrderWithProduction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await api.orders.list();
        if (!data.orders) { setLoading(false); return; }

        const logs = (data.production_logs || []) as any[];
        const logMap: Record<string, Record<string, number>> = {};
        logs.forEach((l: any) => {
          if (!logMap[l.order_id]) logMap[l.order_id] = {};
          logMap[l.order_id][l.stage] = (logMap[l.order_id][l.stage] || 0) + l.windows_completed;
        });

        const mapped: OrderWithProduction[] = (data.orders as any[]).map((o) => ({
          ...o,
          stageTotals: logMap[o.id] || {},
        }));

        setOrders(mapped);
      } catch (err: any) {
        toast.error("Failed to load production data");
      } finally {
        setLoading(false);
      }
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
    const headers = [
      "Order", "Owner", "Quote No", "SO No", "Salesperson",
      "Order Date", "TAT Date", "Target Delv", "Disp Date",
      "Windows", "ATW", ...STAGES, "Progress %"
    ];
    const data = list.map(o => ({
      "Order": o.order_name,
      "Owner": o.dealer_name,
      "Quote No": o.quote_no || "",
      "SO No": o.sales_order_no || "",
      "Salesperson": o.salesperson || "",
      "Order Date": o.order_date || "",
      "TAT Date": o.tat_date || "",
      "Target Delv": o.target_delivery_date || "",
      "Disp Date": o.dispatch_date || "",
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

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [filters, setFilters] = useState({ salesperson: "", orderOwner: "" });
  const [salespersons, setSalespersons] = useState<string[]>([]);
  const [owners, setOwners] = useState<string[]>([]);

  useEffect(() => {
    if (orders.length > 0) {
      setOwners([...new Set(orders.map(o => o.dealer_name).filter(Boolean))].sort());
      const sp = [...new Set(orders.map(o => o.salesperson).filter(Boolean))].sort();
      setSalespersons(sp);
    }
  }, [orders]);

  const activeTabList = getFilteredOrders(tab);
  
  const filtered = activeTabList.filter((o) => {
    if (search) {
      const s = search.toLowerCase();
      if (!o.order_name.toLowerCase().includes(s) &&
        !o.dealer_name.toLowerCase().includes(s) &&
        !(o.quote_no || "").toLowerCase().includes(s) &&
        !(o.sales_order_no || "").toLowerCase().includes(s)) return false;
    }
    if (filters.salesperson && o.salesperson !== filters.salesperson) return false;
    if (filters.orderOwner && o.dealer_name !== filters.orderOwner) return false;
    return true;
  });

  const activeFilters = Object.entries(filters)
    .filter(([_, v]) => v)
    .map(([k, v]) => ({
      key: k,
      label: k === "orderOwner" ? "Owner" : k.charAt(0).toUpperCase() + k.slice(1),
      value: v
    }));

  const activeFilterCount = activeFilters.length;
  const emptyFilters = { salesperson: "", orderOwner: "" };

  const columns = [
    {
      header: "Project Name",
      accessor: (o: OrderWithProduction) => (
        <div className="flex flex-col">
          <Link to={`/orders/${o.id}`} className="font-medium text-blue-600 hover:underline">{o.order_name}</Link>
          <span className="text-[10px] text-muted-foreground uppercase">{o.order_type}</span>
        </div>
      ),
      className: "min-w-[180px]"
    },
    {
      header: "Order Date",
      accessor: (o: OrderWithProduction) => o.order_date ? new Date(o.order_date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short' }) : "—",
      sortValue: (o: OrderWithProduction) => o.order_date,
      className: "whitespace-nowrap",
    },
    {
      header: "TAT Date",
      accessor: (o: OrderWithProduction) => o.tat_date ? new Date(o.tat_date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short' }) : "—",
      sortValue: (o: OrderWithProduction) => o.tat_date,
      className: "whitespace-nowrap text-blue-600 font-medium",
    },
    {
      header: "Target Delv",
      accessor: (o: OrderWithProduction) => o.target_delivery_date ? new Date(o.target_delivery_date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short' }) : "—",
      sortValue: (o: OrderWithProduction) => o.target_delivery_date,
      className: "whitespace-nowrap",
    },
    {
      header: "Dispatch Date",
      accessor: (o: OrderWithProduction) => o.dispatch_date ? new Date(o.dispatch_date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short' }) : "—",
      sortValue: (o: OrderWithProduction) => o.dispatch_date,
      className: "whitespace-nowrap text-emerald-600 font-medium",
    },
    {
      header: "Managed By",
      accessor: (o: OrderWithProduction) => <span className="text-[#5c6e82]">{o.dealer_name}</span>,
    },
    {
      header: "Quote & SO",
      accessor: (o: OrderWithProduction) => (
        <div className="flex flex-col text-[#5c6e82]">
          <span>{o.quote_no || "—"}</span>
          <span className="text-[10px] text-muted-foreground">{o.sales_order_no || "—"}</span>
        </div>
      ),
    },
    {
      header: "Qty",
      accessor: (o: OrderWithProduction) => <span className="text-[#5c6e82] font-semibold whitespace-nowrap">{avlToWork(o)} / {o.total_windows}</span>,
      className: "whitespace-nowrap",
    },
    {
      header: "Materials Check",
      accessor: (o: OrderWithProduction) => {
        const getStatusColor = (status: string) => {
          if (status === "Delivered" || status === "In Stock / Available" || status === "Not Required") return "text-emerald-600";
          if (status === "PO Placed" || status === "Sent to Coating" || status === "Partially Available") return "text-amber-600";
          return "text-destructive";
        };

        return (
          <div className="flex flex-col gap-0.5 min-w-[140px] text-[10px] uppercase font-semibold">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground w-10 text-[9px]">HDW:</span>
              <span className={getStatusColor(o.hardware_availability)}>{o.hardware_availability || "Pending"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground w-10 text-[9px]">EXT:</span>
              <span className={getStatusColor(o.extrusion_availability)}>{o.extrusion_availability || "Pending"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground w-10 text-[9px]">GLS:</span>
              <span className={getStatusColor(o.glass_availability)}>{o.glass_availability || "Pending"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground w-10 text-[9px]">COT:</span>
              <span className={getStatusColor(o.coated_extrusion_availability)}>{o.coated_extrusion_availability || "Pending"}</span>
            </div>
          </div>
        );
      },
    },
    ...STAGES.map((s) => ({
      header: s,
      accessor: (o: OrderWithProduction) => {
        const atw = avlToWork(o);
        const val = o.stageTotals[s] || 0;
        return <span className={cn("text-[#5c6e82] font-semibold", val >= atw && atw > 0 && "text-emerald-600")}>{val}</span>;
      },
      className: "text-center w-20"
    })),
    {
      header: "Overall",
      accessor: (o: OrderWithProduction) => {
        const progress = overallProgress(o);
        return (
          <div className="flex items-center gap-2 min-w-[80px]">
            <Progress value={progress} className="h-1.5 flex-1" />
            <span className="text-[10px] font-semibold text-muted-foreground w-6">{progress}%</span>
          </div>
        );
      },
    }
  ];

  const tabsConfig = [
    { id: "ready", label: "Ready for Production" },
    { id: "in_production", label: "In Production" },
    { id: "partially_packed", label: "Partially Packed" },
    { id: "completely_packed", label: "Completely Packed" },
    { id: "all", label: "All Orders" },
  ];

  const renderTopRightActions = () => (
    <Button variant="outline" size="sm" className="h-8 text-blue-600 border-blue-200 bg-white gap-1 hover:bg-blue-50/50 -ml-1 mr-2">
      <Plus className="h-4 w-4" /> New Log
    </Button>
  );

  return (
    <div className="flex-1 w-full bg-[#f4f5f7] flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      
      {/* Title & Cards Section */}
      <div className="p-6 pb-2 shrink-0">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Production Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">{orders.filter(o => o.approval_for_production === "Approved" && o.design_released_windows > 0).length} active orders in pipeline</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
          {STAGES.map((stage) => {
            const allOrders = orders.filter(o => o.approval_for_production === "Approved" && o.design_released_windows > 0);
            const totalCompleted = allOrders.reduce((sum, o) => sum + (o.stageTotals[stage] || 0), 0);
            const totalAtw = allOrders.reduce((sum, o) => sum + avlToWork(o), 0);
            return (
              <Card key={stage} className="border-0 shadow-sm bg-white rounded-xl overflow-hidden">
                <CardContent className="p-5 flex flex-col justify-center">
                  <p className="text-xs font-semibold text-[#5c6e82] uppercase mb-1">{stage}</p>
                  <div className="flex items-baseline gap-2 text-slate-900">
                    <span className="text-2xl font-bold tracking-tight">{totalCompleted}</span>
                    <span className="text-sm font-medium text-muted-foreground">/ {totalAtw}</span>
                  </div>
                  <Progress value={totalAtw > 0 ? (totalCompleted / totalAtw) * 100 : 0} className="h-1 mt-3 opacty-50" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Datatable Section */}
      <div className="flex-1 px-6 pb-6 min-h-0 flex flex-col">
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden flex flex-col">
          <DataTableLayout
            moduleName="production"
            tabs={tabsConfig}
            activeTab={tab}
            onTabChange={setTab}
            searchValue={search}
            onSearch={setSearch}
            activeFilterCount={activeFilterCount}
            activeFilters={activeFilters}
            onRemoveFilter={(key) => setFilters(prev => ({ ...prev, [key]: "" }))}
            onClearFilters={() => setFilters(emptyFilters)}
            columns={columns}
            data={filtered}
            getRowId={(o) => o.id}
            onExport={() => handleExport(tab)}
            renderTopRightActions={renderTopRightActions}
            filterChildren={
              <div className="space-y-4">
                <FilterSelect label="Salesperson" value={filters.salesperson} options={salespersons} onChange={(v) => setFilters(p => ({ ...p, salesperson: v }))} />
                <FilterSelect label="Order Owner" value={filters.orderOwner} options={owners} onChange={(v) => setFilters(p => ({ ...p, orderOwner: v }))} />
              </div>
            }
          />
        </div>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground uppercase font-semibold">{label}</label>
      <Select value={value || "all"} onValueChange={(v) => onChange(v === "all" ? "" : v)}>
        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
