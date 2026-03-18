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
  hardware_availability: string;
  extrusion_availability: string;
  glass_availability: string;
  coated_extrusion_availability: string;
  store_remarks: string | null;
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

const availColor = (status: string) => {
  if (status === "In Stock / Available" || status === "Not Required") return "bg-success/15 text-success border-success/20";
  if (status === "Partially Available" || status === "PO Placed" || status === "Sent to Coating") return "bg-warning/15 text-warning border-warning/20";
  return "bg-destructive/15 text-destructive border-destructive/20";
};

const isMaterialAvailable = (o: Order) =>
  (o.hardware_availability === "In Stock / Available" || o.hardware_availability === "Not Required") &&
  (o.extrusion_availability === "In Stock / Available" || o.extrusion_availability === "Not Required") &&
  (o.glass_availability === "In Stock / Available" || o.glass_availability === "Not Required") &&
  (o.coated_extrusion_availability === "In Stock / Available" || o.coated_extrusion_availability === "Not Required");

const isMaterialPending = (o: Order) => !isMaterialAvailable(o);

export default function StorePage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [tab, setTab] = useState("pending");
  const [salespersons, setSalespersons] = useState<string[]>([]);
  const [owners, setOwners] = useState<string[]>([]);

  const fetchData = async () => {
    try {
      const data = await api.orders.list();
      if (!data.orders) { setLoading(false); return; }
      const released = (data.orders as unknown as Order[]) || [];
      // Only show orders where design has been released (ATW > 0)
      setOrders(released.filter((o) => (o.design_released_windows || 0) > 0));
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
    if (tab === "pending") return isMaterialPending(o);
    if (tab === "available") return isMaterialAvailable(o);
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
      "Hardware Avl", "Extrusion Avl", "Glass Avl", "Coated Extrusion Avl", "Remarks"
    ];
    const data = filtered.map(o => ({
      "Order": o.order_name,
      "Owner": o.dealer_name,
      "Salesperson": o.salesperson || "",
      "Order Date": o.order_date || "",
      "TAT Date": o.tat_date || "",
      "Target Delv": o.target_delivery_date || "",
      "Disp Date": o.dispatch_date || "",
      "Hardware Avl": o.hardware_availability,
      "Extrusion Avl": o.extrusion_availability,
      "Glass Avl": o.glass_availability,
      "Coated Extrusion Avl": o.coated_extrusion_availability,
      "Remarks": o.store_remarks || ""
    }));
    exportDataToExcel(data, headers, `store_export_${tab}.xlsx`);
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
      header: "Hardware",
      accessor: (o: Order) => (
        <Badge variant="outline" className={cn("text-[10px] uppercase font-semibold", availColor(o.hardware_availability))}>
          {o.hardware_availability}
        </Badge>
      ),
    },
    {
      header: "Extrusion",
      accessor: (o: Order) => (
        <Badge variant="outline" className={cn("text-[10px] uppercase font-semibold", availColor(o.extrusion_availability))}>
          {o.extrusion_availability}
        </Badge>
      ),
    },
    {
      header: "Glass",
      accessor: (o: Order) => (
        <Badge variant="outline" className={cn("text-[10px] uppercase font-semibold", availColor(o.glass_availability))}>
          {o.glass_availability}
        </Badge>
      ),
    },
    {
      header: "Coated Ext.",
      accessor: (o: Order) => (
        <Badge variant="outline" className={cn("text-[10px] uppercase font-semibold", availColor(o.coated_extrusion_availability))}>
          {o.coated_extrusion_availability}
        </Badge>
      ),
    },
    {
      header: "Remarks",
      accessor: (o: Order) => <span className="text-[#5c6e82] max-w-[120px] truncate block" title={o.store_remarks || ""}>{o.store_remarks || "—"}</span>,
    }
  ];

  const tabsConfig = [
    { id: "pending", label: "Material Pending" },
    { id: "available", label: "Material Available" },
    { id: "all", label: "All Orders" },
  ];



  return (
    <div className="flex-1 w-full bg-white flex flex-col h-[calc(100vh-64px)]">
      <DataTableLayout
        moduleName="stores"
        title="Store"
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
