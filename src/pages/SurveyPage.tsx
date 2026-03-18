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
  survey_done_windows: number;
  survey_remarks: string | null;
  approval_for_production: string;
  order_date: string | null;
  tat_date: string | null;
  target_delivery_date: string | null;
  dispatch_date: string | null;
}

interface Filters {
  salesperson: string;
  orderOwner: string;
  approvalProduction: string;
}

const emptyFilters: Filters = { salesperson: "", orderOwner: "", approvalProduction: "" };

const approvalColor = (status: string) => {
  if (status === "Approved") return "bg-success/15 text-success border-success/20";
  if (status === "Hold") return "bg-warning/15 text-warning border-warning/20";
  return "bg-muted text-muted-foreground";
};

export default function SurveyPage() {
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
      setOrders((data.orders as unknown as Order[]) || []);
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
    const done = o.survey_done_windows || 0;
    const total = o.total_windows || 0;
    if (tab === "pending") return done < total;
    if (tab === "completed") return done >= total && total > 0;
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
    if (filters.approvalProduction && o.approval_for_production !== filters.approvalProduction) return false;
    return true;
  });

  const activeFilters = Object.entries(filters)
    .filter(([_, v]) => v)
    .map(([k, v]) => ({
      key: k,
      label: k === "orderOwner" ? "Owner" : 
             k === "approvalProduction" ? "Prod Appr" : 
             k.charAt(0).toUpperCase() + k.slice(1),
      value: v
    }));

  const activeFilterCount = activeFilters.length;

  const handleExport = () => {
    const headers = [
      "Order", "Owner", "Salesperson", 
      "Order Date", "TAT Date", "Target Delv", "Disp Date",
      "Total Win", "Survey Done", "Remarks", "Prod Appr"
    ];
    const data = filtered.map(o => ({
      "Order": o.order_name,
      "Owner": o.dealer_name,
      "Salesperson": o.salesperson || "",
      "Order Date": o.order_date || "",
      "TAT Date": o.tat_date || "",
      "Target Delv": o.target_delivery_date || "",
      "Disp Date": o.dispatch_date || "",
      "Total Win": o.total_windows,
      "Survey Done": o.survey_done_windows,
      "Remarks": o.survey_remarks || "",
      "Prod Appr": o.approval_for_production
    }));
    exportDataToExcel(data, headers, `survey_export_${tab}.xlsx`);
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
      header: "Survey Done",
      accessor: (o: Order) => {
        const done = o.survey_done_windows || 0;
        const total = o.total_windows || 0;
        return <span className={done >= total && total > 0 ? "text-emerald-600 font-medium whitespace-nowrap" : "text-[#5c6e82] font-medium whitespace-nowrap"}>{done} / {total}</span>;
      },
      className: "whitespace-nowrap",
    },
    {
      header: "Survey Pending",
      accessor: (o: Order) => {
        const done = o.survey_done_windows || 0;
        const pending = (o.total_windows || 0) - done;
        return <span className={pending > 0 ? "text-amber-600 font-medium" : "text-[#5c6e82]"}>{pending > 0 ? `${pending} Win` : "—"}</span>;
      },
      className: "text-[#5c6e82]"
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
      header: "Remarks",
      accessor: (o: Order) => <span className="text-[#5c6e82] max-w-[150px] truncate block" title={o.survey_remarks || ""}>{o.survey_remarks || "—"}</span>,
    }
  ];

  const tabsConfig = [
    { id: "pending", label: "Pending Survey" },
    { id: "completed", label: "Survey Completed" },
    { id: "all", label: "All Orders" },
  ];



  return (
    <div className="flex-1 w-full bg-white flex flex-col h-[calc(100vh-64px)]">
      <DataTableLayout
        moduleName="survey"
        title="Survey"
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
