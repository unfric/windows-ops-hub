import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Search, Upload, Download, Pencil, Filter, X, LayoutGrid, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { importOrdersFromFile, exportOrdersToExcel } from "@/lib/excelUtils";
import CreateOrderDialog from "@/components/CreateOrderDialog";
import EditOrderDialog from "@/components/EditOrderDialog";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useAggregatedOrders } from "@/hooks/useAggregatedOrders";
import { useSettingsOptions } from "@/hooks/useSettingsOptions";
import { Order } from "@/lib/order-logic";
import { cn } from "@/lib/utils";
import { StatusDot, StatusCell as SharedStatusCell, MaterialsStatusDetail, PageHeader, PageWrapper } from "@/components/shared/DashboardComponents";

// ── Specific Cell Wrappers (keeping these local for context-aware styling) ──

function CommercialStatusCell({ status }: { status: string }) {
  const s = (status || "").toLowerCase();
  const dotStatus: "green" | "amber" | "grey" =
    s.includes("approved") || s.includes("finance approved") ? "green" :
      s.includes("hold") || s.includes("deviation") ? "amber" : "grey";
  const cls =
    dotStatus === "green" ? "text-emerald-700 font-bold" :
      dotStatus === "amber" ? "text-amber-700" : "text-muted-foreground";
  return (
    <div className="flex items-center whitespace-nowrap text-[11px] uppercase tracking-tight">
      <StatusDot status={dotStatus} />
      <span className={cls}>{status || "Draft"}</span>
    </div>
  );
}

function ApprovalCell({ status }: { status: string }) {
  const s = (status || "").toLowerCase();
  const dotStatus: "green" | "grey" | "amber" = s === "approved" ? "green" : s === "hold" ? "amber" : "grey";
  return (
    <div className="flex items-center text-[10px] uppercase font-bold tracking-widest">
      <StatusDot status={dotStatus} />
      <span className={dotStatus === "green" ? "text-emerald-700" : s === "hold" ? "text-amber-700" : "text-slate-400"}>
        {status || "Pending"}
      </span>
    </div>
  );
}

function ReworkDot({ open, total }: { open: number; total: number }) {
  if (total === 0) return <span className="text-slate-300 text-[10px] font-black">—</span>;
  const status = open > 0 ? "red" : "green";
  return (
    <div className="flex items-center whitespace-nowrap text-[11px] font-bold">
      <StatusDot status={status} />
      <span className={open > 0 ? "text-red-500" : "text-emerald-600"}>
        {open > 0 ? `${open} OPEN` : "CLEAR"}
      </span>
    </div>
  );
}

// ── Filters ──

interface Filters {
  salesperson: string;
  orderOwner: string;
  orderType: string;
  approvalProduction: string;
}

const emptyFilters: Filters = {
  salesperson: "", orderOwner: "", orderType: "", approvalProduction: "",
};

// ── Component ──

