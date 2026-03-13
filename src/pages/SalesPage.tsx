import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Search, Filter, X, Plus, Upload, Download, FileSpreadsheet, Pencil } from "lucide-react";
import { toast } from "sonner";
import { importOrdersFromFile, exportOrdersToExcel, downloadImportTemplate, exportDataToExcel } from "@/lib/excelUtils";
import CreateOrderDialog from "@/components/CreateOrderDialog";
import EditOrderDialog from "@/components/EditOrderDialog";

interface Order {
  id: string;
  order_type: string;
  order_name: string;
  quote_no: string | null;
  sales_order_no: string | null;
  dealer_name: string;
  salesperson: string | null;
  product_type: string;
  other_product_type: string | null;
  colour_shade: string | null;
  total_windows: number;
  sqft: number;
  order_value: number;
  advance_received: number;
  balance_amount: number;
  commercial_status: string;
  dispatch_status: string;
  survey_done_windows: number;
  design_released_windows: number;
}

interface ReworkInfo {
  totalQty: number;
  latestIssue: string | null;
}

const commercialColor = (status: string) => {
  if (status === "Order Confirmed" || status === "Confirmed") return "bg-success/15 text-success border-success/20";
  if (status === "Pipeline" || status === "pending") return "bg-warning/15 text-warning border-warning/20";
  return "bg-muted text-muted-foreground";
};

const dispatchColor = (status: string) => {
  if (status === "Fully Dispatched") return "bg-success/15 text-success border-success/20";
  if (status === "Partially Dispatched") return "bg-warning/15 text-warning border-warning/20";
  if (status === "Not Dispatched") return "bg-muted text-muted-foreground";
  return "bg-muted text-muted-foreground";
};

const typeColor = (type: string) => {
  if (type === "Project") return "bg-primary/15 text-primary border-primary/20";
  return "bg-accent text-accent-foreground";
};

interface Filters {
  salesperson: string;
  orderOwner: string;
  commercialStatus: string;
}

const emptyFilters: Filters = { salesperson: "", orderOwner: "", commercialStatus: "" };

