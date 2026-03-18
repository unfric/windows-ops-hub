import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import { 
  Activity, 
  AlertCircle, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  Timer,
  ChevronRight,
  Truck,
  DollarSign,
  Maximize2,
  Factory,
  LayoutDashboard as Monitor,
  Activity as ClipboardList
} from "lucide-react";
import { 
  startOfDay, 
  endOfDay, 
  startOfWeek, 
  startOfMonth, 
  isWithinInterval, 
  parseISO, 
  differenceInDays
} from "date-fns";
import { cn } from "@/lib/utils";

type TimeHorizon = "daily" | "weekly" | "monthly" | "all";

// -- Formatter Helpers --
const fNum = (n: number) => n.toLocaleString();
const fVal = (n: number) => `₹${(n / 100000).toFixed(1)}L`;

// -- Clean Executive KPI Component --
const StatGroup = ({ title, orders, windows, value, onClick, icon: Icon, gradient }: any) => (
  <div 
    className={cn(
      "group relative flex flex-col p-6 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden border border-slate-200",
      gradient || "bg-white"
    )}
    onClick={onClick}
  >
    <div className="flex justify-between items-start mb-4">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-primary transition-all" />
    </div>
    
    <div className="flex items-baseline gap-2 mb-4">
      <span className="text-3xl font-bold text-slate-900 tracking-tight">{orders}</span>
      <span className="text-sm font-medium text-slate-400">Orders</span>
    </div>

    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
      <div>
        <p className="text-sm font-bold text-slate-800">{fNum(windows)}</p>
        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-tighter">Windows</p>
      </div>
      <div className="text-right sm:text-left">
        <p className="text-sm font-bold text-emerald-600">{fVal(value)}</p>
        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-tighter">Valuation</p>
      </div>
    </div>
  </div>
);

// -- Clean Mini Stat --
const MiniStat = ({ title, value, subtext, icon: Icon, onClick, colorClass = "text-primary" }: any) => (
  <div 
    className="p-4 bg-white rounded-xl border border-slate-200 flex flex-col justify-between hover:shadow-md transition-all cursor-pointer h-full"
    onClick={onClick}
  >
    <div className="flex justify-between items-start mb-1">
      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
      {Icon && <Icon className="h-3.5 w-3.5 text-slate-400" />}
    </div>
    <div>
      <p className={cn("text-2xl font-bold tracking-tight", colorClass)}>{value}</p>
      <p className="text-[11px] font-medium text-slate-400 mt-0.5">{subtext}</p>
    </div>
  </div>
);

