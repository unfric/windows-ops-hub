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
import { Search, Filter, X, Plus, Upload, Download, FileSpreadsheet, Pencil, TrendingUp, Loader2 } from "lucide-react";
import { useAggregatedOrders } from "@/hooks/useAggregatedOrders";
import { useSettingsOptions } from "@/hooks/useSettingsOptions";
import { PageHeader, PageWrapper, StatusDot } from "@/components/shared/DashboardComponents";
import { importOrdersFromFile, downloadImportTemplate, exportDataToExcel } from "@/lib/excelUtils";
import CreateOrderDialog from "@/components/CreateOrderDialog";
import EditOrderDialog from "@/components/EditOrderDialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function SalesPage() {
  const { aggregated: orders, loading, refresh } = useAggregatedOrders();
  const { settings } = useSettingsOptions();
  
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("open");
  const [filters, setFilters] = useState({ salesperson: "", orderOwner: "", commercialStatus: "" });

  const [createOpen, setCreateOpen] = useState(false);
  const [editOrderId, setEditOrderId] = useState<string | null>(null);

  const salespersons = settings?.salespersons?.map((s) => s.name) || [];
  const owners = [...new Set(orders.map((o) => o.dealer_name).filter(Boolean))].sort();
  const commercialStatuses = settings?.commercial_statuses?.map((s) => s.name) || [];

  const getFiltered = (tabValue: string) => {
    let list = orders;
    switch (tabValue) {
      case "open":
        list = orders.filter((o) => o.dispatchLabel !== "Fully Dispatched");
        break;
      case "dispatched":
        list = orders.filter((o) => o.dispatchLabel === "Fully Dispatched");
        break;
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
      if (filters.commercialStatus && o.commercial_status !== filters.commercialStatus) return false;
      return true;
    });
  };

  const filtered = getFiltered(tab);
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const totalValue = filtered.reduce((acc, o) => acc + (Number(o.order_value) || 0), 0);

  const handleImport = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx,.xls,.csv";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const result = await importOrdersFromFile(file);
      if (result) {
        toast.success(`Imported: ${result.created} created, ${result.updated} updated`);
        refresh();
      }
    };
    input.click();
  };

  const handleExport = async () => {
    const headers = [
      "Quotation No", "SO No", "Order Name", "Owner", "Salesperson",
      "Product", "Shade", "Win", "Value", "Receipt", "Balance",
      "Commercial Status", "Dispatch Status"
    ];

    const data = filtered.map(o => ({
      "Quotation No": o.quote_no || "",
      "SO No": o.sales_order_no || "",
      "Order Name": o.order_name,
      "Owner": o.dealer_name,
      "Salesperson": o.salesperson || "",
      "Product": o.product_type,
      "Shade": o.colour_shade || "",
      "Win": o.total_windows,
      "Value": o.order_value,
      "Receipt": o.receipt,
      "Balance": o.balance,
      "Commercial Status": o.commercial_status,
      "Dispatch Status": o.dispatchLabel
    }));

    await exportDataToExcel(data, headers, `sales_export_${tab}.xlsx`);
  };

  return (
    <PageWrapper title="Sales & Order Pipeline">
      <PageHeader 
        title="Revenue Hub" 
        subtitle={`MANAGEMENT OF ₹${(totalValue / 1000000).toFixed(2)}M VALUATION ACROSS ${filtered.length} ACTIVE PROJECTS`}
        icon={TrendingUp}
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-10 text-[10px] font-black uppercase tracking-[0.1em] rounded-xl border-slate-200" onClick={async () => await downloadImportTemplate()}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Template
          </Button>
          <Button variant="outline" size="sm" className="h-10 text-[10px] font-black uppercase tracking-[0.1em] rounded-xl border-slate-200" onClick={handleImport}>
            <Upload className="mr-2 h-4 w-4" /> Import
          </Button>
          <Button variant="outline" size="sm" className="h-10 text-[10px] font-black uppercase tracking-[0.1em] rounded-xl border-slate-200" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          <Button size="sm" className="h-10 text-[10px] font-black uppercase tracking-[0.1em] rounded-xl shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Acquisition
          </Button>
        </div>
      </PageHeader>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
         <Tabs value={tab} onValueChange={setTab} className="w-full lg:w-auto">
            <TabsList className="bg-slate-100/50 p-1 h-11 rounded-2xl border border-slate-200/50">
              <TabsTrigger value="open" className="rounded-xl px-4 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Current Pipeline</TabsTrigger>
              <TabsTrigger value="dispatched" className="rounded-xl px-4 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Realized Revenue</TabsTrigger>
              <TabsTrigger value="all" className="rounded-xl px-4 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Global Audit</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-4 top-3 h-4 w-4 text-slate-300" />
              <Input 
                 placeholder="SEARCH SALES RECORDS..." 
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
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">Filter Pipeline</span>
                  {activeFilterCount > 0 && (
                    <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold uppercase tracking-widest text-primary" onClick={() => setFilters({ salesperson: "", orderOwner: "", commercialStatus: "" })}>
                      <X className="h-3 w-3 mr-1" /> Clear All
                    </Button>
                  )}
                </div>
                <div className="space-y-4">
                  <FilterSelect label="SALES FORCE" value={filters.salesperson} options={salespersons} onChange={(v) => setFilters({ ...filters, salesperson: v })} />
                  <FilterSelect label="CLIENT PORTFOLIO" value={filters.orderOwner} options={owners} onChange={(v) => setFilters({ ...filters, orderOwner: v })} />
                  <FilterSelect label="COMMERCIAL STATUS" value={filters.commercialStatus} options={commercialStatuses} onChange={(v) => setFilters({ ...filters, commercialStatus: v })} />
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
                <TableHead className="py-5 font-black text-[10px] uppercase tracking-widest text-slate-400">Commercial Health</TableHead>
                <TableHead className="py-5 font-black text-[10px] uppercase tracking-widest text-slate-400">Logistics Status</TableHead>
                <TableHead className="py-5 font-black text-[10px] uppercase tracking-widest text-slate-400 text-right px-6">Valuation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-32">
                     <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">Synchronizing Pipeline Intelligence...</p>
                     </div>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-32">
                     <div className="flex flex-col items-center gap-4 opacity-50">
                        <TrendingUp className="h-12 w-12 text-slate-200" />
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Pipeline currently inert</p>
                     </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((o) => (
                  <TableRow key={o.id} className="group/row hover:bg-slate-50/80 transition-all border-slate-100 h-24">
                    <TableCell className="px-6">
                       <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-black text-slate-900 leading-none">{o.quote_no || "N/A"}</span>
                          <span className="text-[9px] font-bold text-slate-400 italic">{o.sales_order_no || "PENDING"}</span>
                       </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col max-w-[240px]">
                        <Link to={`/orders/${o.id}`} className="font-bold text-slate-900 hover:text-primary transition-colors truncate text-[14px]">{o.order_name}</Link>
                        <div className="flex items-center gap-2 mt-1">
                           <Badge variant="outline" className="text-[8px] font-black uppercase py-0 px-1 border-slate-200 bg-white text-slate-500">{o.salesperson}</Badge>
                           <span className="text-[10px] text-slate-400 font-medium truncate">{o.dealer_name}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                       <div className="flex flex-col gap-1.5 min-w-[140px]">
                          <div className="flex items-center gap-2">
                             <StatusDot status={o.commercial_status === "Order Confirmed" || o.commercial_status === "Confirmed" ? "green" : "orange"} />
                             <span className={cn("text-[10px] font-black uppercase tracking-widest", 
                               o.commercial_status === "Order Confirmed" || o.commercial_status === "Confirmed" ? "text-emerald-600" : "text-orange-600"
                             )}>
                               {o.commercial_status}
                             </span>
                          </div>
                          <div className="flex items-center gap-2">
                             <div className="h-1 flex-1 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-emerald-500 transition-all duration-1000" 
                                  style={{ width: `${(o.receipt / (o.order_value || 1)) * 100}%` }} 
                                />
                             </div>
                             <span className="text-[9px] font-bold text-slate-400">{Math.round((o.receipt / (o.order_value || 1)) * 100)}% PAID</span>
                          </div>
                       </div>
                    </TableCell>
                    <TableCell>
                       <div className="flex items-center gap-2">
                          <StatusDot status={o.dispatchLabel === "Fully Dispatched" ? "green" : o.dispatchLabel === "Partially Dispatched" ? "orange" : "grey"} />
                          <span className={cn("text-[10px] font-black uppercase tracking-widest", 
                            o.dispatchLabel === "Fully Dispatched" ? "text-emerald-600" : 
                            o.dispatchLabel === "Partially Dispatched" ? "text-orange-600" : "text-slate-400"
                          )}>
                             {o.dispatchLabel}
                          </span>
                       </div>
                    </TableCell>
                    <TableCell className="px-6 text-right">
                       <div className="flex flex-col items-end">
                          <span className="text-[15px] font-black text-slate-900 leading-none">₹{(o.order_value / 100000).toFixed(2)}L</span>
                          <div className="flex items-center gap-2 mt-1.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
                             <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white shadow-sm border border-slate-100" onClick={() => setEditOrderId(o.id)}>
                               <Pencil className="h-3.5 w-3.5 text-slate-400 hover:text-primary" />
                             </Button>
                          </div>
                       </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <CreateOrderDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={refresh} />
      {editOrderId && (
        <EditOrderDialog
          order={orders.find((o) => o.id === editOrderId)}
          open={!!editOrderId}
          onOpenChange={(open) => { if (!open) setEditOrderId(null); }}
          onUpdated={refresh}
        />
      )}
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
          <SelectItem value="all" className="text-[11px] font-bold uppercase tracking-widest">Show All</SelectItem>
          {options.map((o) => (
            <SelectItem key={o} value={o} className="text-[11px] font-bold uppercase tracking-widest">{o}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
