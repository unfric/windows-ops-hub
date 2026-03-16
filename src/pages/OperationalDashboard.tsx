
import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  ClipboardCheck, HardHat, Truck, ShoppingCart, Layout, 
  Activity, ArrowRight, AlertTriangle, Clock
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAggregatedOrders } from "@/hooks/useAggregatedOrders";
import { AggregatedOrder } from "@/lib/order-logic";
import { 
  KPICard, SectionHeader, StatusCell, MaterialsStatusDetail 
} from "@/components/shared/DashboardComponents";
import { isWithinInterval, startOfDay, endOfDay, startOfWeek, startOfMonth, parseISO } from "date-fns";

type TimeHorizon = "daily" | "weekly" | "monthly" | "all";

export default function OperationalDashboard() {
  const [horizon, setHorizon] = useState<TimeHorizon>("weekly");
  const { aggregated, loading, rawLogs } = useAggregatedOrders();

  if (loading) {
    return (
      <div className="flex flex-col h-[80vh] items-center justify-center gap-4">
        <Clock className="h-10 w-10 text-primary animate-spin" />
        <p className="text-muted-foreground animate-pulse font-medium">Aggregating Operational Excellence...</p>
      </div>
    );
  }

  // Time-based filtering logic
  const now = new Date();
  let start: Date | null = null;
  const end = endOfDay(now);

  if (horizon === "daily") start = startOfDay(now);
  else if (horizon === "weekly") start = startOfWeek(now, { weekStartsOn: 1 });
  else if (horizon === "monthly") start = startOfMonth(now);

  const filterLogs = (logs: any[] = [], dateField = "created_at") => {
    if (horizon === "all" || !start) return logs;
    return logs.filter(l => {
      try {
        const d = parseISO(l[dateField] || l.created_at);
        return isWithinInterval(d, { start: start!, end });
      } catch { return false; }
    });
  };

  const activityCount = filterLogs(rawLogs?.activity_logs || [], "timestamp").length;
  const productionCount = filterLogs(rawLogs?.production_logs || [], "entry_date").reduce((acc, l) => acc + (l.windows_completed || 0), 0);

  // Metrics calculation (Global)
  const totalValue = aggregated.reduce((acc, o) => acc + Number(o.order_value), 0);
  const totalBalance = aggregated.reduce((acc, o) => acc + Number(o.balance), 0);
  
  const pipelineValue = aggregated
    .filter(o => (o.commercial_status || "").toLowerCase().includes("pipeline"))
    .reduce((acc, o) => acc + Number(o.order_value), 0);
    
  const approvedValue = aggregated
    .filter(o => (o.commercial_status || "").toLowerCase().includes("approved"))
    .reduce((acc, o) => acc + Number(o.order_value), 0);

  // Module filtering
  const pendingSurvey = aggregated.filter(o => o.surveyDone < o.total_windows);
  const pendingDesign = aggregated.filter(o => o.designReleased < o.surveyDone);
  const pendingProcurement = aggregated.filter(o => o.materialsStatus !== "Ready");
  const pendingProduction = aggregated.filter(o => o.productionPacked < o.atw && o.atw > 0);
  const pendingDispatch = aggregated.filter(o => o.dispatchedWindows < o.atw && o.atw > 0);
  const pendingInstall = aggregated.filter(o => o.installedWindows < o.dispatchedWindows && o.dispatchedWindows > 0);

  // Alerts
  const alerts = [];
  if (pendingProduction.length > 10) alerts.push({ label: "High Production Backlog", count: pendingProduction.length, type: "amber" });
  if (pendingProcurement.length > 5) alerts.push({ label: "Procurement Bottlenecks", count: pendingProcurement.length, type: "red" });

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-[1600px] mx-auto space-y-12 pb-32">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 rounded-[22px] bg-primary flex items-center justify-center shadow-[0_12px_24px_rgba(var(--primary),0.2)]">
            <Activity className="h-8 w-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 uppercase italic leading-none">Command Central</h1>
            <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] mt-2">Real-time Industrial Pulse</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-200/50 backdrop-blur-md p-1.5 rounded-2xl border border-white">
          {(["daily", "weekly", "monthly", "all"] as TimeHorizon[]).map((t) => (
            <Button
              key={t}
              variant={horizon === t ? "default" : "ghost"}
              size="sm"
              className={cn(
                "capitalize h-10 px-6 text-xs font-black tracking-widest transition-all rounded-xl",
                horizon === t ? "bg-white text-primary shadow-sm hover:bg-white" : "text-slate-500 hover:bg-white/50"
              )}
              onClick={() => setHorizon(t)}
            >
              {t}
            </Button>
          ))}
        </div>
      </div>

      {/* ALERTS */}
      {alerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex flex-col md:flex-row gap-6 items-start md:items-center">
          <div className="bg-amber-100 p-3 rounded-xl">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-amber-900 font-bold mb-1">Operational Alerts Identified</h3>
            <p className="text-amber-800/80 text-sm font-medium">The system has detected potential bottlenecks that require attention.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {alerts.map((a, i) => (
              <Badge key={i} variant="outline" className={cn("bg-white font-bold", a.type === "red" ? "text-red-600 border-red-100" : "text-amber-700 border-amber-200")}>
                {a.label} ({a.count})
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* KPI GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Portfolio Value"
          value={`₹${(totalValue / 10000000).toFixed(2)} Cr`}
          subValue={`${aggregated.length} Active Orders`}
          icon={Activity}
          color="#6366f1"
        />
        <KPICard
          title="Receivables"
          value={`₹${(totalBalance / 10000000).toFixed(2)} Cr`}
          subValue="Outstanding"
          icon={ShoppingCart}
          color="#f59e0b"
        />
        <KPICard
          title="Pipeline Velocity"
          value={`₹${(pipelineValue / 10000000).toFixed(2)} Cr`}
          subValue="Not Approved"
          icon={Layout}
          color="#ec4899"
        />
        <KPICard
          title="Backlog Value"
          value={`₹${(approvedValue / 10000000).toFixed(2)} Cr`}
          subValue="Approved"
          icon={ClipboardCheck}
          color="#10b981"
        />
      </div>

      {/* MODULES GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-12 gap-y-16">
        <SurveyDesignModule orders={pendingSurvey.concat(pendingDesign).slice(0, 10)} />
        <ProcurementModule orders={pendingProcurement.slice(0, 10)} />
        <ProductionModule orders={pendingProduction.slice(0, 10)} />
        <DispatchModule orders={pendingDispatch.slice(0, 10)} />
        <InstallationModule orders={pendingInstall.slice(0, 10)} />
        
        <div className="bg-slate-50/50 rounded-3xl p-8 border border-slate-100 flex flex-col justify-center items-center text-center space-y-4">
          <div className="h-16 w-16 rounded-2xl bg-white shadow-sm flex items-center justify-center">
            <Activity className="h-8 w-8 text-primary/40" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 uppercase italic">View Global Data</h3>
            <p className="text-sm text-slate-500 max-w-xs mx-auto mt-2">
              Access the complete registry of orders, logs, and financial records.
            </p>
          </div>
          <Button variant="outline" asChild className="rounded-xl font-bold uppercase tracking-tight text-xs">
            <Link to="/orders">Go to Registry <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Internal Module Components ──

function ModuleCard({ title, icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="group">
      <SectionHeader title={title} icon={icon} />
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden group-hover:shadow-md transition-shadow duration-500">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="hover:bg-transparent border-slate-200/60">
              <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Order</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Status</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase text-slate-400 tracking-wider">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {children}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function SurveyDesignModule({ orders }: { orders: AggregatedOrder[] }) {
  return (
    <ModuleCard title="Pre-Production" icon={Layout}>
      {orders.length === 0 ? (
        <TableRow><TableCell colSpan={3} className="text-center py-8 text-slate-400 text-xs italic">Clear Skies</TableCell></TableRow>
      ) : (
        orders.map((o) => (
          <TableRow key={o.id} className="border-slate-100/50 hover:bg-slate-50/80 transition-colors">
            <TableCell>
              <div className="space-y-0.5">
                <Link to={`/orders/${o.id}`} className="text-sm font-bold text-slate-900 hover:text-primary transition-colors">{o.order_name}</Link>
                <div className="text-[10px] text-slate-400 font-medium">{o.dealer_name}</div>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex gap-4 text-xs font-bold">
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase text-slate-400 block tracking-tight">Survey</span>
                  <StatusCell done={o.surveyDone} total={o.total_windows} />
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase text-slate-400 block tracking-tight">Design</span>
                  <StatusCell done={o.designReleased} total={o.surveyDone} />
                </div>
              </div>
            </TableCell>
            <TableCell className="text-right">
              <Badge variant="outline" className="text-[10px] font-bold bg-slate-50 border-slate-200 text-slate-600 uppercase tracking-tighter">
                {o.surveyDone < o.total_windows ? "Survey" : "Design"}
              </Badge>
            </TableCell>
          </TableRow>
        ))
      )}
    </ModuleCard>
  );
}

function ProcurementModule({ orders }: { orders: AggregatedOrder[] }) {
  return (
    <ModuleCard title="Procurement" icon={ShoppingCart}>
      {orders.length === 0 ? (
        <TableRow><TableCell colSpan={3} className="text-center py-8 text-slate-400 text-xs italic">All materials secured</TableCell></TableRow>
      ) : (
        orders.map((o) => (
          <TableRow key={o.id} className="border-slate-100/50 hover:bg-slate-50/80 transition-colors">
            <TableCell>
              <div className="space-y-0.5">
                <Link to={`/orders/${o.id}`} className="text-sm font-bold text-slate-900 hover:text-primary transition-colors">{o.order_name}</Link>
                <div className="text-[10px] text-slate-400 font-medium">{o.dealer_name}</div>
              </div>
            </TableCell>
            <TableCell>
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase text-slate-400 block tracking-tight">Status</span>
                <MaterialsStatusDetail order={o} />
              </div>
            </TableCell>
            <TableCell className="text-right">
              <Badge variant="outline" className="text-[10px] font-bold bg-amber-50 border-amber-200 text-amber-700 uppercase tracking-tighter">
                PO Pending
              </Badge>
            </TableCell>
          </TableRow>
        ))
      )}
    </ModuleCard>
  );
}

function ProductionModule({ orders }: { orders: AggregatedOrder[] }) {
  return (
    <ModuleCard title="Production" icon={ClipboardCheck}>
      {orders.length === 0 ? (
        <TableRow><TableCell colSpan={3} className="text-center py-8 text-slate-400 text-xs italic">Floor clear</TableCell></TableRow>
      ) : (
        orders.map((o) => (
          <TableRow key={o.id} className="border-slate-100/50 hover:bg-slate-50/80 transition-colors">
            <TableCell>
              <div className="space-y-0.5">
                <Link to={`/orders/${o.id}`} className="text-sm font-bold text-slate-900 hover:text-primary transition-colors">{o.order_name}</Link>
                <div className="text-[10px] text-slate-400 font-medium">{o.dealer_name}</div>
              </div>
            </TableCell>
            <TableCell>
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase text-slate-400 block tracking-tight">Packed / ATW</span>
                <StatusCell done={o.productionPacked} total={o.atw} />
              </div>
            </TableCell>
            <TableCell className="text-right">
              <Badge variant="outline" className="text-[10px] font-bold bg-blue-50 border-blue-200 text-blue-700 uppercase tracking-tighter">
                Active
              </Badge>
            </TableCell>
          </TableRow>
        ))
      )}
    </ModuleCard>
  );
}

function DispatchModule({ orders }: { orders: AggregatedOrder[] }) {
  return (
    <ModuleCard title="Logistics" icon={Truck}>
      {orders.length === 0 ? (
        <TableRow><TableCell colSpan={3} className="text-center py-8 text-slate-400 text-xs italic">No orders pending dispatch</TableCell></TableRow>
      ) : (
        orders.map((o) => (
          <TableRow key={o.id} className="border-slate-100/50 hover:bg-slate-50/80 transition-colors">
            <TableCell>
              <div className="space-y-0.5">
                <Link to={`/orders/${o.id}`} className="text-sm font-bold text-slate-900 hover:text-primary transition-colors">{o.order_name}</Link>
                <div className="text-[10px] text-slate-400 font-medium">{o.dealer_name}</div>
              </div>
            </TableCell>
            <TableCell>
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase text-slate-400 block tracking-tight">Dispatched / ATW</span>
                <StatusCell done={o.dispatchedWindows} total={o.atw} />
              </div>
            </TableCell>
            <TableCell className="text-right">
              <Badge variant="outline" className="text-[10px] font-bold bg-purple-50 border-purple-200 text-purple-700 uppercase tracking-tighter">
                {o.atw === o.dispatchedWindows ? "Ready" : "Loading"}
              </Badge>
            </TableCell>
          </TableRow>
        ))
      )}
    </ModuleCard>
  );
}

function InstallationModule({ orders }: { orders: AggregatedOrder[] }) {
  return (
    <ModuleCard title="Installation" icon={HardHat}>
      {orders.length === 0 ? (
        <TableRow><TableCell colSpan={3} className="text-center py-8 text-slate-400 text-xs italic">All sites completed</TableCell></TableRow>
      ) : (
        orders.map((o) => (
          <TableRow key={o.id} className="border-slate-100/50 hover:bg-slate-50/80 transition-colors">
            <TableCell>
              <div className="space-y-0.5">
                <Link to={`/orders/${o.id}`} className="text-sm font-bold text-slate-900 hover:text-primary transition-colors">{o.order_name}</Link>
                <div className="text-[10px] text-slate-400 font-medium">{o.dealer_name}</div>
              </div>
            </TableCell>
            <TableCell>
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase text-slate-400 block tracking-tight">Installed / Disp</span>
                <StatusCell done={o.installedWindows} total={o.dispatchedWindows} />
              </div>
            </TableCell>
            <TableCell className="text-right">
              <Badge variant="outline" className="text-[10px] font-bold bg-emerald-50 border-emerald-200 text-emerald-700 uppercase tracking-tighter">
                Fixing
              </Badge>
            </TableCell>
          </TableRow>
        ))
      )}
    </ModuleCard>
  );
}
