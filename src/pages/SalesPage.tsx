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
import { Search, Filter, X, Plus, Upload, Download, FileSpreadsheet, Pencil } from "lucide-react";
import { toast } from "sonner";
import { importOrdersFromFile, exportOrdersToExcel, downloadImportTemplate, exportDataToExcel } from "@/lib/excelUtils";
import CreateOrderDialog from "@/components/CreateOrderDialog";
import EditOrderDialog from "@/components/EditOrderDialog";
import DataTableLayout from "@/components/ui/data-table-layout";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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
  order_date: string | null;
  tat_date: string | null;
  target_delivery_date: string | null;
  dispatch_date: string | null;
}

interface ReworkInfo {
  totalQty: number;
  latestIssue: string | null;
}

const commercialColor = (status: string) => {
  if (status === "Confirmed") return "bg-success/15 text-success border-success/20";
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
  const [tab, setTab] = useState("pipeline");

  const [salespersons, setSalespersons] = useState<string[]>([]);
  const [owners, setOwners] = useState<string[]>([]);
  const [commercialStatuses, setCommercialStatuses] = useState<string[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOrderId, setEditOrderId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const data = await api.orders.list();
      const rawOrders = (data.orders as unknown as Order[]) || [];
      setOrders(rawOrders);

      // Rework map
      const rLogs = data.rework_logs || [];
      const rMap: Record<string, ReworkInfo> = {};
      for (const log of rLogs) {
        if (!rMap[log.order_id]) {
          rMap[log.order_id] = { totalQty: 0, latestIssue: log.rework_issue };
        }
        rMap[log.order_id].totalQty += Number(log.rework_qty);
      }
      setReworkMap(rMap);

      // Receipt map
      const payments = data.payment_logs || [];
      const pMap: Record<string, number> = {};
      for (const p of payments) {
        if (p.status === "Confirmed") {
          pMap[p.order_id] = (pMap[p.order_id] || 0) + Number(p.amount);
        }
      }
      setReceiptMap(pMap);

      // Dispatch labels
      const atwMap: Record<string, number> = {};
      rawOrders.forEach(o => atwMap[o.id] = o.design_released_windows || 0);

      const dispatchedMap: Record<string, number> = {};
      for (const d of (data.dispatch_logs || []) as any[]) {
        dispatchedMap[d.order_id] = (dispatchedMap[d.order_id] || 0) + Number(d.windows_dispatched);
      }

      const dStatusMap: Record<string, string> = {};
      for (const o of rawOrders) {
        const atw = atwMap[o.id];
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
        setCommercialStatuses(settings.commercial_statuses?.map((s: any) => s.name) || []);
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
    const isConfirmed = !!o.sales_order_no || ["Advance Received", "Order Received", "In Production", "Confirmed"].includes(o.commercial_status || "");
    if (tab === "pipeline") return !isConfirmed;
    if (tab === "confirmed") return isConfirmed;
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

  const activeFilters = Object.entries(filters)
    .filter(([_, v]) => v)
    .map(([k, v]) => ({
      key: k,
      label: k === "orderOwner" ? "Owner" : 
             k === "commercialStatus" ? "Stage" :
             k.charAt(0).toUpperCase() + k.slice(1),
      value: v
    }));

  const activeFilterCount = activeFilters.length;

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
      "Order Date", "TAT Date", "Target Delv", "Disp Date",
      "Product", "Shade", "Win", "Value", "Receipt", "Balance",
      "Commercial Status", "Dispatch Status"
    ];

    const data = filtered.map(o => ({
      "Quotation No": o.quote_no || "",
      "SO No": o.sales_order_no || "",
      "Order Name": o.order_name,
      "Owner": o.dealer_name,
      "Salesperson": o.salesperson || "",
      "Order Date": o.order_date || "",
      "TAT Date": o.tat_date || "",
      "Target Delv": o.target_delivery_date || "",
      "Disp Date": o.dispatch_date || "",
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

  const getAvlToWork = (o: Order) => {
    return o.design_released_windows;
  };

  const getProductDisplay = (o: Order) => {
    if (o.other_product_type) return `${o.product_type}, ${o.other_product_type}`;
    return o.product_type;
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
      header: "Default Quote",
      accessor: (o: Order) => o.quote_no || "—",
      className: "text-[#5c6e82] min-w-[140px]"
    },
    {
      header: "Sales Order",
      accessor: (o: Order) => o.sales_order_no || "—",
      className: "text-[#5c6e82]"
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
      header: "Area",
      accessor: (o: Order) => <span className="text-[#5c6e82]">{o.sqft || 0} Sqft</span>,
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
      header: "Deal Stage",
      accessor: (o: Order) => (
        <Badge variant="outline" className={cn("text-[10px] uppercase font-semibold", commercialColor(o.commercial_status))}>
          {o.commercial_status}
        </Badge>
      ),
    },
    {
      header: "Managed By",
      accessor: (o: Order) => <span className="text-[#5c6e82]">{o.dealer_name}</span>,
    },
    {
      header: "Product / Shade",
      accessor: (o: Order) => (
        <div className="flex flex-col">
          <span className="text-[#2b3a4a]">{getProductDisplay(o)}</span>
          <span className="text-[#5c6e82] text-[10px] truncate max-w-[120px]">{o.colour_shade || "—"}</span>
        </div>
      ),
    },
    {
      header: "Balance",
      accessor: (o: Order) => {
        const receipt = receiptMap[o.id] ?? 0;
        const balance = o.order_value - receipt;
        return <span className={balance > 0 ? "text-amber-600 font-medium" : "text-emerald-600 font-medium"}>₹{Number(balance).toLocaleString()}</span>;
      },
    },
    {
      header: "Dispatch Status",
      accessor: (o: Order) => {
        const status = dispatchStatusMap[o.id] || "Not Dispatched";
        return (
          <Badge variant="outline" className={cn("text-[10px] uppercase", dispatchColor(status))}>
            {status}
          </Badge>
        );
      },
    }
  ];

  const tabsConfig = [
    { id: "pipeline", label: "Pipeline" },
    { id: "confirmed", label: "Confirmed" },
    { id: "all", label: "All" },
  ];

  const renderTopRightActions = () => (
    <Button variant="outline" size="sm" className="h-8 text-blue-600 border-blue-200 bg-blue-50/50 hover:bg-blue-100/50 font-medium px-4" onClick={() => setCreateOpen(true)}>
      <Plus className="h-4 w-4 mr-1" /> New Order
    </Button>
  );

  const SalesFilterPanel = (
    <div className="flex flex-col h-full">
      <div className="space-y-4 px-2">
        <div className="grid gap-2">
          <Label className="text-sm font-normal text-muted-foreground">Date period</Label>
          <Select defaultValue="Last 90 days">
            <SelectTrigger><SelectValue placeholder="Select period" /></SelectTrigger>
            <SelectContent><SelectItem value="Last 90 days">Last 90 days</SelectItem></SelectContent>
          </Select>
        </div>
        
        <div className="grid gap-2">
          <Label className="text-sm font-normal text-muted-foreground">Date range</Label>
          <Input type="date" className="text-sm text-muted-foreground" />
        </div>

        <div className="grid gap-2">
          <Label className="text-sm font-normal text-muted-foreground">Quote type</Label>
          <Select>
            <SelectTrigger><SelectValue placeholder="Select quote type" /></SelectTrigger>
            <SelectContent><SelectItem value="new">New</SelectItem></SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label className="text-sm font-normal text-muted-foreground">Account (Owner)</Label>
          <Select value={filters.orderOwner} onValueChange={(val) => setFilters(f => ({ ...f, orderOwner: val === "all" ? "" : val }))}>
            <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              {owners.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label className="text-sm font-normal text-muted-foreground">Contact (Salesperson)</Label>
          <Select value={filters.salesperson} onValueChange={(val) => setFilters(f => ({ ...f, salesperson: val === "all" ? "" : val }))}>
            <SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Contacts</SelectItem>
              {salespersons.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label className="text-sm font-normal text-muted-foreground">Opportunity stage</Label>
          <Select value={filters.commercialStatus} onValueChange={(val) => setFilters(f => ({ ...f, commercialStatus: val === "all" ? "" : val }))}>
            <SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {commercialStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label className="text-sm font-normal text-muted-foreground">Opportunity category</Label>
          <Select>
            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent><SelectItem value="standard">Standard</SelectItem></SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label className="text-sm font-normal text-muted-foreground">Opportunity sources</Label>
          <Select>
            <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
            <SelectContent><SelectItem value="online">Online</SelectItem><SelectItem value="referral">Referral</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="mt-auto pt-6 pb-2 px-2 flex gap-3">
        <Button variant="outline" className="flex-1" onClick={() => setFilters(emptyFilters)}>Clear</Button>
        <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">Apply</Button>
      </div>
    </div>
  );

  return (
    <div className="flex-1 w-full bg-white flex flex-col h-[calc(100vh-64px)]">
      <DataTableLayout
        moduleName="sales"
        tabs={tabsConfig}
        activeTab={tab}
        onTabChange={setTab}
        searchValue={search}
        onSearch={setSearch}
        activeFilterCount={activeFilterCount}
        activeFilters={activeFilters}
        onRemoveFilter={(key) => setFilters(prev => ({ ...prev, [key]: "" }))}
        onClearFilters={() => setFilters(emptyFilters)}
        filterChildren={SalesFilterPanel}
        columns={columns}
        data={filtered}
        getRowId={(o) => o.id}
        renderTopRightActions={renderTopRightActions}
        onTemplate={() => downloadImportTemplate()}
        onImport={handleImport}
        onExport={handleExport}
        renderRowAction={(o) => (
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground/40 hover:text-foreground hover:bg-slate-200 rounded transition-colors shrink-0 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); setEditOrderId(o.id); }}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
      />

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

