import { useEffect, useRef, useState } from "react";
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
import DataTableLayout from "@/components/ui/data-table-layout";
import { useUserRoles } from "@/hooks/useUserRoles";
import { cn } from "@/lib/utils";
import { api } from "@/services/api";

// ── Types ──

interface Order {
  id: string;
  order_type: string;
  quote_no: string | null;
  sales_order_no: string | null;
  order_name: string;
  dealer_name: string;
  salesperson: string | null;
  colour_shade: string | null;
  product_type: string;
  total_windows: number;
  windows_released: number;
  sqft: number;
  order_value: number;
  advance_received: number;
  balance_amount: number;
  commercial_status: string;
  dispatch_status: string;
  installation_status: string;
  survey_done_windows: number;
  design_released_windows: number;
  hardware_availability: string;
  extrusion_availability: string;
  glass_availability: string;
  coated_extrusion_availability: string;
  hardware_po_status: string;
  hardware_delivery_date: string | null;
  extrusion_po_status: string;
  extrusion_delivery_date: string | null;
  glass_po_status: string;
  glass_delivery_date: string | null;
  coating_status: string;
  coating_delivery_date: string | null;
  approval_for_production: string;
  windows_packed: number;
  windows_dispatched: number;
  windows_installed: number;
  order_date: string | null;
  tat_date: string | null;
  target_delivery_date: string | null;
  dispatch_date: string | null;
  created_at: string;
}

interface AggregatedOrder extends Order {
  receipt: number;
  balance: number;
  surveyDone: number;
  designReleased: number;
  productionPacked: number;
  atw: number;
  dispatchedWindows: number;
  installedWindows: number;
  reworkOpenCount: number;
  reworkTotalCount: number;
  materialsStatus: "Ready" | "Partial" | "Pending";
  dispatchLabel: string;
  nextAction: string;
}

// ── Status helpers ──

function getMaterialsStatus(o: Order): "Ready" | "Partial" | "Pending" {
  const items = [o.hardware_availability, o.extrusion_availability, o.glass_availability, o.coated_extrusion_availability];
  const ready = items.filter((s) => s === "In Stock / Available" || s === "Not Required");
  if (ready.length === items.length) return "Ready";
  if (ready.length > 0 || items.some((s) => s === "Partially Available" || s === "PO Placed" || s === "Sent to Coating")) return "Partial";
  return "Pending";
}

function getDispatchLabel(dispatched: number, atw: number): string {
  if (dispatched <= 0) return "Not Dispatched";
  if (dispatched < atw) return "Partially Dispatched";
  return "Fully Dispatched";
}

function getNextAction(agg: AggregatedOrder): string {
  if (agg.surveyDone < agg.total_windows) return "Survey";
  if (agg.designReleased < agg.surveyDone) return "Design";
  if (agg.materialsStatus !== "Ready") return "Procurement";
  if (agg.productionPacked < agg.atw) return "Production";
  if (agg.dispatchLabel !== "Fully Dispatched") return "Dispatch";
  if (agg.installedWindows < agg.dispatchedWindows) return "Installation";
  if (agg.reworkOpenCount > 0) return "Rework";
  return "—";
}

// ── Dot indicator helper ──
// Returns a colored dot span
function Dot({ status }: { status: "green" | "amber" | "grey" | "red" }) {
  const cls =
    status === "green" ? "bg-emerald-500" :
      status === "amber" ? "bg-amber-400" :
        status === "red" ? "bg-red-500" :
          "bg-slate-300";
  return <span className={`inline-block w-2 h-2 rounded-full ${cls} mr-1.5 flex-shrink-0`} />;
}

// Returns a status cell with dot + ratio (e.g. "● 8/20")
function StatusCell({ done, total, label }: { done: number; total: number; label?: string }) {
  const status = done <= 0 ? "grey" : done >= total && total > 0 ? "green" : "amber";
  return (
    <div className="flex items-center whitespace-nowrap text-sm">
      <Dot status={status} />
      <span className={status === "green" ? "text-emerald-700 font-medium" : status === "amber" ? "text-amber-700" : "text-muted-foreground"}>
        {label ?? `${done}/${total}`}
      </span>
    </div>
  );
}

