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
import { Search, Filter, X, Download } from "lucide-react";
import { toast } from "sonner";
import { exportDataToExcel } from "@/lib/excelUtils";

interface Order {
  id: string;
  order_type: string;
  order_name: string;
  dealer_name: string;
  quote_no: string | null;
  sales_order_no: string | null;
  colour_shade: string | null;
  salesperson: string | null;
  product_type: string;
  total_windows: number;
  sqft: number;
  order_value: number;
  hardware_po_status: string;
  extrusion_po_status: string;
  glass_po_status: string;
  coating_status: string;
  hardware_delivery_date: string | null;
  extrusion_delivery_date: string | null;
  glass_delivery_date: string | null;
  coating_delivery_date: string | null;
  procurement_remarks: string | null;
  design_released_windows: number;
}

interface Filters {
  salesperson: string;
  orderOwner: string;
}

const emptyFilters: Filters = { salesperson: "", orderOwner: "" };

const PO_STATUSES = ["Pending PO", "PO Placed", "Delivered", "In Stock / Available", "Not Required"];
const COATING_STATUSES = ["Pending Coating", "Sent to Coating", "Delivered", "In Stock / Available", "Not Required"];

const poColor = (status: string) => {
  if (status === "Delivered" || status === "In Stock / Available") return "bg-success/15 text-success border-success/20";
  if (status === "PO Placed" || status === "Sent to Coating" || status === "Partially Available") return "bg-warning/15 text-warning border-warning/20";
  return "bg-muted text-muted-foreground";
};

