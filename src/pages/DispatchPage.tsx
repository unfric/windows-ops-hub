import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportDataToExcel } from "@/lib/excelUtils";
import DataTableLayout from "@/components/ui/data-table-layout";
import { cn } from "@/lib/utils";

interface OrderWithDispatch {
  id: string;
  order_name: string;
  dealer_name: string;
  order_type: string;
  quote_no: string | null;
  sales_order_no: string | null;
  colour_shade: string | null;
  salesperson: string | null;
  product_type: string;
  total_windows: number;
  design_released_windows: number;
  sqft: number;
  order_value: number;
  approval_for_dispatch: string;
  PackedTotal: number;
  dispatched: number;
  balance: number;
  order_date: string | null;
  tat_date: string | null;
  target_delivery_date: string | null;
  dispatch_date: string | null;
}

export default function DispatchPage() {
  const [orders, setOrders] = useState<OrderWithDispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await api.orders.list();
        if (!data.orders) { setLoading(false); return; }

        const PackedMap: Record<string, number> = {};
        ((data.production_logs || []) as any[]).forEach((l: any) => {
          if (l.stage === "Packed") PackedMap[l.order_id] = (PackedMap[l.order_id] || 0) + l.windows_completed;
        });

        const dispMap: Record<string, number> = {};
        ((data.dispatch_logs || []) as any[]).forEach((d: any) => {
          dispMap[d.order_id] = (dispMap[d.order_id] || 0) + d.windows_dispatched;
        });

        const mapped: OrderWithDispatch[] = (data.orders as any[])
          .filter((o) => (PackedMap[o.id] || 0) > 0 || (dispMap[o.id] || 0) > 0)
          .map((o) => {
            const Packed = PackedMap[o.id] || 0;
            const disp = dispMap[o.id] || 0;
            return {
              ...o,
              PackedTotal: Packed,
              dispatched: disp,
              balance: Packed - disp
            };
          });

        setOrders(mapped);
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleExport = (activeTab: string) => {
    const list = getFiltered(activeTab);
    const headers = [
      "Order", "Owner", "Quote No", "SO No", "Salesperson", 
      "Order Date", "TAT Date", "Target Delv", "Disp Date",
      "Product Type", "Shade", "Sqft", "Windows", "Fin Appr", "Ready", "Dispatched", "Balance"
    ];
    const data = list.map(o => ({
      "Order": o.order_name,
      "Owner": o.dealer_name,
      "Quote No": o.quote_no || "",
      "SO No": o.sales_order_no || "",
      "Salesperson": o.salesperson || "",
      "Order Date": o.order_date || "",
      "TAT Date": o.tat_date || "",
      "Target Delv": o.target_delivery_date || "",
      "Disp Date": o.dispatch_date || "",
      "Product Type": o.product_type || "",
      "Shade": o.colour_shade || "",
      "Sqft": o.sqft || 0,
      "Windows": o.total_windows,
      "Fin Appr": o.approval_for_dispatch,
      "Ready": o.PackedTotal,
      "Dispatched": o.dispatched,
      "Balance": o.balance
    }));
    exportDataToExcel(data, headers, `dispatch_export_${activeTab}.xlsx`);
  };

  const getFiltered = (tab: string) => {
    switch (tab) {
      case "ready":
        return orders.filter((o) => o.PackedTotal > 0 && o.dispatched === 0);
      case "partial":
        return orders.filter((o) => o.dispatched > 0 && o.dispatched < (o.design_released_windows || 0));
      case "full":
        return orders.filter((o) => o.dispatched > 0 && o.dispatched >= (o.design_released_windows || 0) && (o.design_released_windows || 0) > 0);
      default:
        return orders;
    }
  };

  const activeTabList = getFiltered(activeTab);

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ salesperson: "", orderOwner: "" });
  const [salespersons, setSalespersons] = useState<string[]>([]);
  const [owners, setOwners] = useState<string[]>([]);

  useEffect(() => {
    if (orders.length > 0) {
      setOwners([...new Set(orders.map(o => o.dealer_name).filter(Boolean))].sort());
      setSalespersons([...new Set(orders.map(o => o.salesperson).filter(Boolean))].sort());
    }
  }, [orders]);

  const filtered = activeTabList.filter((o) => {
    if (search) {
      const s = search.toLowerCase();
      if (!o.order_name.toLowerCase().includes(s) &&
        !o.dealer_name.toLowerCase().includes(s) &&
        !(o.quote_no || "").toLowerCase().includes(s) &&
        !(o.sales_order_no || "").toLowerCase().includes(s)) return false;
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
  const emptyFilters = { salesperson: "", orderOwner: "" };

  const columns = [
    {
      header: "Project Name",
      accessor: (o: OrderWithDispatch) => (
        <div className="flex flex-col">
          <Link to={`/orders/${o.id}`} className="font-medium text-blue-600 hover:underline">{o.order_name}</Link>
          <span className="text-[10px] text-muted-foreground uppercase">{o.order_type}</span>
          <div className="text-[10px] text-muted-foreground mt-0.5">Q: {o.quote_no || "—"} | S: {o.sales_order_no || "—"}</div>
        </div>
      ),
      className: "min-w-[180px]"
    },
    {
      header: "Order Date",
      accessor: (o: OrderWithDispatch) => o.order_date ? new Date(o.order_date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short' }) : "—",
      sortValue: (o: OrderWithDispatch) => o.order_date,
      className: "whitespace-nowrap",
    },
    {
      header: "TAT Date",
      accessor: (o: OrderWithDispatch) => o.tat_date ? new Date(o.tat_date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short' }) : "—",
      sortValue: (o: OrderWithDispatch) => o.tat_date,
      className: "whitespace-nowrap text-blue-600 font-medium",
    },
    {
      header: "Target Delv",
      accessor: (o: OrderWithDispatch) => o.target_delivery_date ? new Date(o.target_delivery_date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short' }) : "—",
      sortValue: (o: OrderWithDispatch) => o.target_delivery_date,
      className: "whitespace-nowrap",
    },
    {
      header: "Dispatch Date",
      accessor: (o: OrderWithDispatch) => o.dispatch_date ? new Date(o.dispatch_date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short' }) : "—",
      sortValue: (o: OrderWithDispatch) => o.dispatch_date,
      className: "whitespace-nowrap text-emerald-600 font-medium",
    },
    {
      header: "Managed By",
      accessor: (o: OrderWithDispatch) => <span className="text-[#5c6e82]">{o.dealer_name}</span>,
    },
    {
      header: "Salesperson",
      accessor: (o: OrderWithDispatch) => <span className="text-[#5c6e82]">{o.salesperson || "—"}</span>,
    },
    {
      header: "Product / Shade",
      accessor: (o: OrderWithDispatch) => (
        <div className="flex flex-col text-[#5c6e82] max-w-[140px] truncate">
          <span className="truncate" title={o.product_type}>{o.product_type || "—"}</span>
          <span className="text-[10px] text-muted-foreground">{o.colour_shade || "—"}</span>
        </div>
      ),
    },
    {
      header: "Sqft",
      accessor: (o: OrderWithDispatch) => <span className="text-[#5c6e82]">{o.sqft?.toFixed(1) || "0.0"}</span>,
      className: "text-right"
    },
    {
      header: "Qty",
      accessor: (o: OrderWithDispatch) => <span className="text-[#5c6e82] font-medium whitespace-nowrap">{o.design_released_windows || 0} / {o.total_windows}</span>,
      className: "whitespace-nowrap",
    },
    {
      header: "Fin Appr",
      accessor: (o: OrderWithDispatch) => (
        <Badge variant="outline" className={cn("text-[10px] uppercase font-semibold", o.approval_for_dispatch === "Approved" ? "bg-success/15 text-success border-success/20" : "bg-muted text-muted-foreground")}>
          {o.approval_for_dispatch}
        </Badge>
      ),
      className: "text-center"
    },
    {
      header: "Ready",
      accessor: (o: OrderWithDispatch) => <span className="font-bold text-blue-600">{o.PackedTotal}</span>,
      className: "text-right"
    },
    {
      header: "Dispatch",
      accessor: (o: OrderWithDispatch) => <span className="font-bold text-emerald-600">{o.dispatched}</span>,
      className: "text-right"
    },
    {
      header: "Balance",
      accessor: (o: OrderWithDispatch) => <span className="font-bold text-destructive">{o.balance}</span>,
      className: "text-right"
    }
  ];

  const tabsConfig = [
    { id: "ready", label: "Ready for Dispatch" },
    { id: "partial", label: "Partially Dispatched" },
    { id: "full", label: "Fully Dispatched" },
    { id: "all", label: "All Orders" },
  ];



  return (
    <div className="flex-1 w-full bg-white flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      <DataTableLayout
        moduleName="dispatch"
        title={`Dispatch (${orders.length} orders in queue)`}
        tabs={tabsConfig}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchValue={search}
        onSearch={setSearch}
        activeFilterCount={activeFilterCount}
        activeFilters={activeFilters}
        onRemoveFilter={(key) => setFilters(prev => ({ ...prev, [key]: "" }))}
        onClearFilters={() => setFilters(emptyFilters)}
        columns={columns}
        data={filtered}
        getRowId={(o) => o.id}
        onExport={() => handleExport(activeTab)}
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
      <label className="text-xs text-muted-foreground uppercase font-semibold">{label}</label>
      <Select value={value || "all"} onValueChange={(v) => onChange(v === "all" ? "" : v)}>
        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
