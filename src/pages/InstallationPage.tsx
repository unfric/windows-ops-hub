import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/services/api";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { exportDataToExcel } from "@/lib/excelUtils";
import DataTableLayout from "@/components/ui/data-table-layout";
import { cn } from "@/lib/utils";

export default function InstallationPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [installMap, setInstallMap] = useState<Record<string, number>>({});
  const [dispatchMap, setDispatchMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await api.orders.list();
        if (!data.orders) { setLoading(false); return; }
        setOrders(data.orders || []);

        const im: Record<string, number> = {};
        (data.installation_logs || []).forEach((l: any) => { 
          im[l.order_id] = (im[l.order_id] || 0) + l.windows_installed; 
        });
        setInstallMap(im);

        const dm: Record<string, number> = {};
        (data.dispatch_logs || []).forEach((l: any) => { 
          dm[l.order_id] = (dm[l.order_id] || 0) + l.windows_dispatched; 
        });
        setDispatchMap(dm);
      } catch (err: any) {
        toast.error("Failed to load orders");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const getDispatched = (id: string) => dispatchMap[id] || 0;
  const getInstalled = (id: string) => installMap[id] || 0;
  const getPending = (id: string) => getDispatched(id) - getInstalled(id);

  const readyOrders = orders.filter((o) => getDispatched(o.id) > 0 && getInstalled(o.id) === 0);
  const partialOrders = orders.filter((o) => getInstalled(o.id) > 0 && getInstalled(o.id) < (o.design_released_windows || 0));
  const fullyOrders = orders.filter((o) => getInstalled(o.id) > 0 && getInstalled(o.id) >= (o.design_released_windows || 0) && (o.design_released_windows || 0) > 0);

  const handleExport = (activeTab: string) => {
    let list = orders;
    if (activeTab === "ready") list = readyOrders;
    else if (activeTab === "partial") list = partialOrders;
    else if (activeTab === "full") list = fullyOrders;

    const headers = [
      "Order", "Owner", "Quote No", "SO No", "Salesperson",
      "Order Date", "TAT Date", "Target Delv", "Disp Date",
      "Status", "Product", "Sqft", "Value", "Dispatched", "Installed", "Pending"
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
      "Status": o.installation_status || "Pending",
      "Product": o.product_type || "",
      "Sqft": o.sqft || 0,
      "Value": o.order_value || 0,
      "Dispatched": getDispatched(o.id),
      "Installed": getInstalled(o.id),
      "Pending": getPending(o.id)
    }));
    exportDataToExcel(data, headers, `installation_export_${activeTab}.xlsx`);
  };

  const [activeTab, setActiveTab] = useState("ready");

  const getFiltered = (tab: string) => {
    switch (tab) {
      case "ready": return readyOrders;
      case "partial": return partialOrders;
      case "full": return fullyOrders;
      default: return orders;
    }
  };

  const activeTabList = getFiltered(activeTab);

  const filtered = activeTabList.filter((o) => {
    if (search) {
      const s = search.toLowerCase();
      if (!o.order_name?.toLowerCase().includes(s) &&
        !o.dealer_name?.toLowerCase().includes(s) &&
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
      accessor: (o: any) => (
        <div className="flex flex-col">
          <Link to={`/orders/${o.id}`} className="font-medium text-blue-600 hover:underline">{o.order_name}</Link>
          <span className="text-[10px] text-muted-foreground uppercase">{o.dealer_name}</span>
          <div className="text-[10px] text-muted-foreground mt-0.5">Q: {o.quote_no || "—"} | S: {o.sales_order_no || "—"}</div>
        </div>
      ),
      className: "min-w-[180px]"
    },
    {
      header: "Order Date",
      accessor: (o: any) => o.order_date ? new Date(o.order_date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short' }) : "—",
      sortValue: (o: any) => o.order_date,
      className: "whitespace-nowrap",
    },
    {
      header: "TAT Date",
      accessor: (o: any) => o.tat_date ? new Date(o.tat_date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short' }) : "—",
      sortValue: (o: any) => o.tat_date,
      className: "whitespace-nowrap text-blue-600 font-medium",
    },
    {
      header: "Target Delv",
      accessor: (o: any) => o.target_delivery_date ? new Date(o.target_delivery_date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short' }) : "—",
      sortValue: (o: any) => o.target_delivery_date,
      className: "whitespace-nowrap",
    },
    {
      header: "Dispatch Date",
      accessor: (o: any) => o.dispatch_date ? new Date(o.dispatch_date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short' }) : "—",
      sortValue: (o: any) => o.dispatch_date,
      className: "whitespace-nowrap text-emerald-600 font-medium",
    },
    {
      header: "Salesperson",
      accessor: (o: any) => <span className="text-[#5c6e82]">{o.salesperson || "—"}</span>,
    },
    {
      header: "Qty",
      accessor: (o: any) => <span className="text-[#5c6e82] whitespace-nowrap">{o.design_released_windows || 0} / {o.total_windows || 0}</span>,
      className: "whitespace-nowrap",
    },
    {
      header: "Install Status",
      accessor: (o: any) => (
        <Badge variant="outline" className={cn("text-[10px] uppercase font-semibold", o.installation_status === "Completed" ? "bg-success/15 text-success border-success/20" : "bg-warning/15 text-warning border-warning/20")}>
          {o.installation_status || "Pending"}
        </Badge>
      ),
    },
    {
      header: "Sqft",
      accessor: (o: any) => <span className="text-[#5c6e82]">{Number(o.sqft || 0).toFixed(1)}</span>,
      className: "text-right"
    },
    {
      header: "Dispatched",
      accessor: (o: any) => <span className="font-bold text-blue-600">{getDispatched(o.id)}</span>,
      className: "text-right"
    },
    {
      header: "Installed",
      accessor: (o: any) => <span className="font-bold text-emerald-600">{getInstalled(o.id)}</span>,
      className: "text-right"
    },
    {
      header: "Pending",
      accessor: (o: any) => <span className="font-bold text-destructive">{getPending(o.id)}</span>,
      className: "text-right"
    }
  ];

  const tabsConfig = [
    { id: "ready", label: `Ready for Installation (${readyOrders.length})` },
    { id: "partial", label: `Partially Installed (${partialOrders.length})` },
    { id: "full", label: `Fully Installed (${fullyOrders.length})` },
    { id: "all", label: `All Orders (${orders.length})` },
  ];


  return (
    <div className="flex-1 w-full bg-white flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      <DataTableLayout
        moduleName="installation"
        title="Installation & Handover"
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
        <SelectTrigger className="h-9 text-sm">
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
