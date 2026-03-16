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
import { Plus, Search, Upload, Download, FileSpreadsheet, Pencil, Filter, X } from "lucide-react";
import { toast } from "sonner";
import { importOrdersFromFile, exportOrdersToExcel, downloadImportTemplate } from "@/lib/excelUtils";
import CreateOrderDialog from "@/components/CreateOrderDialog";
import EditOrderDialog from "@/components/EditOrderDialog";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useAggregatedOrders } from "@/hooks/useAggregatedOrders";
import { useSettingsOptions } from "@/hooks/useSettingsOptions";
import { Order, AggregatedOrder } from "@/lib/order-logic";
import { StatusDot, StatusCell as SharedStatusCell, MaterialsStatusDetail } from "@/components/shared/DashboardComponents";

// ── Specific Cell Wrappers (keeping these local for context-aware styling) ──

function CommercialStatusCell({ status }: { status: string }) {
  const s = (status || "").toLowerCase();
  const dotStatus: "green" | "amber" | "grey" =
    s.includes("approved") || s.includes("finance approved") ? "green" :
      s.includes("hold") || s.includes("deviation") ? "amber" : "grey";
  const cls =
    dotStatus === "green" ? "text-emerald-700 font-medium" :
      dotStatus === "amber" ? "text-amber-700" : "text-muted-foreground";
  return (
    <div className="flex items-center whitespace-nowrap text-sm">
      <StatusDot status={dotStatus} />
      <span className={cls}>{status || "Draft"}</span>
    </div>
  );
}

function ApprovalCell({ status }: { status: string }) {
  const s = (status || "").toLowerCase();
  const dotStatus: "green" | "grey" | "amber" = s === "approved" ? "green" : s === "hold" ? "amber" : "grey";
  return (
    <div className="flex items-center text-xs">
      <StatusDot status={dotStatus} />
      <span className={dotStatus === "green" ? "text-emerald-700 font-medium" : s === "hold" ? "text-amber-700" : "text-muted-foreground"}>
        {status || "Pending"}
      </span>
    </div>
  );
}