// Materials detail showing H, E, G, C indicators with PO status integrated
function MaterialsStatusDetail({ o }: { o: Order }) {
  const getDot = (avail: string, po: string, delivery: string | null): string => {
    // 1. Blue: Delivered
    if (avail === "Delivered" || po === "Delivered") return "blue";

    // 2. Green: In stock/avl or Not required
    if (avail === "In Stock / Available" || avail === "Not Required" || po === "Not Required") return "green";

    // 3. Yellow: partially avl
    if (avail === "Partially Available" || po === "Partially Available") return "yellow";

    // 4. Orange: PO placed or Sent to coating
    if (avail === "PO Placed" || avail === "Sent to Coating" || po === "PO Placed" || po === "Sent to Coating") return "orange";

    // 5. Red: pending PO or Pending coating
    if (avail === "Pending PO" || avail === "Pending Coating" || po === "Pending PO" || po === "Pending Coating") return "red";

    return "grey";
  };

  const items = [
    { label: "H", avl: o.hardware_availability, po: o.hardware_po_status, date: o.hardware_delivery_date },
    { label: "E", avl: o.extrusion_availability, po: o.extrusion_po_status, date: o.extrusion_delivery_date },
    { label: "G", avl: o.glass_availability, po: o.glass_po_status, date: o.glass_delivery_date },
    { label: "C", avl: o.coated_extrusion_availability, po: o.coating_status, date: o.coating_delivery_date },
  ];

  return (
    <div className="flex gap-1" title="H: Hardware, E: Extrusion, G: Glass, C: Coating">
      {items.map((item, i) => {
        const dot = getDot(item.avl, item.po, item.date);
        const tooltip = `${item.label}: ${item.avl || item.po}${item.date ? ` (Del: ${item.date})` : ""}`;

        const colorClass =
          dot === "blue" ? "bg-blue-500" :
            dot === "green" ? "bg-emerald-500" :
              dot === "orange" ? "bg-orange-500" :
                dot === "red" ? "bg-red-500" :
                  dot === "yellow" ? "bg-yellow-400" :
                    "bg-slate-300";

        return (
          <div key={i} title={tooltip} className={`w-4 h-4 rounded-sm flex items-center justify-center text-[10px] font-bold text-white shadow-sm ${colorClass}`}>
            {item.label}
          </div>
        );
      })}
    </div>
  );
}

// Commercial status cell (formerly Finance status)
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
      <Dot status={dotStatus} />
      <span className={cls}>{status || "Draft"}</span>
    </div>
  );
}

// Approval cell for Production/Dispatch
function ApprovalCell({ status }: { status: string }) {
  const s = (status || "").toLowerCase();
  const dotStatus: "green" | "grey" | "amber" =
    s === "approved" ? "green" :
      s === "hold" ? "amber" : "grey";

  return (
    <div className="flex items-center text-xs">
      <Dot status={dotStatus} />
      <span className={dotStatus === "green" ? "text-emerald-700 font-medium" : s === "hold" ? "text-amber-700" : "text-muted-foreground"}>
        {status || "Pending"}
      </span>
    </div>
  );
}

// Rework dot
function ReworkDot({ open, total }: { open: number; total: number }) {
  if (total === 0) return <span className="text-muted-foreground text-sm">—</span>;
  const status = open > 0 ? "red" : "green";
  return (
    <div className="flex items-center whitespace-nowrap text-sm">
      <Dot status={status} />
      <span className={open > 0 ? "text-red-600" : "text-emerald-700 font-medium"}>
        {open > 0 ? `${open} Open` : "Closed"}
      </span>
    </div>
  );
}

// ── Filters ──

interface Filters {
  orderType: string;
  dealStage: string;
  managedBy: string;
  nextAction: string;
  materialsStatus: string;
  dispatchLabel: string;
}

const emptyFilters: Filters = {
  orderType: "", dealStage: "", managedBy: "", nextAction: "", materialsStatus: "", dispatchLabel: ""
};

// ── Component ──

