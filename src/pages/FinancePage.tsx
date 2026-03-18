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
  order_name: string;
  quote_no: string | null;
  dealer_name: string;
  salesperson: string | null;
  order_value: number;
  approval_for_production: string;
  approval_for_dispatch: string;
  dispatch_status: string;
  commercial_status: string;
  design_released_windows: number;
  total_windows: number;
  order_date: string | null;
  tat_date: string | null;
  target_delivery_date: string | null;
  dispatch_date: string | null;
}

interface PaymentLog {
  order_id: string;
  amount: number;
  status: string;
}

const approvalColor = (status: string) => {
  if (status === "Approved") return "bg-success/15 text-success border-success/20";
  if (status === "Hold") return "bg-warning/15 text-warning border-warning/20";
  return "bg-muted text-muted-foreground";
};

interface Filters {
  salesperson: string;
  orderOwner: string;
  colourShade: string;
  approvalProduction: string;
  approvalDispatch: string;
}

const emptyFilters: Filters = {
  salesperson: "", orderOwner: "", colourShade: "", approvalProduction: "", approvalDispatch: "",
};

export default function FinancePage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [paymentMap, setPaymentMap] = useState<Record<string, number>>({});
  const [draftOrderIds, setDraftOrderIds] = useState<Set<string>>(new Set());
  const [dispatchStatusMap, setDispatchStatusMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [tab, setTab] = useState("pending");

  const [salespersons, setSalespersons] = useState<string[]>([]);
  const [owners, setOwners] = useState<string[]>([]);
  const [shades, setShades] = useState<string[]>([]);

  const fetchData = async () => {
    try {
      const data = await api.orders.list();
      const rawOrders = (data.orders as unknown as Order[]) || [];
      setOrders(rawOrders);

      const logs = (data.payment_logs || []) as PaymentLog[];
      const map: Record<string, number> = {};
      const drafts = new Set<string>();
      for (const log of logs) {
        if (log.status === "Confirmed") {
          map[log.order_id] = (map[log.order_id] || 0) + Number(log.amount);
        }
        if (log.status === "Draft") {
          drafts.add(log.order_id);
        }
      }
      setPaymentMap(map);
      setDraftOrderIds(drafts);

      // Dispatch Status Aggregation
      const dispatchedMap: Record<string, number> = {};
      for (const d of (data.dispatch_logs || []) as any[]) {
        dispatchedMap[d.order_id] = (dispatchedMap[d.order_id] || 0) + Number(d.windows_dispatched);
      }

      const dStatusMap: Record<string, string> = {};
      for (const o of rawOrders) {
        const atw = o.design_released_windows || 0;
        const dispatched = dispatchedMap[o.id] || 0;

        if (dispatched === 0) dStatusMap[o.id] = "Not Dispatched";
        else if (dispatched < atw) dStatusMap[o.id] = "Partially Dispatched";
        else dStatusMap[o.id] = "Fully Dispatched";
      }
      setDispatchStatusMap(dStatusMap);
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
        setShades(settings.colour_shades?.map((s: any) => s.name) || []);
      }
      const uniqueOwners = [...new Set(orders.map((o) => o.dealer_name).filter(Boolean))].sort();
      setOwners(uniqueOwners);
    } catch (err) {
      console.error("Error fetching filter options:", err);
    }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { if (orders.length > 0) fetchFilterOptions(); }, [orders.length]);

  const tabFiltered = orders.filter((o) => {
    if (tab === "pending") {
      return o.approval_for_production === "Pending" ||
        o.approval_for_dispatch === "Pending" ||
        draftOrderIds.has(o.id);
    }
    if (tab === "production") return o.approval_for_production === "Approved";
    if (tab === "dispatch") return o.approval_for_dispatch === "Approved";
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
    if (filters.approvalProduction && o.approval_for_production !== filters.approvalProduction) return false;
    if (filters.approvalDispatch && o.approval_for_dispatch !== filters.approvalDispatch) return false;
    return true;
  });

  const activeFilters = Object.entries(filters)
    .filter(([_, v]) => v)
    .map(([k, v]) => ({
      key: k,
      label: k === "orderOwner" ? "Owner" : 
             k === "approvalProduction" ? "Prod Appr" : 
             k === "approvalDispatch" ? "Disp Appr" :
             k.charAt(0).toUpperCase() + k.slice(1),
      value: v
    }));

  const activeFilterCount = activeFilters.length;

  const handleExport = () => {
    const headers = [
      "Order", "Owner", "Salesperson",
      "Order Date", "TAT Date", "Target Delv", "Disp Date",
      "Order Value", "Receipt", "Balance", "Prod Appr", "Disp Appr", "Dispatch Status", "Comm Status"
    ];
    const data = filtered.map(o => ({
      "Order": o.order_name,
      "Owner": o.dealer_name,
      "Salesperson": o.salesperson || "",
      "Order Date": o.order_date || "",
      "TAT Date": o.tat_date || "",
      "Target Delv": o.target_delivery_date || "",
      "Disp Date": o.dispatch_date || "",
      "Order Value": o.order_value,
      "Receipt": paymentMap[o.id] || 0,
      "Balance": (o.order_value || 0) - (paymentMap[o.id] || 0),
      "Prod Appr": o.approval_for_production,
      "Disp Appr": o.approval_for_dispatch,
      "Dispatch Status": dispatchStatusMap[o.id] || "Not Dispatched",
      "Comm Status": o.commercial_status
    }));
    exportDataToExcel(data, headers, `finance_export_${tab}.xlsx`);
  };

  const columns = [
    {
      header: "Project Name",
      accessor: (o: Order) => (
        <div className="flex flex-col">
          <Link to={`/orders/${o.id}`} className="font-medium text-blue-600 hover:underline">{o.order_name}</Link>
          <span className="text-[10px] text-muted-foreground uppercase">{o.commercial_status}</span>
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
      header: "Default Quote",
      accessor: (o: Order) => o.quote_no || "—",
      className: "text-[#5c6e82]"
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
      header: "Qty",
      accessor: (o: Order) => <span className="text-[#5c6e82] whitespace-nowrap">{o.design_released_windows || 0} / {o.total_windows}</span>,
      className: "whitespace-nowrap",
    },
    {
      header: "Opportunity Value",
      accessor: (o: Order) => <span className="text-[#5c6e82]">₹{Number(o.order_value).toLocaleString()}</span>,
    },
    {
      header: "Receipt",
      accessor: (o: Order) => <span className="text-[#5c6e82]">₹{Number(paymentMap[o.id] || 0).toLocaleString()}</span>,
    },
    {
      header: "Balance",
      accessor: (o: Order) => {
        const balance = Number(o.order_value) - (paymentMap[o.id] || 0);
        return <span className={balance > 0 ? "text-amber-600 font-medium" : "text-emerald-600 font-medium"}>₹{balance.toLocaleString()}</span>;
      },
    },
    {
      header: "Prod. Appr",
      accessor: (o: Order) => (
        <Badge variant="outline" className={cn("text-[10px] uppercase font-semibold", approvalColor(o.approval_for_production))}>
          {o.approval_for_production}
        </Badge>
      ),
    },
    {
      header: "Disp. Appr",
      accessor: (o: Order) => (
        <Badge variant="outline" className={cn("text-[10px] uppercase font-semibold", approvalColor(o.approval_for_dispatch))}>
          {o.approval_for_dispatch}
        </Badge>
      ),
    },
    {
      header: "Dispatch Status",
      accessor: (o: Order) => {
        const dScore = dispatchStatusMap[o.id];
        return (
          <Badge variant="outline" className={cn("text-[10px] uppercase font-semibold", 
            dScore === "Fully Dispatched" ? "bg-success/15 text-success border-success/20" : dScore === "Partially Dispatched" ? "bg-warning/15 text-warning border-warning/20" : "bg-muted text-muted-foreground")}>
            {dScore || "Not Dispatched"}
          </Badge>
        );
      },
    }
  ];

  const tabsConfig = [
    { id: "pending", label: "Pending for Approval" },
    { id: "production", label: "Approved Production" },
    { id: "dispatch", label: "Approved Dispatch" },
    { id: "all", label: "All Orders" },
  ];


  return (
    <div className="flex-1 w-full bg-white flex flex-col h-[calc(100vh-64px)]">
      <DataTableLayout
        moduleName="finance"
        title="Finance"
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
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase font-semibold">Prod. Approval</label>
              <Select value={filters.approvalProduction || "all"} onValueChange={(v) => setFilters(p => ({ ...p, approvalProduction: v === "all" ? "" : v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Hold">Hold</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase font-semibold">Disp. Approval</label>
              <Select value={filters.approvalDispatch || "all"} onValueChange={(v) => setFilters(p => ({ ...p, approvalDispatch: v === "all" ? "" : v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Hold">Hold</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
