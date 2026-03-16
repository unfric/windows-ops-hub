import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Search, Filter, X, Download, Layout, Loader2 } from "lucide-react";
import { useAggregatedOrders } from "@/hooks/useAggregatedOrders";
import { useSettingsOptions } from "@/hooks/useSettingsOptions";
import { PageHeader, PageWrapper } from "@/components/shared/DashboardComponents";
import { exportDataToExcel } from "@/lib/excelUtils";
import { cn } from "@/lib/utils";
import { AggregatedOrder } from "@/lib/order-logic";

const STAGES = ["Cutting", "Assembly", "Glazing", "Quality", "Packed"] as const;

export default function ProductionDashboard() {
  const { aggregated: orders, loading, stagesMap } = useAggregatedOrders();
  const { settings } = useSettingsOptions();
  
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [filters, setFilters] = useState({ salesperson: "", orderOwner: "" });

  const salespersons = settings?.salespersons?.map((s) => s.name) || [];
  const owners = [...new Set(orders.map((o) => o.dealer_name).filter(Boolean))].sort();

  const activeOrders = orders.filter(o => o.approval_for_production === "Approved" && o.atw > 0);

  const overallProgress = (o: AggregatedOrder) => {
    if (!o.atw) return 0;
    const orderStages = stagesMap[o.id] || { "Cutting": 0, "Assembly": 0, "Glazing": 0, "Quality": 0, "Packed": 0 };
    const cutting = Math.min(100, (orderStages["Cutting"] / o.atw) * 100);
    const assembly = Math.min(100, (orderStages["Assembly"] / o.atw) * 100);
    const glazing = Math.min(100, (orderStages["Glazing"] / o.atw) * 100);
    const quality = Math.min(100, (orderStages["Quality"] / o.atw) * 100);
    const packed = Math.min(100, (orderStages["Packed"] / o.atw) * 100);
    return Math.round((cutting + assembly + glazing + quality + packed) / 5);
  };

  const getFiltered = (tabValue: string) => {
    let list = activeOrders;
    switch (tabValue) {
      case "ready": list = activeOrders.filter(o => o.productionPacked === 0); break;
      case "in_production": list = activeOrders.filter(o => o.productionPacked > 0 && o.productionPacked < o.atw); break;
      case "completely_packed": list = activeOrders.filter(o => o.productionPacked >= o.atw && o.atw > 0); break;
    }
    
    return list.filter((o) => {
      if (search) {
        const s = search.toLowerCase();
        if (!o.order_name.toLowerCase().includes(s) &&
          !o.dealer_name.toLowerCase().includes(s) &&
          !(o.quote_no || "").toLowerCase().includes(s)) return false;
      }
      if (filters.salesperson && o.salesperson !== filters.salesperson) return false;
      if (filters.orderOwner && o.dealer_name !== filters.orderOwner) return false;
      return true;
    });
  };

  const filtered = getFiltered(tab);
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const handleExport = () => {
    const headers = ["Order", "Owner", "Quote No", "SO No", "Windows", "ATW", "Packed", "Progress %"];
    const data = filtered.map(o => ({
      "Order": o.order_name,
      "Owner": o.dealer_name,
      "Quote No": o.quote_no || "",
      "SO No": o.sales_order_no || "",
      "Windows": o.total_windows,
      "ATW": o.atw,
      "Packed": o.productionPacked,
      "Progress %": overallProgress(o)
    }));
    exportDataToExcel(data, headers, `production_export_${tab}.xlsx`);
  };

  return (
    <PageWrapper title="Production Pipeline">
      <PageHeader 
        title="Forge Matrix" 
        subtitle={`${activeOrders.length} BATCHES UNDER FABRICATION`}
        icon={Layout}
      >
        <Button variant="outline" size="sm" className="h-10 text-[10px] font-black uppercase tracking-[0.1em] rounded-xl border-slate-200" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" /> Export Line Report
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <MetricCard label="ACTIVE BATCHES" value={activeOrders.length} />
        <MetricCard label="TOTAL UNITS ATW" value={activeOrders.reduce((sum, o) => sum + o.atw, 0)} />
        <MetricCard label="STATIONARY WIP" value={activeOrders.filter(o => o.productionPacked > 0 && o.productionPacked < o.atw).length} highlight="blue" />
        <MetricCard label="CERTIFIED READY" value={activeOrders.filter(o => o.productionPacked >= o.atw && o.atw > 0).length} highlight="emerald" />
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
         <Tabs value={tab} onValueChange={setTab} className="w-full lg:w-auto">
            <TabsList className="bg-slate-100/50 p-1 h-11 rounded-2xl border border-slate-200/50">
              <TabsTrigger value="all" className="rounded-xl px-4 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Global</TabsTrigger>
              <TabsTrigger value="ready" className="rounded-xl px-4 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Awaiting</TabsTrigger>
              <TabsTrigger value="in_production" className="rounded-xl px-4 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">In Motion</TabsTrigger>
              <TabsTrigger value="completely_packed" className="rounded-xl px-4 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Finalized</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-4 top-3 h-4 w-4 text-slate-300" />
              <Input 
                 placeholder="SCAN FABRICATION LOGS..." 
                 className="pl-12 h-11 bg-white border-slate-200 rounded-2xl text-[11px] font-bold uppercase tracking-widest shadow-sm focus-visible:ring-primary/20" 
                 value={search} 
                 onChange={(e) => setSearch(e.target.value)} 
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-11 px-4 gap-2 rounded-2xl border-slate-200 bg-white shadow-sm text-[10px] font-black uppercase tracking-widest">
                  <Filter className="h-4 w-4 text-slate-400" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] rounded-full bg-primary text-white border-none">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-5 rounded-3xl shadow-2xl border-none bg-white/95 backdrop-blur-xl" align="end">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">Filter Protocols</span>
                  {activeFilterCount > 0 && (
                    <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold uppercase tracking-widest text-primary" onClick={() => setFilters({ salesperson: "", orderOwner: "" })}>
                      <X className="h-3 w-3 mr-1" /> Purge All
                    </Button>
                  )}
                </div>
                <div className="space-y-4">
                  <FilterSelect label="SALESFORCE" value={filters.salesperson} options={salespersons} onChange={(v) => setFilters({ ...filters, salesperson: v })} />
                  <FilterSelect label="CLIENT/ENTITY" value={filters.orderOwner} options={owners} onChange={(v) => setFilters({ ...filters, orderOwner: v })} />
                </div>
              </PopoverContent>
            </Popover>
          </div>
      </div>

      <div className="rounded-[32px] border border-slate-200 bg-white/60 backdrop-blur-md shadow-xl shadow-slate-200/40 overflow-hidden group/table">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-slate-100 hover:bg-transparent">
                <TableHead className="py-5 px-6 font-black text-[10px] uppercase tracking-widest text-slate-400">Reference</TableHead>
                <TableHead className="py-5 font-black text-[10px] uppercase tracking-widest text-slate-900">Project Entity</TableHead>
                <TableHead className="py-5 font-black text-[10px] uppercase tracking-widest text-slate-400">ATW Units</TableHead>
                <TableHead className="py-5 font-black text-[10px] uppercase tracking-widest text-slate-400">Finalized</TableHead>
                <TableHead className="py-5 font-black text-[10px] uppercase tracking-widest text-slate-400 text-right px-6">Fabrication State</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-32">
                     <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">Synchronizing Fabrication Stream...</p>
                     </div>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-32">
                     <div className="flex flex-col items-center gap-4 opacity-50">
                        <Layout className="h-12 w-12 text-slate-200" />
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No fabrication protocols active</p>
                     </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((o) => {
                  const progress = overallProgress(o);
                  const orderStages = stagesMap[o.id] || {};
                  return (
                    <TableRow key={o.id} className="group/row hover:bg-slate-50/80 transition-all border-slate-100 h-24">
                      <TableCell className="px-6">
                         <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] font-black text-slate-900 leading-none">Q: {o.quote_no || "N/A"}</span>
                            <span className="text-[9px] font-bold text-slate-400">SO: {o.sales_order_no || "PENDING"}</span>
                         </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col max-w-[200px]">
                          <Link to={`/orders/${o.id}`} className="font-bold text-slate-900 hover:text-primary transition-colors truncate">{o.order_name}</Link>
                          <div className="flex items-center gap-2 mt-1">
                             <Badge variant="outline" className="text-[8px] font-black uppercase py-0 px-1 border-slate-200 bg-white text-slate-500">{o.salesperson}</Badge>
                             <span className="text-[10px] text-slate-400 font-medium truncate">{o.dealer_name}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                         <div className="flex flex-col">
                            <span className="text-[14px] font-black text-slate-900">{o.atw}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">UNITS</span>
                         </div>
                      </TableCell>
                      <TableCell>
                         <div className="flex flex-col gap-1.5">
                            <span className={cn("text-[14px] font-black", o.productionPacked >= o.atw && o.atw > 0 ? "text-emerald-600" : "text-slate-900")}>
                               {o.productionPacked}
                            </span>
                            <div className="flex gap-0.5">
                              {STAGES.map(s => (
                                <div 
                                  key={s} 
                                  title={`${s}: ${orderStages[s] || 0}`}
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full ring-1 ring-white",
                                    (orderStages[s] || 0) >= o.atw ? "bg-emerald-500" : (orderStages[s] || 0) > 0 ? "bg-blue-400" : "bg-slate-100"
                                  )} 
                                />
                              ))}
                            </div>
                         </div>
                      </TableCell>
                      <TableCell className="px-6 text-right">
                         <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-3 w-[140px]">
                               <Progress value={progress} className="h-1.5 flex-1 bg-slate-100" />
                               <span className="text-[10px] font-black text-slate-900 w-8">{progress}%</span>
                            </div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Synchronization</span>
                         </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </PageWrapper>
  );
}

function MetricCard({ label, value, highlight }: { label: string; value: number; highlight?: "blue" | "emerald" }) {
  return (
    <Card className="border-none shadow-sm ring-1 ring-slate-200 rounded-[24px] bg-white/50 backdrop-blur-sm overflow-hidden group hover:ring-primary/20 transition-all">
      <CardContent className="pt-6">
        <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1 group-hover:text-primary transition-colors">{label}</p>
        <p className={cn("text-3xl font-black transition-all", 
          highlight === "blue" ? "text-blue-600" : 
          highlight === "emerald" ? "text-emerald-600" : 
          "text-slate-900"
        )}>{value}</p>
      </CardContent>
    </Card>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      <Select value={value || "all"} onValueChange={(v) => onChange(v === "all" ? "" : v)}>
        <SelectTrigger className="h-11 bg-slate-50 border-none rounded-2xl text-[11px] font-bold uppercase tracking-wider shadow-inner">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="rounded-2xl border-none shadow-2xl">
          <SelectItem value="all" className="text-[11px] font-bold uppercase">All Records</SelectItem>
          {options.map((o) => (
            <SelectItem key={o} value={o} className="text-[11px] font-bold uppercase">{o}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
