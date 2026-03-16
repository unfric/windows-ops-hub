import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
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
import { Search, Filter, X, Download, Landmark, Loader2 } from "lucide-react";
import { useAggregatedOrders } from "@/hooks/useAggregatedOrders";
import { useSettingsOptions } from "@/hooks/useSettingsOptions";
import { PageHeader, PageWrapper, StatusDot } from "@/components/shared/DashboardComponents";
import { exportDataToExcel } from "@/lib/excelUtils";
import { cn } from "@/lib/utils";

export default function FinancePage() {
  const { aggregated: orders, loading, rawLogs } = useAggregatedOrders();
  const { settings } = useSettingsOptions();
  
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("pending");
  const [filters, setFilters] = useState({ salesperson: "", orderOwner: "", approvalProduction: "", approvalDispatch: "" });

  const salespersons = settings?.salespersons?.map((s) => s.name) || [];
  const owners = [...new Set(orders.map((o) => o.dealer_name).filter(Boolean))].sort();

  // Compute draft payment status
  const draftOrderIds = new Set(
    (rawLogs?.payment_logs || [])
      .filter((l: any) => l.status === "Draft")
      .map((l: any) => l.order_id)
  );

  const approvalColor = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "approved") return "text-emerald-600 font-bold";
    if (s === "hold") return "text-amber-600";
    return "text-slate-400";
  };

  const tabFiltered = orders.filter((o) => {
    if (tab === "pending") {
      return o.approval_for_production === "Pending" ||
        o.approval_for_dispatch === "Pending" ||
        draftOrderIds.has(o.id);
    }
    if (tab === "production") return o.approval_for_production === "Approved";
    if (tab === "dispatch") return o.approval_for_dispatch === "Approved";
    return true;
  });

  const filtered = tabFiltered.filter((o) => {
    if (search) {
      const s = search.toLowerCase();
      const matches = o.order_name.toLowerCase().includes(s) ||
        o.dealer_name.toLowerCase().includes(s) ||
        (o.quote_no || "").toLowerCase().includes(s);
      if (!matches) return false;
    }
    if (filters.salesperson && o.salesperson !== filters.salesperson) return false;
    if (filters.orderOwner && o.dealer_name !== filters.orderOwner) return false;
    if (filters.approvalProduction && o.approval_for_production !== filters.approvalProduction) return false;
    if (filters.approvalDispatch && o.approval_for_dispatch !== filters.approvalDispatch) return false;
    return true;
  });

  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const totalOutstanding = orders.reduce((acc, o) => acc + o.balance, 0);

  const handleExport = () => {
    const headers = ["Order", "Owner", "Salesperson", "Order Value", "Receipt", "Balance", "Prod Appr", "Disp Appr", "Dispatch Status", "Comm Status"];
    const data = filtered.map(o => ({
      "Order": o.order_name,
      "Owner": o.dealer_name,
      "Salesperson": o.salesperson || "",
      "Order Value": o.order_value,
      "Receipt": o.receipt,
      "Balance": o.balance,
      "Prod Appr": o.approval_for_production,
      "Disp Appr": o.approval_for_dispatch,
      "Dispatch Status": (o as any).dispatchLabel || "Unknown",
      "Comm Status": o.commercial_status
    }));
    exportDataToExcel(data, headers, `finance_export_${tab}.xlsx`);
  };

  return (
    <PageWrapper title="Financial Control">
      <PageHeader 
        title="Fiscal Terminal" 
        subtitle={`TOTAL RECEIVABLES: ₹${(totalOutstanding / 10000000).toFixed(2)} CR`}
        icon={Landmark}
      >
        <Button variant="outline" size="sm" className="h-10 text-[10px] font-black uppercase tracking-[0.1em] rounded-xl border-slate-200" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" /> Export Ledger
        </Button>
      </PageHeader>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
         <Tabs value={tab} onValueChange={setTab} className="w-full lg:w-auto">
            <TabsList className="bg-slate-100/50 p-1 h-11 rounded-2xl border border-slate-200/50">
              <TabsTrigger value="pending" className="rounded-xl px-4 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Pending</TabsTrigger>
              <TabsTrigger value="production" className="rounded-xl px-4 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Production</TabsTrigger>
              <TabsTrigger value="dispatch" className="rounded-xl px-4 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Dispatch</TabsTrigger>
              <TabsTrigger value="all" className="rounded-xl px-4 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Global</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-4 top-3 h-4 w-4 text-slate-300" />
              <Input 
                 placeholder="SCAN FINANCIAL RECORDS..." 
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
                    <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold uppercase tracking-widest text-primary" onClick={() => setFilters({ salesperson: "", orderOwner: "", approvalProduction: "", approvalDispatch: "" })}>
                      <X className="h-3 w-3 mr-1" /> Purge All
                    </Button>
                  )}
                </div>
                <div className="space-y-4">
                  <FilterSelect label="SALESFORCE" value={filters.salesperson} options={salespersons} onChange={(v) => setFilters({ ...filters, salesperson: v })} />
                  <FilterSelect label="CLIENT/ENTITY" value={filters.orderOwner} options={owners} onChange={(v) => setFilters({ ...filters, orderOwner: v })} />
                  <FilterSelect label="PROD GATE" value={filters.approvalProduction} options={["Pending", "Approved", "Hold"]} onChange={(v) => setFilters({ ...filters, approvalProduction: v })} />
                  <FilterSelect label="DISP GATE" value={filters.approvalDispatch} options={["Pending", "Approved", "Hold"]} onChange={(v) => setFilters({ ...filters, approvalDispatch: v })} />
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
                <TableHead className="py-5 font-black text-[10px] uppercase tracking-widest text-slate-400">Ledger Status</TableHead>
                <TableHead className="py-5 font-black text-[10px] uppercase tracking-widest text-slate-400">Auth Matrix</TableHead>
                <TableHead className="py-5 font-black text-[10px] uppercase tracking-widest text-slate-400">Operational State</TableHead>
                <TableHead className="py-5 font-black text-[10px] uppercase tracking-widest text-slate-400 text-right px-6">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-32">
                     <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">Synchronizing Financial Stream...</p>
                     </div>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-32">
                     <div className="flex flex-col items-center gap-4 opacity-50">
                        <Landmark className="h-12 w-12 text-slate-200" />
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No financial audits required</p>
                     </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((o) => (
                  <TableRow key={o.id} className="group/row hover:bg-slate-50/80 transition-all border-slate-100 h-20">
                    <TableCell className="px-6">
                       <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-black text-slate-900 leading-none">Q: {o.quote_no || "N/A"}</span>
                          <span className="text-[9px] font-bold text-slate-400">SO: {o.sales_order_no || "PENDING"}</span>
                       </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col max-w-[240px]">
                        <Link to={`/orders/${o.id}`} className="font-bold text-slate-900 hover:text-primary transition-colors truncate">{o.order_name}</Link>
                        <div className="flex items-center gap-2 mt-1">
                           <Badge variant="outline" className="text-[8px] font-black uppercase py-0 px-1 border-slate-200 bg-white text-slate-500">{o.salesperson}</Badge>
                           <span className="text-[10px] text-slate-400 font-medium truncate">{o.dealer_name}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                       <div className="flex flex-col">
                          <div className="flex items-baseline gap-2">
                             <span className="text-[11px] font-bold text-slate-900">₹{o.receipt.toLocaleString()}</span>
                             <span className="text-[9px] font-black text-slate-300 uppercase">/ ₹{Number(o.order_value).toLocaleString()}</span>
                          </div>
                          <span className={cn("text-[9px] font-black uppercase", o.balance > 0 ? "text-red-500" : "text-emerald-600")}>
                            {o.balance > 0 ? `Outstanding: ₹${o.balance.toLocaleString()}` : "Settled"}
                          </span>
                       </div>
                    </TableCell>
                    <TableCell>
                       <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                             <StatusDot status={o.approval_for_production === "Approved" ? "green" : o.approval_for_production === "Hold" ? "amber" : "grey"} />
                             <span className={approvalColor(o.approval_for_production)}>PROD: {o.approval_for_production}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                             <StatusDot status={o.approval_for_dispatch === "Approved" ? "green" : o.approval_for_dispatch === "Hold" ? "amber" : "grey"} />
                             <span className={approvalColor(o.approval_for_dispatch)}>DISP: {o.approval_for_dispatch}</span>
                          </div>
                       </div>
                    </TableCell>
                    <TableCell>
                       <div className="flex flex-col gap-1">
                          <Badge variant="outline" className={cn("text-[8px] font-black uppercase py-0.5 px-2 w-fit", 
                            (o as any).dispatchLabel === "Fully Dispatched" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : 
                            (o as any).dispatchLabel === "Partially Dispatched" ? "bg-amber-50 text-amber-700 border-amber-200" : 
                            "bg-slate-50 text-slate-400 border-slate-100")}>
                            {(o as any).dispatchLabel || "STATIONARY"}
                          </Badge>
                          {draftOrderIds.has(o.id) && (
                            <div className="flex items-center gap-1.5 animate-pulse">
                               <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                               <span className="text-[9px] font-black text-amber-600 uppercase">Draft Payments Detected</span>
                            </div>
                          )}
                       </div>
                    </TableCell>
                    <TableCell className="px-6 text-right">
                       <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{o.commercial_status}</span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </PageWrapper>
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
