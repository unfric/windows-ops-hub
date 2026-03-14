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

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const handleExport = () => {
    const headers = ["Order", "Owner", "Salesperson", "Order Value", "Receipt", "Balance", "Prod Appr", "Disp Appr", "Dispatch Status", "Comm Status"];
    const data = filtered.map(o => ({
      "Order": o.order_name,
      "Owner": o.dealer_name,
      "Salesperson": o.salesperson || "",
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

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Finance</h1>
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
            <FilterSelect label="Approval (Production)" value={filters.approvalProduction} options={["Pending", "Approved", "Hold"]} onChange={(v) => setFilters({ ...filters, approvalProduction: v })} />
            <FilterSelect label="Approval (Dispatch)" value={filters.approvalDispatch} options={["Pending", "Approved", "Hold"]} onChange={(v) => setFilters({ ...filters, approvalDispatch: v })} />
          </PopoverContent>
        </Popover>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList>
          <TabsTrigger value="pending">Pending for Approval</TabsTrigger>
          <TabsTrigger value="production">Approved Production</TabsTrigger>
          <TabsTrigger value="dispatch">Approved Dispatch</TabsTrigger>
          <TabsTrigger value="all">All Orders</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="rounded-md border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[140px]">Order Name</TableHead>
              <TableHead className="min-w-[100px]">Quotation No</TableHead>
              <TableHead className="min-w-[120px]">Owner</TableHead>
              <TableHead className="min-w-[100px]">Salesperson</TableHead>
              <TableHead className="text-right min-w-[90px]">Order Value</TableHead>
              <TableHead className="text-right min-w-[80px]">Receipt</TableHead>
              <TableHead className="text-right min-w-[80px]">Balance</TableHead>
              <TableHead className="min-w-[120px]">Prod. Approval</TableHead>
              <TableHead className="min-w-[120px]">Disp. Approval</TableHead>
              <TableHead className="min-w-[120px]">Dispatch Status</TableHead>
              <TableHead className="min-w-[120px]">Commercial Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">No orders found</TableCell>
              </TableRow>
            ) : (
              filtered.map((order) => {
                const receipt = paymentMap[order.id] || 0;
                const balance = Number(order.order_value) - receipt;
                return (
                  <TableRow key={order.id} className="hover:bg-muted/50">
                    <TableCell>
                      <Link to={`/orders/${order.id}`} className="font-medium text-primary hover:underline">{order.order_name}</Link>
                    </TableCell>
                    <TableCell className="text-sm">{order.quote_no || "—"}</TableCell>
                    <TableCell className="text-sm">{order.dealer_name}</TableCell>
                    <TableCell className="text-sm">{order.salesperson || "—"}</TableCell>
                    <TableCell className="text-right font-medium">₹{Number(order.order_value).toLocaleString()}</TableCell>
                    <TableCell className="text-right">₹{receipt.toLocaleString()}</TableCell>
                    <TableCell className="text-right">₹{balance.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={approvalColor(order.approval_for_production)}>
                        {order.approval_for_production}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={approvalColor(order.approval_for_dispatch)}>
                        {order.approval_for_dispatch}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <Badge variant="outline" className={dispatchStatusMap[order.id] === "Fully Dispatched" ? "bg-success/15 text-success border-success/20" : dispatchStatusMap[order.id] === "Partially Dispatched" ? "bg-warning/15 text-warning border-warning/20" : "bg-muted text-muted-foreground"}>
                        {dispatchStatusMap[order.id] || "Not Dispatched"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{order.commercial_status}</TableCell>
                  </TableRow>
                );
              })
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