function ReworkDot({ open, total }: { open: number; total: number }) {
  if (total === 0) return <span className="text-muted-foreground text-sm">—</span>;
  const status = open > 0 ? "red" : "green";
  return (
    <div className="flex items-center whitespace-nowrap text-sm">
      <StatusDot status={status} />
      <span className={open > 0 ? "text-red-600" : "text-emerald-700 font-medium"}>
        {open > 0 ? `${open} Open` : "Closed"}
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
  const { settings, ownerOptions } = useSettingsOptions();
  
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
    <div className="p-6">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Global Orders</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Total {orders.length} orders across all stages
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <Button onClick={() => setDialogOpen(true)} className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" /> New Order
            </Button>
          )}

          <Button variant="outline" onClick={handleExportFull}>
            <Download className="mr-2 h-4 w-4" /> Full Data Export
          </Button>

          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            <Upload className="mr-2 h-4 w-4" /> Import Orders
          </Button>

          <Button variant="outline" onClick={async () => await downloadImportTemplate()}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Template
          </Button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImport}
            accept=".xlsx,.xls,.csv"
            className="hidden"
          />
        </div>
      </div>

      {/* Search + Filters */}
      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search quotation, order name, owner..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1.5">
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 space-y-3" align="start">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Filters</span>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setFilters(emptyFilters)}>
                  <X className="h-3 w-3 mr-1" /> Clear
                </Button>
              )}
            </div>
            <FilterSelect label="Salesperson" value={filters.salesperson} options={salespersons} onChange={(v) => setFilters({ ...filters, salesperson: v })} />
            <FilterSelect label="Owner" value={filters.orderOwner} options={owners} onChange={(v) => setFilters({ ...filters, orderOwner: v })} />
            <FilterSelect label="Order Type" value={filters.orderType} options={["Supply", "Supply + Install", "Service"]} onChange={(v) => setFilters({ ...filters, orderType: v })} />
            <FilterSelect label="Prod. Approval" value={filters.approvalProduction} options={["Pending", "Approved", "Hold"]} onChange={(v) => setFilters({ ...filters, approvalProduction: v })} />
          </PopoverContent>
        </Popover>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="partially_dispatched">Partially Dispatched</TabsTrigger>
          <TabsTrigger value="completely_dispatched">Completely Dispatched</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="all">All Orders</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Table */}
      <div className="rounded-md border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[100px]">Quotation No</TableHead>
              <TableHead className="min-w-[80px]">SO No</TableHead>
              <TableHead className="min-w-[140px]">Order Name</TableHead>
              <TableHead className="min-w-[80px]">Type</TableHead>
              <TableHead className="min-w-[110px]">Owner</TableHead>
              <TableHead className="min-w-[100px]">Salesperson</TableHead>
              <TableHead className="min-w-[100px]">Shade</TableHead>
              <TableHead className="min-w-[130px]">Product Type</TableHead>
              <TableHead className="text-right min-w-[60px]">Win</TableHead>
              <TableHead className="text-right min-w-[50px]">ATW</TableHead>
              <TableHead className="text-right min-w-[90px]">Order Value</TableHead>
              <TableHead className="text-right min-w-[75px]">Receipt</TableHead>
              <TableHead className="text-right min-w-[75px]">Balance</TableHead>
              <TableHead className="min-w-[120px]">Commercial Status</TableHead>
              <TableHead className="min-w-[100px]">Prod. Appr</TableHead>
              <TableHead className="min-w-[100px]">Disp. Appr</TableHead>
              <TableHead className="min-w-[70px]">Survey</TableHead>
              <TableHead className="min-w-[70px]">Design</TableHead>
              <TableHead className="min-w-[90px]">Materials</TableHead>
              <TableHead className="min-w-[80px]">Production</TableHead>
              <TableHead className="min-w-[80px]">Dispatch</TableHead>
              <TableHead className="min-w-[80px]">Install</TableHead>
              <TableHead className="min-w-[70px]">Rework</TableHead>
              <TableHead className="min-w-[100px]">Next Action</TableHead>
              {canEdit && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 25 : 24} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 25 : 24} className="text-center py-8 text-muted-foreground">No orders found</TableCell>
              </TableRow>
            ) : (
              filtered.map((o) => (
                <TableRow key={o.id} className="hover:bg-muted/50">
                  <TableCell className="text-sm">{o.quote_no || "—"}</TableCell>
                  <TableCell className="text-sm">{o.sales_order_no || "—"}</TableCell>
                  <TableCell>
                    <Link to={`/orders/${o.id}`} className="font-medium text-primary hover:underline">{o.order_name}</Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{o.order_type}</Badge>
                  </TableCell>
                  <TableCell className="text-sm truncate max-w-[120px]">{o.dealer_name}</TableCell>
                  <TableCell className="text-sm">{o.salesperson || "—"}</TableCell>
                  <TableCell className="text-sm">{o.colour_shade || "—"}</TableCell>
                  <TableCell className="text-sm truncate max-w-[140px]" title={o.product_type}>{o.product_type}</TableCell>
                  <TableCell className="text-right">{o.total_windows}</TableCell>
                  <TableCell className="text-right font-medium">{o.atw}</TableCell>
                  <TableCell className="text-right font-medium">₹{Number(o.order_value).toLocaleString()}</TableCell>
                  <TableCell className="text-right">₹{o.receipt.toLocaleString()}</TableCell>
                  <TableCell className="text-right">₹{o.balance.toLocaleString()}</TableCell>
                  <TableCell>
                    <CommercialStatusCell status={o.commercial_status} />
                  </TableCell>
                  <TableCell>
                    <ApprovalCell status={o.approval_for_production} />
                  </TableCell>
                  <TableCell>
                    <ApprovalCell status={o.approval_for_dispatch} />
                  </TableCell>
                  <TableCell><SharedStatusCell done={o.surveyDone} total={o.total_windows} /></TableCell>
                  <TableCell><SharedStatusCell done={o.designReleased} total={o.surveyDone} /></TableCell>
                  <TableCell><MaterialsStatusDetail order={o} /></TableCell>
                  <TableCell><SharedStatusCell done={o.productionPacked} total={o.atw} /></TableCell>
                  <TableCell><SharedStatusCell done={o.dispatchedWindows} total={o.atw} /></TableCell>
                  <TableCell><SharedStatusCell done={o.installedWindows} total={o.dispatchedWindows} /></TableCell>
                  <TableCell><ReworkDot open={o.reworkOpenCount} total={o.reworkTotalCount} /></TableCell>
                  <TableCell>
                    <Badge variant="outline" className={o.nextAction === "—" ? "bg-muted text-muted-foreground" : "bg-amber-500/15 text-amber-700 border-amber-500/20"}>
                      {o.nextAction}
                    </Badge>
                  </TableCell>
                  {canEdit && (
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setEditOrder(o); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CreateOrderDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreated={refresh} />
      <EditOrderDialog open={!!editOrder} onOpenChange={(v) => { if (!v) setEditOrder(null); }} onUpdated={refresh} order={editOrder} />
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <Select value={value || "all"} onValueChange={(v) => onChange(v === "all" ? "" : v)}>
        <SelectTrigger className="h-8 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          {options.map((o) => (
            <SelectItem key={o} value={o}>{o}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