export default function SalesPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [reworkMap, setReworkMap] = useState<Record<string, ReworkInfo>>({});
  const [receiptMap, setReceiptMap] = useState<Record<string, number>>({});
  const [dispatchStatusMap, setDispatchStatusMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [tab, setTab] = useState("open");

  const [salespersons, setSalespersons] = useState<string[]>([]);
  const [owners, setOwners] = useState<string[]>([]);
  const [commercialStatuses, setCommercialStatuses] = useState<string[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOrderId, setEditOrderId] = useState<string | null>(null);

  const fetchData = async () => {
    const [ordersRes, reworkRes, paymentRes, prodLogsRes, dispatchLogsRes] = await Promise.all([
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.from("rework_logs").select("order_id, rework_qty, rework_issue, reported_at").order("reported_at", { ascending: false }),
      supabase.from("payment_logs").select("order_id, amount").eq("status", "Confirmed"),
      (supabase.from("production_logs" as any) as any).select("order_id, stage, windows_completed"),
      (supabase.from("dispatch_logs" as any) as any).select("order_id, windows_dispatched"),
    ]);
    if (ordersRes.error) toast.error("Failed to load orders");
    else setOrders((ordersRes.data as unknown as Order[]) || []);

    // Rework map
    const logs = reworkRes.data || [];
    const rMap: Record<string, ReworkInfo> = {};
    for (const log of logs) {
      if (!rMap[log.order_id]) {
        rMap[log.order_id] = { totalQty: 0, latestIssue: log.rework_issue };
      }
      rMap[log.order_id].totalQty += Number(log.rework_qty);
    }
    setReworkMap(rMap);

    // Receipt map (sum of confirmed payments)
    const payments = paymentRes.data || [];
    const pMap: Record<string, number> = {};
    for (const p of payments) {
      pMap[p.order_id] = (pMap[p.order_id] || 0) + Number(p.amount);
    }
    setReceiptMap(pMap);

    // Dispatch Status Aggregation
    const packedMap: Record<string, number> = {};
    for (const p of (prodLogsRes.data || []) as any[]) {
      if (p.stage === "Packed") {
        packedMap[p.order_id] = (packedMap[p.order_id] || 0) + Number(p.windows_completed);
      }
    }

    const dispatchedMap: Record<string, number> = {};
    for (const d of (dispatchLogsRes.data || []) as any[]) {
      dispatchedMap[d.order_id] = (dispatchedMap[d.order_id] || 0) + Number(d.windows_dispatched);
    }

    const dStatusMap: Record<string, string> = {};
    for (const o of (ordersRes.data || []) as any[]) {
      const atw = o.design_released_windows || 0;
      const dispatched = dispatchedMap[o.id] || 0;

      if (dispatched === 0) dStatusMap[o.id] = "Not Dispatched";
      else if (dispatched < atw) dStatusMap[o.id] = "Partially Dispatched";
      else dStatusMap[o.id] = "Fully Dispatched";
    }
    setDispatchStatusMap(dStatusMap);

    setLoading(false);
  };

  const fetchFilterOptions = async () => {
    const [sp, cs] = await Promise.all([
      supabase.from("salespersons").select("name").eq("active", true).order("name"),
      supabase.from("commercial_statuses").select("name").eq("active", true).order("name"),
    ]);
    setSalespersons((sp.data || []).map((d: any) => d.name));
    setCommercialStatuses((cs.data || []).map((d: any) => d.name));
    const uniqueOwners = [...new Set(orders.map((o) => o.dealer_name).filter(Boolean))].sort();
    setOwners(uniqueOwners);
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { if (orders.length > 0) fetchFilterOptions(); }, [orders.length]);

  const tabFiltered = orders.filter((o) => {
    const status = dispatchStatusMap[o.id] || "Not Dispatched";
    if (tab === "open") return status !== "Fully Dispatched";
    if (tab === "dispatched") return status === "Fully Dispatched";
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
    if (filters.commercialStatus && o.commercial_status !== filters.commercialStatus) return false;
    return true;
  });

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

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
        fetchData();
      }
    };
    input.click();
  };

  const handleExport = () => {
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
      "Product": getProductDisplay(o),
      "Shade": o.colour_shade || "",
      "Win": o.total_windows,
      "Value": o.order_value,
      "Receipt": receiptMap[o.id] || 0,
      "Balance": (o.order_value || 0) - (receiptMap[o.id] || 0),
      "Commercial Status": o.commercial_status,
      "Dispatch Status": dispatchStatusMap[o.id] || "Not Dispatched"
    }));

    exportDataToExcel(data, headers, `sales_export_${tab}.xlsx`);
  };

  // Compute "Available to Work" = survey_done - design_released (simplistic)
  const getAvlToWork = (o: Order) => {
    return o.design_released_windows;
  };

  const getProductDisplay = (o: Order) => {
    if (o.other_product_type) return `${o.product_type}, ${o.other_product_type}`;
    return o.product_type;
  };

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sales</h1>
          <p className="text-sm text-muted-foreground">{orders.length} total orders</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => downloadImportTemplate()}>
            <FileSpreadsheet className="h-4 w-4" /> Template
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={handleImport}>
            <Upload className="h-4 w-4" /> Import
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={handleExport}>
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New Order
          </Button>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, owner, quotation..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
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
            <FilterSelect label="Order Owner" value={filters.orderOwner} options={owners} onChange={(v) => setFilters({ ...filters, orderOwner: v })} />
            <FilterSelect label="Commercial Status" value={filters.commercialStatus} options={commercialStatuses} onChange={(v) => setFilters({ ...filters, commercialStatus: v })} />
          </PopoverContent>
        </Popover>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList>
          <TabsTrigger value="open">Open Orders</TabsTrigger>
          <TabsTrigger value="dispatched">Dispatched Orders</TabsTrigger>
          <TabsTrigger value="all">All Orders</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="rounded-md border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[60px]">Type</TableHead>
              <TableHead className="min-w-[140px]">Order Name</TableHead>
              <TableHead className="min-w-[120px]">Owner</TableHead>
              <TableHead className="min-w-[130px]">Quotation No</TableHead>
              <TableHead className="min-w-[70px]">SO No</TableHead>
              <TableHead className="min-w-[80px]">Shade</TableHead>
              <TableHead className="min-w-[100px]">Salesperson</TableHead>
              <TableHead className="min-w-[120px]">Product Type</TableHead>
              <TableHead className="text-right min-w-[70px]">Windows</TableHead>
              <TableHead className="text-right min-w-[80px]">Avl to Work</TableHead>
              <TableHead className="text-right min-w-[60px]">Sqft</TableHead>
              <TableHead className="text-right min-w-[90px]">Order Value</TableHead>
              <TableHead className="text-right min-w-[80px]">Receipt</TableHead>
              <TableHead className="text-right min-w-[80px]">Balance</TableHead>
              <TableHead className="text-right min-w-[80px]">Rework Total</TableHead>
              <TableHead className="min-w-[130px]">Latest Issue</TableHead>
              <TableHead className="min-w-[120px]">Dispatch Status</TableHead>
              <TableHead className="min-w-[110px]">Commercial</TableHead>
              <TableHead className="w-[40px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={19} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={19} className="text-center py-8 text-muted-foreground">No orders found</TableCell>
              </TableRow>
            ) : (
              filtered.map((order) => {
                const rework = reworkMap[order.id];
                const receipt = receiptMap[order.id] ?? 0;
                const balance = order.order_value - receipt;
                return (
                  <TableRow key={order.id} className="hover:bg-muted/50">
                    <TableCell>
                      <Badge variant="outline" className={typeColor(order.order_type)}>
                        {order.order_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link to={`/orders/${order.id}`} className="font-medium text-primary hover:underline">{order.order_name}</Link>
                    </TableCell>
                    <TableCell className="text-sm">{order.dealer_name}</TableCell>
                    <TableCell className="text-sm">{order.quote_no || "—"}</TableCell>
                    <TableCell className="text-sm">{order.sales_order_no || "—"}</TableCell>
                    <TableCell className="text-sm">{order.colour_shade || "—"}</TableCell>
                    <TableCell className="text-sm">{order.salesperson || "—"}</TableCell>
                    <TableCell className="text-sm">{getProductDisplay(order)}</TableCell>
                    <TableCell className="text-right">{order.total_windows}</TableCell>
                    <TableCell className="text-right">{getAvlToWork(order)}</TableCell>
                    <TableCell className="text-right">{order.sqft}</TableCell>
                    <TableCell className="text-right font-medium">₹{Number(order.order_value).toLocaleString()}</TableCell>
                    <TableCell className="text-right">₹{Number(receipt).toLocaleString()}</TableCell>
                    <TableCell className="text-right">₹{Number(balance).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{rework?.totalQty || 0}</TableCell>
                    <TableCell className="text-sm text-muted-foreground truncate max-w-[180px]">{rework?.latestIssue || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={dispatchColor(dispatchStatusMap[order.id] || "Not Dispatched")}>
                        {dispatchStatusMap[order.id] || "Not Dispatched"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={commercialColor(order.commercial_status)}>
                        {order.commercial_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditOrderId(order.id)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <CreateOrderDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={fetchData} />
      {editOrderId && (
        <EditOrderDialog
          order={orders.find((o) => o.id === editOrderId)}
          open={!!editOrderId}
          onOpenChange={(open) => { if (!open) setEditOrderId(null); }}
          onUpdated={fetchData}
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
