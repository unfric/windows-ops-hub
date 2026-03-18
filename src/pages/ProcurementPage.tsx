import { useEffect, useState } from "react";
import { api } from "@/services/api";
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
import DataTableLayout from "@/components/ui/data-table-layout";
import { cn } from "@/lib/utils";

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
  order_date: string | null;
  tat_date: string | null;
  target_delivery_date: string | null;
  dispatch_date: string | null;
}

interface Filters {
  salesperson: string;
  orderOwner: string;
}

const emptyFilters: Filters = { salesperson: "", orderOwner: "" };

const poColor = (status: string) => {
  if (status === "Delivered" || status === "In Stock / Available" || status === "Not Required") return "bg-success/15 text-success border-success/20";
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
    try {
      const data = await api.orders.list();
      if (!data.orders) { setLoading(false); return; }
      const all = (data.orders as unknown as Order[]) || [];
      // Only show orders where design has been released (ATW > 0)
      setOrders(all.filter((o) => (o.design_released_windows || 0) > 0));
    } catch (err: any) {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const settings = await api.settings.list();
      if (settings) {
        setSalespersons(settings.salespersons?.map((s: any) => s.name) || []);
      }
      setOwners([...new Set(orders.map((o) => o.dealer_name).filter(Boolean))].sort());
    } catch (err) {
      console.error("Error fetching filter options:", err);
    }
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

  const activeFilters = Object.entries(filters)
    .filter(([_, v]) => v)
    .map(([k, v]) => ({
      key: k,
      label: k === "orderOwner" ? "Owner" : k.charAt(0).toUpperCase() + k.slice(1),
      value: v
    }));

  const activeFilterCount = activeFilters.length;

  const handleExport = () => {
    const headers = [
      "Order", "Owner", "Salesperson", 
      "Order Date", "TAT Date", "Target Delv", "Disp Date",
      "Hardware PO", "Extrusion PO", "Glass PO", "Coating",
      "H-Deliv", "E-Deliv", "G-Deliv", "C-Deliv", "Remarks"
    ];
    const data = filtered.map(o => ({
      "Order": o.order_name,
      "Owner": o.dealer_name,
      "Salesperson": o.salesperson || "",
      "Order Date": o.order_date || "",
      "TAT Date": o.tat_date || "",
      "Target Delv": o.target_delivery_date || "",
      "Disp Date": o.dispatch_date || "",
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

  const columns = [
    {
      header: "Project Name",
      accessor: (o: Order) => (
        <div className="flex flex-col">
          <Link to={`/orders/${o.id}`} className="font-medium text-blue-600 hover:underline">{o.order_name}</Link>
          <span className="text-[10px] text-muted-foreground uppercase">{o.order_type}</span>
        </div>
      ),
      className: "min-w-[180px]"
    },
    {
      header: "Order Date",
      accessor: (o: Order) => o.order_date ? new Date(o.order_date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short' }) : "—",
      sortValue: (o: Order) => o.order_date,
      className: "whitespace-nowrap",
    },
    {
      header: "TAT Date",
      accessor: (o: Order) => o.tat_date ? new Date(o.tat_date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short' }) : "—",
      sortValue: (o: Order) => o.tat_date,
      className: "whitespace-nowrap text-blue-600 font-medium",
    },
    {
      header: "Target Delv",
      accessor: (o: Order) => o.target_delivery_date ? new Date(o.target_delivery_date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short' }) : "—",
      sortValue: (o: Order) => o.target_delivery_date,
      className: "whitespace-nowrap",
    },
    {
      header: "Dispatch Date",
      accessor: (o: Order) => o.dispatch_date ? new Date(o.dispatch_date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short' }) : "—",
      sortValue: (o: Order) => o.dispatch_date,
      className: "whitespace-nowrap text-emerald-600 font-medium",
    },
    {
      header: "Managed By",
      accessor: (o: Order) => <span className="text-[#5c6e82]">{o.dealer_name}</span>,
    },
    {
      header: "Salesperson",
      accessor: (o: Order) => <span className="text-[#5c6e82]">{o.salesperson || "—"}</span>,
    },
    {
      header: "Shade",
      accessor: (o: Order) => <span className="text-[#5c6e82]">{o.colour_shade || "—"}</span>,
    },
    {
      header: "Qty",
      accessor: (o: Order) => <span className="text-[#5c6e82] whitespace-nowrap">{o.design_released_windows} / {o.total_windows}</span>,
      className: "whitespace-nowrap",
    },
    {
      header: "Hardware PO",
      accessor: (o: Order) => (
        <Badge variant="outline" className={cn("text-[10px] uppercase font-semibold", poColor(o.hardware_po_status))}>
          {formatPoDisplay(o.hardware_po_status, o.hardware_delivery_date)}
        </Badge>
      ),
    },
    {
      header: "Extrusion PO",
      accessor: (o: Order) => (
        <Badge variant="outline" className={cn("text-[10px] uppercase font-semibold", poColor(o.extrusion_po_status))}>
          {formatPoDisplay(o.extrusion_po_status, o.extrusion_delivery_date)}
        </Badge>
      ),
    },
    {
      header: "Glass PO",
      accessor: (o: Order) => (
        <Badge variant="outline" className={cn("text-[10px] uppercase font-semibold", poColor(o.glass_po_status))}>
          {formatPoDisplay(o.glass_po_status, o.glass_delivery_date)}
        </Badge>
      ),
    },
    {
      header: "Sent to Coating",
      accessor: (o: Order) => (
        <Badge variant="outline" className={cn("text-[10px] uppercase font-semibold", poColor(o.coating_status))}>
          {formatPoDisplay(o.coating_status, o.coating_delivery_date)}
        </Badge>
      ),
    },
    {
      header: "Remarks",
      accessor: (o: Order) => <span className="text-[#5c6e82] max-w-[120px] truncate block" title={o.procurement_remarks || ""}>{o.procurement_remarks || "—"}</span>,
    }
  ];

  const tabsConfig = [
    { id: "po_pending", label: "PO Pending" },
    { id: "delivery_pending", label: "Delivery Pending" },
    { id: "completed", label: "Completed" },
    { id: "all", label: "All Orders" },
  ];


  return (
    <div className="flex-1 w-full bg-white flex flex-col h-[calc(100vh-64px)]">
      <DataTableLayout
        moduleName="procurement"
        title="Procurement"
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
        onExport={handleExport}
        filterChildren={
          <div className="space-y-4">
            <FilterSelect label="Salesperson" value={filters.salesperson} options={salespersons} onChange={(v) => setFilters(p => ({ ...p, salesperson: v }))} />
            <FilterSelect label="Order Owner" value={filters.orderOwner} options={owners} onChange={(v) => setFilters(p => ({ ...p, orderOwner: v }))} />
          </div>
        }
      />
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