export default function OrdersDashboard() {
  const { orders, aggregated, loading, refresh } = useAggregatedOrders();
  const { settings } = useSettingsOptions();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [importing, setImporting] = useState(false);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [tab, setTab] = useState("open");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { hasRole } = useUserRoles();

  const salespersons = settings?.salespersons?.map((s) => s.name) || [];
  const owners = [...new Set(orders.map((o) => o.dealer_name).filter(Boolean))].sort();

  const canEdit = hasRole("sales") || hasRole("admin") || hasRole("management");

  // Tab filtering
  const tabFiltered = aggregated.filter((o) => {
    if (tab === "open") return o.dispatchLabel === "Not Dispatched" && o.installedWindows < o.dispatchedWindows || o.dispatchLabel === "Not Dispatched";
    if (tab === "partially_dispatched") return o.dispatchLabel === "Partially Dispatched";
    if (tab === "completely_dispatched") return o.dispatchLabel === "Fully Dispatched" && o.installedWindows < o.atw;
    if (tab === "completed") return o.installedWindows >= o.atw && o.atw > 0;
    return true; // "all"
  });

  // Search + filters
  const filtered = tabFiltered.filter((o) => {
    if (search) {
      const s = search.toLowerCase();
      const matches = o.order_name.toLowerCase().includes(s) ||
        o.dealer_name.toLowerCase().includes(s) ||
        (o.quote_no || "").toLowerCase().includes(s) ||
        (o.sales_order_no || "").toLowerCase().includes(s);
      if (!matches) return false;
    }
    if (filters.salesperson && o.salesperson !== filters.salesperson) return false;
    if (filters.orderOwner && o.dealer_name !== filters.orderOwner) return false;
    if (filters.orderType && o.order_type !== filters.orderType) return false;
    if (filters.approvalProduction && o.approval_for_production !== filters.approvalProduction) return false;
    return true;
  });

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const result = await importOrdersFromFile(file);
      toast.success(`Import: ${result.created} created, ${result.updated} updated`);
      if (result.errors.length > 0) result.errors.forEach((err) => toast.error(err));
      refresh();
    } catch (err: any) {
      toast.error("Import failed: " + err.message);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleExportFull = async () => {
    const paymentMap: Record<string, number> = {};
    aggregated.forEach(a => paymentMap[a.id] = a.receipt);
    await exportOrdersToExcel(orders as any, paymentMap);
  };

  return (
    <PageWrapper title="Global Orders Dashboard">
      <PageHeader
        title="Command Hub"
        subtitle={`${orders.length} ACTIVE DEPLOYMENTS DETECTED`}
        icon={LayoutGrid}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportFull} className="h-10 text-[10px] font-black uppercase tracking-[0.1em] rounded-xl border-slate-200">
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>

          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={importing} className="h-10 text-[10px] font-black uppercase tracking-[0.1em] rounded-xl border-slate-200">
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />} Import
          </Button>

          {canEdit && (
            <Button onClick={() => setDialogOpen(true)} className="h-10 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl shadow-lg shadow-primary/20">
              <Plus className="mr-2 h-4 w-4" /> Deploy New
            </Button>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImport}
            accept=".xlsx,.xls,.csv"
            className="hidden"
          />
        </div>
      </PageHeader>

      {/* Control Bar: Search + Filters + Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <Tabs value={tab} onValueChange={setTab} className="w-full lg:w-auto">
          <TabsList className="bg-slate-100/50 p-1 h-11 rounded-2xl border border-slate-200/50">
            <TabsTrigger value="open" className="rounded-xl px-4 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Open</TabsTrigger>
            <TabsTrigger value="partially_dispatched" className="rounded-xl px-4 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Partial</TabsTrigger>
            <TabsTrigger value="completely_dispatched" className="rounded-xl px-4 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Full</TabsTrigger>
            <TabsTrigger value="completed" className="rounded-xl px-4 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Finalized</TabsTrigger>
            <TabsTrigger value="all" className="rounded-xl px-4 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Global</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-4 top-3 h-4 w-4 text-slate-300" />
            <Input
              placeholder="SCAN REGISTRY (NAME, SO#, QUOTE)..."
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
                  <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold uppercase tracking-widest text-primary" onClick={() => setFilters(emptyFilters)}>
                    <X className="h-3 w-3 mr-1" /> Purge All
                  </Button>
                )}
              </div>
              <div className="space-y-4">
                <FilterSelect label="SALESFORCE" value={filters.salesperson} options={salespersons} onChange={(v) => setFilters({ ...filters, salesperson: v })} />
                <FilterSelect label="CLIENT/ENTITY" value={filters.orderOwner} options={owners} onChange={(v) => setFilters({ ...filters, orderOwner: v })} />
                <FilterSelect label="DEPLOYMENT TYPE" value={filters.orderType} options={["Supply", "Supply + Install", "Service"]} onChange={(v) => setFilters({ ...filters, orderType: v })} />
                <FilterSelect label="PRODUCTION GATE" value={filters.approvalProduction} options={["Pending", "Approved", "Hold"]} onChange={(v) => setFilters({ ...filters, approvalProduction: v })} />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Table Interface */}
      <div className="rounded-[32px] border border-slate-200 bg-white/60 backdrop-blur-md shadow-xl shadow-slate-200/40 overflow-hidden group/table">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-slate-100 hover:bg-transparent">
                <TableHead className="py-5 px-6 font-black text-[10px] uppercase tracking-widest text-slate-400">Reference</TableHead>
                <TableHead className="py-5 font-black text-[10px] uppercase tracking-widest text-slate-900">Core Metadata</TableHead>
                <TableHead className="py-5 font-black text-[10px] uppercase tracking-widest text-slate-400">Financials</TableHead>
                <TableHead className="py-5 font-black text-[10px] uppercase tracking-widest text-slate-400">Auth Gate</TableHead>
                <TableHead className="py-5 font-black text-[10px] uppercase tracking-widest text-slate-400">Operational Flow</TableHead>
                <TableHead className="py-5 font-black text-[10px] uppercase tracking-widest text-slate-400 text-right px-6">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-32">
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">Synchronizing Global Stream...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-32">
                    <div className="flex flex-col items-center gap-4 opacity-50">
                      <Search className="h-12 w-12 text-slate-200" />
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No matching deployments detected</p>
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
                          <Badge variant="outline" className="text-[8px] font-black uppercase py-0 px-1 border-slate-200 bg-white text-slate-500">{o.order_type}</Badge>
                          <span className="text-[10px] text-slate-400 font-medium truncate">{o.dealer_name}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-slate-900">₹{Number(o.order_value).toLocaleString()}</span>
                        <span className="text-[9px] font-black text-emerald-600">R: ₹{o.receipt.toLocaleString()}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1.5 min-w-[100px]">
                        <CommercialStatusCell status={o.commercial_status} />
                        <ApprovalCell status={o.approval_for_production} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                        <div className="flex flex-col"><span className="text-[8px] font-black text-slate-300 uppercase">Survey/Design</span><SharedStatusCell done={o.designReleased} total={o.surveyDone} /></div>
                        <div className="flex flex-col"><span className="text-[8px] font-black text-slate-300 uppercase">Materials</span><MaterialsStatusDetail order={o} /></div>
                        <div className="flex flex-col"><span className="text-[8px] font-black text-slate-300 uppercase">Production</span><SharedStatusCell done={o.productionPacked} total={o.atw} /></div>
                        <div className="flex flex-col"><span className="text-[8px] font-black text-slate-300 uppercase">Deployment</span><SharedStatusCell done={o.installedWindows} total={o.atw} /></div>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 text-right">
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant="outline" className={cn("text-[8px] font-black uppercase py-0.5 px-2", o.nextAction === "—" ? "bg-slate-50 text-slate-300 border-slate-100" : "bg-amber-50 text-amber-700 border-amber-200 shadow-sm")}>
                          {o.nextAction === "—" ? "INERT" : o.nextAction}
                        </Badge>
                        <div className="flex items-center gap-1.5 opacity-0 group-row/row:opacity-100 transition-opacity">
                          <ReworkDot open={o.reworkOpenCount} total={o.reworkTotalCount} />
                          {canEdit && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg bg-white shadow-sm border border-slate-200 hover:bg-slate-50" onClick={(e) => { e.stopPropagation(); setEditOrder(o); }}>
                              <Pencil className="h-3.5 w-3.5 text-slate-600" />
                            </Button>
                          )}
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

      <CreateOrderDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreated={refresh} />
      <EditOrderDialog open={!!editOrder} onOpenChange={(v) => { if (!v) setEditOrder(null); }} onUpdated={refresh} order={editOrder} />
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