export default function OrdersDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [aggregated, setAggregated] = useState<AggregatedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [importing, setImporting] = useState(false);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [tab, setTab] = useState("open");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { hasRole } = useUserRoles();



  const canEdit = hasRole("sales") || hasRole("admin") || hasRole("management");

  const fetchAll = async () => {
    try {
      const data = await api.orders.list();

      const rawOrders = (data.orders || []) as unknown as Order[];
      setOrders(rawOrders);

      // Payment map (confirmed only)
      const paymentMap: Record<string, number> = {};
      for (const p of (data.payment_logs || []) as any[]) {
        if (p.status === "Confirmed") paymentMap[p.order_id] = (paymentMap[p.order_id] || 0) + Number(p.amount);
      }

      // Production packed map
      const packedMap: Record<string, number> = {};
      for (const p of (data.production_logs || []) as any[]) {
        if (p.stage === "Packed") packedMap[p.order_id] = (packedMap[p.order_id] || 0) + Number(p.windows_completed);
      }

      // Dispatch map
      const dispatchMap: Record<string, number> = {};
      for (const d of (data.dispatch_logs || []) as any[]) {
        dispatchMap[d.order_id] = (dispatchMap[d.order_id] || 0) + Number(d.windows_dispatched);
      }

      // Installation map
      const installMap: Record<string, number> = {};
      for (const i of (data.installation_logs || []) as any[]) {
        installMap[i.order_id] = (installMap[i.order_id] || 0) + Number(i.windows_installed);
      }

      // Rework map
      const reworkOpenMap: Record<string, number> = {};
      const reworkTotalMap: Record<string, number> = {};
      for (const r of (data.rework_logs || []) as any[]) {
        reworkTotalMap[r.order_id] = (reworkTotalMap[r.order_id] || 0) + 1;
        if (r.status === "Pending" || r.status === "In Progress") {
          reworkOpenMap[r.order_id] = (reworkOpenMap[r.order_id] || 0) + 1;
        }
      }

      // Aggregate
      const agg: AggregatedOrder[] = rawOrders.map((o) => {
        const receipt = paymentMap[o.id] || 0;
        const packed = (packedMap[o.id] || 0) + (Number(o.windows_packed) || 0);
        const dispatched = (dispatchMap[o.id] || 0) + (Number(o.windows_dispatched) || 0);
        const installed = (installMap[o.id] || 0) + (Number(o.windows_installed) || 0);
        const openRework = reworkOpenMap[o.id] || 0;
        const totalRework = reworkTotalMap[o.id] || 0;
        const atw = o.design_released_windows || 0;

        const partial: AggregatedOrder = {
          ...o,
          receipt,
          balance: Number(o.order_value) - receipt,
          surveyDone: o.survey_done_windows || 0,
          designReleased: o.design_released_windows || 0,
          productionPacked: packed,
          atw,
          dispatchedWindows: dispatched,
          installedWindows: installed,
          reworkOpenCount: openRework,
          reworkTotalCount: totalRework,
          materialsStatus: getMaterialsStatus(o),
          dispatchLabel: getDispatchLabel(dispatched, atw),
          nextAction: "",
        };
        partial.nextAction = getNextAction(partial);
        return partial;
      });

      setAggregated(agg);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load orders: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const owners = Array.from(new Set(orders.map((o) => o.dealer_name).filter(Boolean))).sort() as string[];
  const nextActions = Array.from(new Set(aggregated.map((o) => o.nextAction).filter(Boolean))).sort() as string[];

  useEffect(() => { fetchAll(); }, []);

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
    if (filters.orderType && o.order_type !== filters.orderType) return false;
    if (filters.dealStage && o.commercial_status !== filters.dealStage) return false;
    if (filters.managedBy && o.dealer_name !== filters.managedBy) return false;
    if (filters.nextAction && o.nextAction !== filters.nextAction) return false;
    if (filters.materialsStatus && o.materialsStatus !== filters.materialsStatus) return false;
    if (filters.dispatchLabel && o.dispatchLabel !== filters.dispatchLabel) return false;
    return true;
  });

  const activeFilters = Object.entries(filters)
    .filter(([_, v]) => v)
    .map(([k, v]) => ({
      key: k,
      label: k === "orderType" ? "Type" : 
             k === "dealStage" ? "Deal Stage" : 
             k === "managedBy" ? "Managed By" :
             k === "nextAction" ? "Next Action" :
             k === "materialsStatus" ? "Materials" :
             k === "dispatchLabel" ? "Dispatch" :
             k.charAt(0).toUpperCase() + k.slice(1),
      value: v
    }));

  const activeFilterCount = activeFilters.length;

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    
    const toastId = toast.loading("Starting import...");
    
    try {
      const result = await importOrdersFromFile(file, (curr, total) => {
        toast.loading(`Importing orders: ${curr} of ${total} processed...`, { id: toastId });
      });

      toast.success(
        <div className="flex flex-col gap-1">
          <span className="font-bold">Import Completed</span>
          <div className="text-xs space-y-0.5">
            <p className="text-emerald-600">✓ {result.created} new orders created</p>
            <p className="text-blue-600">i {result.updated} existing orders updated</p>
            {result.errors.length > 0 && (
              <p className="text-red-500">⚠ {result.errors.length} rows had errors</p>
            )}
          </div>
        </div>,
        { id: toastId, duration: 5000 }
      );

      if (result.errors.length > 0) {
        // Log errors to console so user can see details if needed
        console.warn("Import Errors:", result.errors);
      }
      
      fetchAll();
    } catch (err: any) {
      toast.error("Import failed: " + err.message, { id: toastId });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleExportFull = async () => {
    // This uses the updated exportOrdersToExcel that includes all fields and syncs counts
    const paymentMap: Record<string, number> = {};
    const pMap: Record<string, number> = {};
    const dMap: Record<string, number> = {};
    const iMap: Record<string, number> = {};
    
    aggregated.forEach(a => {
      paymentMap[a.id] = a.receipt;
      pMap[a.id] = a.productionPacked;
      dMap[a.id] = a.dispatchedWindows;
      iMap[a.id] = a.installedWindows;
    });
    await exportOrdersToExcel(orders as any, paymentMap, pMap, dMap, iMap);
  };

  const columns = [
    {
      header: "Project Name",
      accessor: (o: AggregatedOrder) => (
        <div className="flex flex-col">
          <Link to={`/orders/${o.id}`} className="font-medium text-blue-600 hover:underline">{o.order_name}</Link>
          <span className="text-[10px] text-muted-foreground uppercase">{o.order_type}</span>
        </div>
      ),
      className: "min-w-[180px]"
    },
    {
      header: "Managed By",
      accessor: (o: AggregatedOrder) => <span className="text-[#5c6e82]">{o.dealer_name}</span>,
    },
    {
      header: "Target Delv",
      accessor: (o: AggregatedOrder) => o.target_delivery_date ? new Date(o.target_delivery_date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short' }) : "—",
      sortValue: (o: AggregatedOrder) => o.target_delivery_date,
      className: "whitespace-nowrap",
    },
    {
      header: "Deal Stage",
      accessor: (o: AggregatedOrder) => <CommercialStatusCell status={o.commercial_status} />,
    },
    {
      header: "Next Action",
      accessor: (o: AggregatedOrder) => (
        <Badge variant="outline" className={o.nextAction === "—" ? "bg-muted text-muted-foreground" : "bg-amber-500/15 text-amber-700 border-amber-500/20"}>
          {o.nextAction}
        </Badge>
      ),
    },
    {
      header: "Qty",
      accessor: (o: AggregatedOrder) => <span className="text-[#5c6e82]">{o.atw} / {o.total_windows}</span>,
    },
    {
      header: "Sq Ft",
      accessor: (o: AggregatedOrder) => <span className="text-[#5c6e82]">{o.sqft || "—"}</span>,
    },
    {
      header: "Opportunity Value",
      accessor: (o: AggregatedOrder) => <span className="text-[#5c6e82]">₹{Number(o.order_value).toLocaleString()}</span>,
    },
    {
      header: "Receipt",
      accessor: (o: AggregatedOrder) => <span className="text-emerald-600 font-medium">₹{Number(o.receipt).toLocaleString()}</span>,
    },
    {
      header: "Balance",
      accessor: (o: AggregatedOrder) => {
        return <span className={o.balance > 0 ? "text-amber-600 font-medium" : "text-emerald-600 font-medium"}>₹{Number(o.balance).toLocaleString()}</span>;
      },
    },
    {
      header: "Survey",
      accessor: (o: AggregatedOrder) => <StatusCell done={o.surveyDone} total={o.total_windows} />,
    },
    {
      header: "Design",
      accessor: (o: AggregatedOrder) => <StatusCell done={o.designReleased} total={o.surveyDone} />,
    },
    {
      header: "Materials",
      accessor: (o: AggregatedOrder) => <MaterialsStatusDetail o={o} />,
    },
    {
      header: "Production",
      accessor: (o: AggregatedOrder) => <StatusCell done={o.productionPacked} total={o.atw} />,
    },
    {
      header: "Dispatch",
      accessor: (o: AggregatedOrder) => <StatusCell done={o.dispatchedWindows} total={o.atw} />,
    },
    {
      header: "Install",
      accessor: (o: AggregatedOrder) => <StatusCell done={o.installedWindows} total={o.dispatchedWindows} />,
    },
    {
      header: "Rework",
      accessor: (o: AggregatedOrder) => <ReworkDot open={o.reworkOpenCount} total={o.reworkTotalCount} />,
    },
    {
      header: "TAT Date",
      accessor: (o: AggregatedOrder) => o.tat_date ? new Date(o.tat_date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short' }) : "—",
      sortValue: (o: AggregatedOrder) => o.tat_date,
      className: "whitespace-nowrap text-blue-600 font-medium",
    },
    {
      header: "Dispatch Date",
      accessor: (o: AggregatedOrder) => o.dispatch_date ? new Date(o.dispatch_date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short' }) : "—",
      sortValue: (o: AggregatedOrder) => o.dispatch_date,
      className: "whitespace-nowrap text-emerald-600 font-medium",
    },
    {
      header: "Order Date",
      accessor: (o: AggregatedOrder) => o.order_date ? new Date(o.order_date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short' }) : "—",
      sortValue: (o: AggregatedOrder) => o.order_date,
      className: "whitespace-nowrap",
    },
    {
      header: "Default Quote",
      accessor: (o: AggregatedOrder) => o.quote_no || "—",
      className: "text-[#5c6e82]"
    },
    {
      header: "Sales Order",
      accessor: (o: AggregatedOrder) => o.sales_order_no || "—",
      className: "text-[#5c6e82]"
    }
  ];

  const tabsConfig = [
    { id: "open", label: "Open" },
    { id: "partially_dispatched", label: "Partially Dispatched" },
    { id: "completely_dispatched", label: "Completely Dispatched" },
    { id: "completed", label: "Completed" },
    { id: "all", label: "All Orders" },
  ];

  const renderTopRightActions = () => (
    canEdit && (
      <Button variant="outline" size="sm" className="h-8 text-blue-600 border-blue-200 bg-blue-50/50 hover:bg-blue-100/50 font-medium px-4" onClick={() => setDialogOpen(true)}>
        <Plus className="h-4 w-4 mr-1" /> New Order
      </Button>
    )
  );

  return (
    <div className="flex-1 w-full bg-white flex flex-col h-[calc(100vh-64px)]">
      <DataTableLayout
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
        renderTopRightActions={renderTopRightActions}
        onTemplate={downloadImportTemplate}
        onImport={() => fileInputRef.current?.click()}
        onExport={handleExportFull}
        filterChildren={
          <div className="space-y-6">
            <FilterSelect label="Managed By" value={filters.managedBy} options={owners} onChange={(v) => setFilters(p => ({ ...p, managedBy: v }))} />
            <FilterSelect label="Next Action" value={filters.nextAction} options={nextActions} onChange={(v) => setFilters(p => ({ ...p, nextAction: v }))} />
            
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase font-semibold">Materials Status</label>
              <Select value={filters.materialsStatus || "all"} onValueChange={(v) => setFilters(p => ({ ...p, materialsStatus: v === "all" ? "" : v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                   <SelectItem value="all">All Status</SelectItem>
                   <SelectItem value="Ready">Ready</SelectItem>
                   <SelectItem value="Partial">Partial</SelectItem>
                   <SelectItem value="Pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase font-semibold">Dispatch Status</label>
              <Select value={filters.dispatchLabel || "all"} onValueChange={(v) => setFilters(p => ({ ...p, dispatchLabel: v === "all" ? "" : v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                   <SelectItem value="all">All Status</SelectItem>
                   <SelectItem value="Fully Dispatched">Fully Dispatched</SelectItem>
                   <SelectItem value="Partially Dispatched">Partially Dispatched</SelectItem>
                   <SelectItem value="Not Dispatched">Not Dispatched</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase font-semibold">Order Type</label>
              <Select value={filters.orderType || "all"} onValueChange={(v) => setFilters(p => ({ ...p, orderType: v === "all" ? "" : v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                   <SelectItem value="all">All Types</SelectItem>
                   <SelectItem value="Retail">Retail</SelectItem>
                   <SelectItem value="Project">Project</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase font-semibold">Deal Stage</label>
              <Select value={filters.dealStage || "all"} onValueChange={(v) => setFilters(p => ({ ...p, dealStage: v === "all" ? "" : v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                   <SelectItem value="all">All Stages</SelectItem>
                   <SelectItem value="Confirmed">Confirmed</SelectItem>
                   <SelectItem value="Pipeline">Pipeline</SelectItem>
                   <SelectItem value="Hold">Hold</SelectItem>
                   <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        }
        renderRowAction={(o) => (
          canEdit ? (
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground/40 hover:text-foreground hover:bg-slate-200 rounded transition-colors shrink-0 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); setEditOrder(o); }}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          ) : undefined
        )}
      />

      <input type="file" ref={fileInputRef} onChange={handleImport} accept=".xlsx,.xls,.csv" className="hidden" />

      {/* Legacy layout wrapper dialogs */}
      <CreateOrderDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreated={fetchAll} />
      {editOrder && (
        <EditOrderDialog
          order={editOrder}
          open={!!editOrder}
          onOpenChange={(open) => { if (!open) setEditOrder(null); }}
          onUpdated={fetchAll}
        />
      )}
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
