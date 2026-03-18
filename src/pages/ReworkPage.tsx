import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/services/api";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Download, AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { exportDataToExcel } from "@/lib/excelUtils";
import DataTableLayout from "@/components/ui/data-table-layout";
import { cn } from "@/lib/utils";

export default function ReworkPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [reworkMap, setReworkMap] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await api.orders.list();
        if (!data.orders) { setLoading(false); return; }
        setOrders(data.orders || []);

        const rm: Record<string, any[]> = {};
        (data.rework_logs || []).forEach((l: any) => {
          if (!rm[l.order_id]) rm[l.order_id] = [];
          rm[l.order_id].push(l);
        });
        setReworkMap(rm);
      } catch (err: any) {
        toast.error("Failed to load rework data");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const ordersWithRework = orders.filter((o) => (reworkMap[o.id] || []).length > 0);
  const pendingOrders = ordersWithRework.filter((o) => (reworkMap[o.id] || []).some((r: any) => r.status === "Pending"));
  const inProgressOrders = ordersWithRework.filter((o) => (reworkMap[o.id] || []).some((r: any) => r.status === "In Progress"));
  const solvedOrders = ordersWithRework.filter((o) => (reworkMap[o.id] || []).every((r: any) => r.status === "Solved" || r.status === "Closed"));

  const getLatestIssue = (id: string) => {
    const logs = reworkMap[id] || [];
    if (logs.length === 0) return { issue: "—", resp: "—", date: "—" };
    const latest = [...logs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    return {
      issue: `${latest.rework_qty}× ${latest.issue_type || latest.rework_issue || "—"}`,
      resp: latest.responsible_person || "—",
      date: new Date(latest.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
    };
  };

  const getStatus = (id: string) => {
    const logs = reworkMap[id] || [];
    if (logs.length === 0) return "—";
    const hasP = logs.some((r: any) => r.status === "Pending");
    const hasIP = logs.some((r: any) => r.status === "In Progress");
    if (hasP) return "Pending";
    if (hasIP) return "In Progress";
    return "Solved";
  };

  const handleExport = (activeTab: string) => {
    let list = ordersWithRework;
    if (activeTab === "pending") list = pendingOrders;
    else if (activeTab === "inprogress") list = inProgressOrders;
    else if (activeTab === "solved") list = solvedOrders;

    const headers = [
      "Order", "Owner", "Salesperson",
      "Order Date", "TAT Date", "Target Delv", "Disp Date",
      "Status", "Latest Issue", "Qty", "Responsible", "Reported Date", "Value"
    ];
    const data = list.map(o => {
      const logs = reworkMap[o.id] || [];
      const latest = logs[0] || {};
      return {
        "Order": o.order_name,
        "Owner": o.dealer_name,
        "Salesperson": o.salesperson || "",
        "Order Date": o.order_date || "",
        "TAT Date": o.tat_date || "",
        "Target Delv": o.target_delivery_date || "",
        "Disp Date": o.dispatch_date || "",
        "Status": getStatus(o.id),
        "Latest Issue": latest.issue_type || latest.rework_issue || "",
        "Qty": latest.rework_qty || 0,
        "Responsible": latest.responsible_person || "",
        "Reported Date": latest.created_at ? new Date(latest.created_at).toLocaleDateString() : "",
        "Value": o.order_value || 0
      };
    });
    exportDataToExcel(data, headers, `rework_export_${activeTab}.xlsx`);
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "Pending": return "bg-warning/15 text-warning border-warning/20";
      case "In Progress": return "bg-blue-500/15 text-blue-600 border-blue-500/20";
      case "Solved": return "bg-green-500/15 text-green-600 border-green-500/20";
      default: return "";
    }
  };

  const [activeTab, setActiveTab] = useState("pending");
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

  const getFiltered = (tab: string) => {
    switch (tab) {
      case "pending": return pendingOrders;
      case "inprogress": return inProgressOrders;
      case "solved": return solvedOrders;
      default: return ordersWithRework;
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
      header: "Issue / Responsible",
      accessor: (o: any) => {
        const latest = getLatestIssue(o.id);
        return (
          <div className="flex flex-col">
            <div className="font-semibold text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              <span className="truncate max-w-[200px]" title={latest.issue}>{latest.issue}</span>
            </div>
            <div className="text-[10px] text-muted-foreground">Resp: {latest.resp}</div>
          </div>
        );
      },
    },
    {
      header: "Reported",
      accessor: (o: any) => <span className="text-[#5c6e82]">{getLatestIssue(o.id).date}</span>,
    },
    {
      header: "Status",
      accessor: (o: any) => (
        <Badge variant="outline" className={cn("text-[10px] uppercase font-semibold", statusColor(getStatus(o.id)))}>
          {getStatus(o.id)}
        </Badge>
      ),
    }
  ];

  const tabsConfig = [
    { id: "pending", label: `Pending Issues (${pendingOrders.length})` },
    { id: "inprogress", label: `In Progress (${inProgressOrders.length})` },
    { id: "solved", label: `Solved (${solvedOrders.length})` },
    { id: "all", label: `All Issues (${ordersWithRework.length})` },
  ];



  return (
    <div className="flex-1 w-full bg-white flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      <DataTableLayout
        moduleName="rework"
        title={`Rework & Quality`}
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