export default function OperationalDashboardV2() {
  const [horizon, setHorizon] = useState<TimeHorizon>("weekly");
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const data = await api.orders.list();
        setRawData(data);
      } catch (err) {
        console.error("Dashboard data load failed:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const computation = useMemo(() => {
    if (!rawData) return null;

    const { 
      orders = [], 
      production_logs = [], 
      dispatch_logs = [], 
      payment_logs = [], 
      rework_logs = [],
      activity_logs = []
    } = rawData;

    const now = new Date();
    const end = endOfDay(now);
    let start: Date | null = null;
    if (horizon === "daily") start = startOfDay(now);
    else if (horizon === "weekly") start = startOfWeek(now, { weekStartsOn: 1 });
    else if (horizon === "monthly") start = startOfMonth(now);

    const isInHorizon = (rawDate: string) => {
      if (horizon === "all" || !start) return true;
      try {
        const d = parseISO(rawDate);
        return isWithinInterval(d, { start, end });
      } catch { return false; }
    };

    // Optimization: Group logs by order ID using maps
    const prodMap = new Map();
    production_logs.forEach((l: any) => {
      if (!prodMap.has(l.order_id)) prodMap.set(l.order_id, []);
      prodMap.get(l.order_id).push(l);
    });

    const dispMap = new Map();
    dispatch_logs.forEach((l: any) => {
      if (!dispMap.has(l.order_id)) dispMap.set(l.order_id, []);
      dispMap.get(l.order_id).push(l);
    });

    const payMap = new Map();
    payment_logs.forEach((l: any) => {
      if (!payMap.has(l.order_id)) payMap.set(l.order_id, []);
      payMap.get(l.order_id).push(l);
    });

    const actMap = new Map();
    activity_logs.forEach((l: any) => {
      if (!actMap.has(l.order_id)) actMap.set(l.order_id, []);
      actMap.get(l.order_id).push(l);
    });

    const rwMap = new Map();
    rework_logs.forEach((l: any) => {
      if (!rwMap.has(l.order_id)) rwMap.set(l.order_id, []);
      rwMap.get(l.order_id).push(l);
    });

    const processedOrders = orders.map((o: any) => {
      const myProd = prodMap.get(o.id) || [];
      const myDisp = dispMap.get(o.id) || [];
      const myPay = payMap.get(o.id) || [];
      const myAct = actMap.get(o.id) || [];
      const myRework = rwMap.get(o.id) || [];

      const packedCount = myProd.filter((l: any) => l.stage === 'Packed').reduce((s: number, l: any) => s + (l.windows_completed || 0), 0);
      const dispCount = myDisp.reduce((s: number, l: any) => s + (l.windows_dispatched || 0), 0);
      const prodStarted = myProd.length > 0;
      const procStarted = myAct.some((l: any) => l.module?.includes("Procurement"));
      const storeReady = myAct.some((l: any) => l.module?.includes("Store"));
      const receiptAmount = myPay.filter((l: any) => l.status === "Confirmed").reduce((s: number, l: any) => s + Number(l.amount || 0), 0);
      
      const isCompleted = dispCount >= (o.total_windows || 0) && (o.total_windows || 0) > 0;

      return {
        ...o,
        packed: packedCount,
        dispatched: dispCount,
        prodStarted,
        procStarted,
        storeReady,
        receipt: receiptAmount,
        balance: Number(o.order_value || 0) - receiptAmount,
        isActive: !isCompleted,
        isCompleted,
        myProd,
        myDisp,
        myPay,
        myRework
      };
    });

    // Executive Snap
    const activeOrders = processedOrders.filter((o: any) => o.isActive);
    const completedOrders = processedOrders.filter((o: any) => o.isCompleted);

    const execSnapshot = {
      total: { 
        orders: processedOrders.length, 
        windows: processedOrders.reduce((s: number, o: any) => s + (o.total_windows || 0), 0),
        value: processedOrders.reduce((s: number, o: any) => s + Number(o.order_value || 0), 0)
      },
      active: {
        orders: activeOrders.length,
        windows: activeOrders.reduce((s: number, o: any) => s + (o.total_windows || 0), 0),
        value: activeOrders.reduce((s: number, o: any) => s + Number(o.order_value || 0), 0)
      },
      completed: {
        orders: completedOrders.length,
        windows: completedOrders.reduce((s: number, o: any) => s + (o.total_windows || 0), 0),
        value: completedOrders.reduce((s: number, o: any) => s + Number(o.order_value || 0), 0)
      }
    };

    // Funnel Logic
    const funnel = {
      orders: execSnapshot.total.orders,
      surveyed: processedOrders.filter((o: any) => (o.survey_done_windows || 0) > 0).length,
      designed: processedOrders.filter((o: any) => (o.design_released_windows || 0) > 0).length,
      procStarted: processedOrders.filter((o: any) => o.procStarted).length,
      storeReady: processedOrders.filter((o: any) => o.storeReady).length,
      prodStarted: processedOrders.filter((o: any) => o.prodStarted).length,
      packed: processedOrders.filter((o: any) => o.packed > 0).length,
      dispatched: processedOrders.filter((o: any) => o.dispatched > 0).length
    };

    const countOrdersInStage = (stage: string) => 
      new Set(production_logs.filter((l: any) => l.stage === stage).map((l: any) => l.order_id)).size;

    const status = {
      prod: {
        cutting: countOrdersInStage("Cutting"),
        assembly: countOrdersInStage("Assembly"),
        glazing: countOrdersInStage("Glazing"),
        quality: countOrdersInStage("Quality")
      },
      others: {
        dispatched: funnel.dispatched,
        surveyed: funnel.surveyed,
        designed: funnel.designed,
        payments: processedOrders.filter((o: any) => o.receipt > 0).length,
        rework: processedOrders.filter((o: any) => o.myRework.some((r: any) => r.status !== 'Solved')).length
      }
    };

    // Productivity Logs (Filtered by Horizon)
    const hProdLogs = production_logs.filter((l: any) => isInHorizon(l.entry_date || l.created_at));
    const hDispLogs = dispatch_logs.filter((l: any) => isInHorizon(l.created_at));
    const hPayLogs = payment_logs.filter((l: any) => isInHorizon(l.created_at));
    const hActLogs = activity_logs.filter((l: any) => isInHorizon(l.timestamp || l.created_at));
    const hRWLogs = rework_logs.filter((l: any) => isInHorizon(l.created_at));

    const productivity = {
      prodOrders: new Set(hProdLogs.map((l: any) => l.order_id)).size,
      prodWindows: hProdLogs.reduce((s: number, l: any) => s + (l.windows_completed || 0), 0),
      dispOrders: new Set(hDispLogs.map((l: any) => l.order_id)).size,
      surveyCount: new Set(hActLogs.filter((l: any) => l.module === "Survey").map((l: any) => l.order_id)).size,
      designCount: new Set(hActLogs.filter((l: any) => l.module === "Design").map((l: any) => l.order_id)).size,
      payRealized: hPayLogs.filter((l: any) => l.status === "Confirmed").reduce((s: number, l: any) => s + Number(l.amount || 0), 0),
    };

    // Backlog Calculation
    const backlog = {
      survey: processedOrders.filter((o: any) => (o.survey_done_windows || 0) === 0).length,
      design: processedOrders.filter((o: any) => (o.survey_done_windows || 0) > 0 && (o.design_released_windows || 0) === 0).length,
      production: processedOrders.filter((o: any) => (o.design_released_windows || 0) > 0 && !o.prodStarted).length,
      proc: processedOrders.filter((o: any) => (o.design_released_windows || 0) > 0 && !o.procStarted).length,
      store: processedOrders.filter((o: any) => o.procStarted && !o.storeReady).length,
    };

    // Efficiency Metrics
    const calcRate = (numerator: number, denominator: number) => 
      Math.round((numerator / (denominator || 1)) * 100) || 0;

    const perf = {
      survey: calcRate(funnel.surveyed, processedOrders.length),
      design: calcRate(funnel.designed, funnel.surveyed),
      proc: calcRate(funnel.procStarted, funnel.designed),
      collection: calcRate(processedOrders.reduce((s: number, o: any) => s + o.receipt, 0), execSnapshot.total.value),
    };

    const risk = {
      inactivity: processedOrders.filter((o: any) => {
        const lastLog = o.myProd.length > 0 ? new Date(o.myProd[o.myProd.length - 1].entry_date) : null;
        return lastLog && differenceInDays(now, lastLog) > 7; 
      }).length,
      stoppedProc: backlog.store,
      stoppedDisp: processedOrders.filter((o: any) => o.packed > 0 && o.dispatched === 0).length,
      paymentRisks: processedOrders.filter((o: any) => o.balance > 0 && o.isCompleted).length,
    };

    return { execSnapshot, funnel, status, productivity, backlog, perf, risk };
  }, [rawData, horizon]);

  if (loading || !computation) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Activity className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  const { execSnapshot, funnel, status, productivity, backlog, perf, risk }: any = computation;

  return (
    <div className="p-6 md:p-8 space-y-8 bg-slate-50 min-h-screen pb-24">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Operations Hub</h1>
          <p className="text-sm text-slate-500 font-medium">Global lifecycle tracking and departmental health</p>
        </div>
        <div className="flex bg-white rounded-lg p-1 border border-slate-200">
          {(["daily", "weekly", "monthly", "all"] as TimeHorizon[]).map((t) => (
            <button
              key={t}
              className={cn(
                "px-4 py-1.5 rounded-md text-xs font-semibold capitalize transition-all",
                horizon === t ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"
              )}
              onClick={() => setHorizon(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatGroup title="Active Pipeline" orders={execSnapshot.active.orders} windows={execSnapshot.active.windows} value={execSnapshot.active.value} icon={TrendingUp} onClick={() => navigate("/orders")} />
        <StatGroup title="Completed Cycle" orders={execSnapshot.completed.orders} windows={execSnapshot.completed.windows} value={execSnapshot.completed.value} icon={ClipboardList} onClick={() => navigate("/orders")} />
        <StatGroup title="Total Footprint" orders={execSnapshot.total.orders} windows={execSnapshot.total.windows} value={execSnapshot.total.value} icon={Activity} onClick={() => navigate("/orders")} />
      </section>

      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-6">Delivery Funnel</h2>
        <div className="grid grid-cols-4 md:grid-cols-7 gap-4">
          {[
            { label: "Orders", val: funnel.orders, col: "bg-slate-800", route: "/orders" },
            { label: "Survey", val: funnel.surveyed, col: "bg-blue-600", route: "/survey" },
            { label: "Design", val: funnel.designed, col: "bg-indigo-600", route: "/design" },
            { label: "Procurement", val: funnel.procStarted, col: "bg-purple-600", route: "/procurement" },
            { label: "Store", val: funnel.storeReady, col: "bg-amber-600", route: "/store" },
            { label: "Production", val: funnel.prodStarted, col: "bg-orange-600", route: "/production" },
            { label: "Packed", val: funnel.packed, col: "bg-emerald-600", route: "/production" },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => navigate(item.route)}>
              <div className={cn("w-full h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm group-hover:scale-105 transition-transform", item.col)}>
                {item.val}
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase">{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <section>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Departmental Status</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Production</span>
                <div className="space-y-3">
                  <MiniStat title="Cutting" value={status.prod.cutting} subtext="Active orders" icon={Factory} onClick={() => navigate("/production")} />
                  <MiniStat title="Assembly" value={status.prod.assembly} subtext="On floor" icon={Factory} onClick={() => navigate("/production")} />
                  <MiniStat title="Quality" value={status.prod.quality} subtext="Testing stage" icon={Factory} onClick={() => navigate("/production")} />
                </div>
              </div>
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Survey & Design</span>
                <div className="space-y-3">
                  <MiniStat title="Surveyed" value={status.others.surveyed} subtext="Site ready" icon={Maximize2} colorClass="text-blue-600" onClick={() => navigate("/survey")} />
                  <MiniStat title="Designed" value={status.others.designed} subtext="CAD released" icon={Monitor} colorClass="text-indigo-600" onClick={() => navigate("/design")} />
                </div>
              </div>
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Finance</span>
                <div className="space-y-3">
                  <MiniStat title="Payments" value={status.others.payments} subtext="Rec. confirmed" icon={DollarSign} colorClass="text-emerald-600" onClick={() => navigate("/finance")} />
                  <MiniStat title="Rework" value={status.others.rework} subtext="Active cases" icon={AlertCircle} colorClass="text-red-600" onClick={() => navigate("/rework")} />
                </div>
              </div>
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Dispatch</span>
                <div className="space-y-3">
                  <MiniStat title="In Transit" value={status.others.dispatched} subtext="Active loads" icon={Truck} colorClass="text-slate-800" onClick={() => navigate("/dispatch")} />
                </div>
              </div>
            </div>
          </section>

          <section className="bg-slate-900 p-8 rounded-2xl text-white shadow-lg relative border border-slate-800">
            <div className="flex items-center gap-3 mb-8">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">Productivity Summary</h2>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: "Production Activity", val: productivity.prodOrders, unit: "Orders", route: "/production" },
                { label: "Windows Completed", val: productivity.prodWindows, unit: "Windows", route: "/production" },
                { label: "Orders Dispatched", val: productivity.dispOrders, unit: "Orders", route: "/dispatch" },
                { label: "Surveys Done", val: productivity.surveyCount, unit: "Orders", route: "/survey" },
                { label: "Designs Released", val: productivity.designCount, unit: "Orders", route: "/design" },
                { label: "Payments Confirmed", val: fVal(productivity.payRealized), unit: "Revenue", route: "/finance" },
              ].map((p, i) => (
                <div key={i} className="p-5 bg-white/5 rounded-xl hover:bg-white/10 transition-all cursor-pointer border border-white/5" onClick={() => navigate(p.route)}>
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">{p.label}</p>
                  <p className="text-2xl font-bold tracking-tight">{p.val}</p>
                  <p className="text-[10px] font-medium text-slate-400 mt-1">{p.unit}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <section className="bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Queue / Backlog</h2>
              <Timer className="h-4 w-4 text-slate-300" />
            </div>
            <div className="p-4 space-y-1">
              {[
                { label: "Pending Survey", val: backlog.survey, route: "/survey" },
                { label: "Pending Design", val: backlog.design, route: "/design" },
                { label: "Pending Production", val: backlog.production, route: "/production" },
                { label: "PO Pending", val: backlog.proc, route: "/procurement" },
                { label: "Pending Store", val: backlog.store, route: "/store" },
              ].map((b, i) => (
                <div key={i} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors" onClick={() => navigate(b.route)}>
                  <span className="text-xs font-semibold text-slate-600">{b.label}</span>
                  <span className="text-sm font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-md">{b.val}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-6">Efficiency Indices</h2>
            <div className="space-y-5">
              {[
                { label: "Survey Completion", val: perf.survey, colors: "bg-blue-600", route: "/survey" },
                { label: "Design Release Rate", val: perf.design, colors: "bg-indigo-600", route: "/design" },
                { label: "Procurement Pace", val: perf.proc, colors: "bg-purple-600", route: "/procurement" },
                { label: "Collection Health", val: perf.collection, colors: "bg-emerald-600", route: "/finance" },
              ].map((p, i) => (
                <div key={i} className="space-y-1.5 cursor-pointer" onClick={() => navigate(p.route)}>
                  <div className="flex justify-between text-[11px] font-bold text-slate-500">
                    <span className="uppercase">{p.label}</span>
                    <span className="text-slate-900">{p.val}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full">
                    <div className={cn("h-full rounded-full transition-all duration-700", p.colors)} style={{ width: `${p.val}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-red-50 border border-red-100 p-6 rounded-xl space-y-5">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <h2 className="text-xs font-bold uppercase tracking-wider">Critical Alerts</h2>
            </div>
            <div className="space-y-3">
              {[
                { label: "Production Inactivity", val: risk.inactivity, route: "/production" },
                { label: "Procurement Blocks", val: risk.stoppedProc, route: "/procurement" },
                { label: "Dispatch Stalls", val: risk.stoppedDisp, route: "/dispatch" },
                { label: "Collection risk", val: risk.paymentRisks, route: "/finance" },
              ].map((ra, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-white rounded-lg border border-red-200 cursor-pointer hover:shadow-sm" onClick={() => navigate(ra.route)}>
                  <span className="text-xs font-bold text-slate-700">{ra.label}</span>
                  <span className="text-sm font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded shadow-sm">{ra.val}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