const formatPoDisplay = (status: string, date: string | null) => {
  if (status === "PO Placed" && date) return `Delivery by ${new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
  if (status === "Sent to Coating" && date) return `Delivery by ${new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
  return status;
};

const isPoPending = (o: Order) => {
  const statuses = [o.hardware_po_status, o.extrusion_po_status, o.glass_po_status, o.coating_status];
  return statuses.some((s) => s === "Pending PO" || s === "Pending Coating" || s === "Partially Available");
};

const isDeliveryPending = (o: Order) => {
  const statuses = [o.hardware_po_status, o.extrusion_po_status, o.glass_po_status, o.coating_status];
  return statuses.some((s) => s === "PO Placed" || s === "Sent to Coating");
};

const isCompleted = (o: Order) => {
  const statuses = [o.hardware_po_status, o.extrusion_po_status, o.glass_po_status, o.coating_status];
  return statuses.every((s) => s === "Delivered" || s === "In Stock / Available" || s === "Not Required") &&
    statuses.some((s) => s === "Delivered" || s === "In Stock / Available");
};

export default function ProcurementPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [tab, setTab] = useState("po_pending");
  const [salespersons, setSalespersons] = useState<string[]>([]);
  const [owners, setOwners] = useState<string[]>([]);

  const fetchData = async () => {
    const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    if (error) toast.error("Failed to load orders");
    else {
      // Only show orders where design has been released (ATW > 0)
      const all = (data as unknown as Order[]) || [];
      setOrders(all.filter((o) => (o.design_released_windows || 0) > 0));
    }
    setLoading(false);
  };

  const fetchFilterOptions = async () => {
    const { data: sp } = await supabase.from("salespersons").select("name").eq("active", true).order("name");
    setSalespersons((sp || []).map((d: any) => d.name));
    setOwners([...new Set(orders.map((o) => o.dealer_name).filter(Boolean))].sort());
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { if (orders.length > 0) fetchFilterOptions(); }, [orders.length]);

  const tabFiltered = orders.filter((o) => {
    if (tab === "po_pending") return isPoPending(o);
    if (tab === "delivery_pending") return isDeliveryPending(o);
    if (tab === "completed") return isCompleted(o);
    return true;
  });

  const filtered = tabFiltered.filter((o) => {
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

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const handleExport = () => {
    const headers = [
      "Order", "Owner", "Salesperson", "Hardware PO", "Extrusion PO", "Glass PO", "Coating",
      "H-Deliv", "E-Deliv", "G-Deliv", "C-Deliv", "Remarks"
    ];
    const data = filtered.map(o => ({
      "Order": o.order_name,
      "Owner": o.dealer_name,
      "Salesperson": o.salesperson || "",
      "Hardware PO": o.hardware_po_status,
      "Extrusion PO": o.extrusion_po_status,
      "Glass PO": o.glass_po_status,
      "Coating": o.coating_status,
      "H-Deliv": o.hardware_delivery_date || "",
      "E-Deliv": o.extrusion_delivery_date || "",
      "G-Deliv": o.glass_delivery_date || "",
      "C-Deliv": o.coating_delivery_date || "",
      "Remarks": o.procurement_remarks || ""
    }));
    exportDataToExcel(data, headers, `procurement_export_${tab}.xlsx`);
  };

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Procurement</h1>
          <p className="text-sm text-muted-foreground">{orders.length} total orders</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={handleExport}>
            <Download className="h-4 w-4" /> Export
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
          </PopoverContent>
        </Popover>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList>
          <TabsTrigger value="po_pending">PO Pending</TabsTrigger>
          <TabsTrigger value="delivery_pending">Delivery Pending</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="all">All Orders</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="rounded-md border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[80px]">Type</TableHead>
              <TableHead className="min-w-[140px]">Order Name</TableHead>
              <TableHead className="min-w-[120px]">Owner</TableHead>
              <TableHead className="min-w-[100px]">Quotation No</TableHead>
              <TableHead className="min-w-[80px]">SO No</TableHead>
              <TableHead className="min-w-[100px]">Shade</TableHead>
              <TableHead className="min-w-[100px]">Salesperson</TableHead>
              <TableHead className="min-w-[140px]">Product Type</TableHead>
              <TableHead className="text-right min-w-[60px]">Windows</TableHead>
              <TableHead className="text-right min-w-[70px]">Avl to Work</TableHead>
              <TableHead className="text-right min-w-[60px]">Sqft</TableHead>
              <TableHead className="text-right min-w-[90px]">Order Value</TableHead>
              <TableHead className="min-w-[100px]">Hardware PO</TableHead>
              <TableHead className="min-w-[100px]">Extrusion PO</TableHead>
              <TableHead className="min-w-[100px]">Glass PO</TableHead>
              <TableHead className="min-w-[120px]">Sent to Coating</TableHead>
              <TableHead className="min-w-[120px]">Remarks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={17} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={17} className="text-center py-8 text-muted-foreground">No orders found</TableCell></TableRow>
            ) : (
              filtered.map((order) => (
                <TableRow key={order.id} className="hover:bg-muted/50">
                  <TableCell><Badge variant="outline" className="text-xs">{order.order_type}</Badge></TableCell>
                  <TableCell>
                    <Link to={`/orders/${order.id}`} className="font-medium text-primary hover:underline">{order.order_name}</Link>
                  </TableCell>
                  <TableCell className="text-sm">{order.dealer_name}</TableCell>
                  <TableCell className="text-sm">{order.quote_no || "—"}</TableCell>
                  <TableCell className="text-sm">{order.sales_order_no || "—"}</TableCell>
                  <TableCell className="text-sm">{order.colour_shade || "—"}</TableCell>
                  <TableCell className="text-sm">{order.salesperson || "—"}</TableCell>
                  <TableCell className="text-sm max-w-[180px] truncate" title={order.product_type}>{order.product_type}</TableCell>
                  <TableCell className="text-right">{order.total_windows}</TableCell>
                  <TableCell className="text-right">{order.design_released_windows}</TableCell>
                  <TableCell className="text-right">{Number(order.sqft).toFixed(1)}</TableCell>
                  <TableCell className="text-right font-medium">₹{Number(order.order_value).toLocaleString()}</TableCell>
                  <TableCell><Badge variant="outline" className={`text-xs ${poColor(order.hardware_po_status)}`}>{formatPoDisplay(order.hardware_po_status, order.hardware_delivery_date)}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className={`text-xs ${poColor(order.extrusion_po_status)}`}>{formatPoDisplay(order.extrusion_po_status, order.extrusion_delivery_date)}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className={`text-xs ${poColor(order.glass_po_status)}`}>{formatPoDisplay(order.glass_po_status, order.glass_delivery_date)}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className={`text-xs ${poColor(order.coating_status)}`}>{formatPoDisplay(order.coating_status, order.coating_delivery_date)}</Badge></TableCell>
                  <TableCell className="text-sm max-w-[120px] truncate" title={order.procurement_remarks || ""}>{order.procurement_remarks || "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <Select value={value || "all"} onValueChange={(v) => onChange(v === "all" ? "" : v)}>
        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
