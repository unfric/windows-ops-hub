import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportDataToExcel } from "@/lib/excelUtils";
import { useAggregatedOrders } from "@/hooks/useAggregatedOrders";
import { PageHeader, PageWrapper, StatusDot } from "@/components/shared/DashboardComponents";
import { cn } from "@/lib/utils";

export default function ReworkPage() {
  const { orders, rework_logs, loading } = useAggregatedOrders();
  const [activeTab, setActiveTab] = useState("pending");

  const reworkMap: Record<string, any[]> = {};
  (rework_logs || []).forEach((l: any) => {
    if (!reworkMap[l.order_id]) reworkMap[l.order_id] = [];
    reworkMap[l.order_id].push(l);
  });

  const ordersWithRework = orders.filter((o) => (reworkMap[o.id] || []).length > 0);
  const pendingOrders = ordersWithRework.filter((o) => (reworkMap[o.id] || []).some((r: any) => r.status === "Pending"));
  const inProgressOrders = ordersWithRework.filter((o) => (reworkMap[o.id] || []).some((r: any) => r.status === "In Progress"));
  const solvedOrders = ordersWithRework.filter((o) => (reworkMap[o.id] || []).every((r: any) => r.status === "Solved" || r.status === "Closed"));

  const getLatestIssue = (id: string) => {
    const logs = reworkMap[id] || [];
    if (logs.length === 0) return { issue: "—", resp: "—", date: "—", qty: 0 };
    const latest = [...logs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    return {
      issue: latest.issue_type || latest.rework_issue || "—",
      resp: latest.responsible_person || "—",
      date: new Date(latest.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      qty: latest.rework_qty || 0
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

  const handleExport = () => {
    let list = ordersWithRework;
    if (activeTab === "pending") list = pendingOrders;
    else if (activeTab === "inprogress") list = inProgressOrders;
    else if (activeTab === "solved") list = solvedOrders;

    const headers = ["Order", "Owner", "Salesperson", "Status", "Latest Issue", "Qty", "Responsible", "Reported Date", "Value"];
    const data = list.map(o => {
      const logs = reworkMap[o.id] || [];
      const latest = logs[0] || {};
      return {
        "Order": o.order_name,
        "Owner": o.dealer_name,
        "Salesperson": o.salesperson || "",
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

  const renderTable = (list: any[]) => (
    <div className="rounded-[32px] border border-slate-200 bg-white/60 backdrop-blur-md shadow-xl shadow-slate-200/40 overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="border-slate-100 hover:bg-transparent">
              <TableHead className="py-5 px-6 font-black text-[10px] uppercase tracking-widest text-slate-400">Order Entity</TableHead>
              <TableHead className="py-5 font-black text-[10px] uppercase tracking-widest text-slate-400">Rework Protocol</TableHead>
              <TableHead className="py-5 font-black text-[10px] uppercase tracking-widest text-slate-400">Responsible</TableHead>
              <TableHead className="py-5 font-black text-[10px] uppercase tracking-widest text-slate-400">Timestamp</TableHead>
              <TableHead className="py-5 font-black text-[10px] uppercase tracking-widest text-slate-400 text-right px-6">Resolution</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-32">
                   <div className="flex flex-col items-center gap-4">
                      <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">Auditing Rework Stream...</p>
                   </div>
                </TableCell>
              </TableRow>
            ) : list.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-32">
                   <div className="flex flex-col items-center gap-4 opacity-50">
                      <AlertTriangle className="h-12 w-12 text-slate-200" />
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Clear quality control logs</p>
                   </div>
                </TableCell>
              </TableRow>
            ) : (
              list.map((o) => {
                const latest = getLatestIssue(o.id);
                const status = getStatus(o.id);
                return (
                  <TableRow key={o.id} className="group/row hover:bg-slate-50/80 transition-all border-slate-100 h-24">
                    <TableCell className="px-6">
                       <div className="flex flex-col gap-0.5">
                          <Link to={`/orders/${o.id}`} className="font-bold text-slate-900 hover:text-primary transition-colors truncate text-[13px]">{o.order_name}</Link>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter line-clamp-1">{o.dealer_name}</span>
                       </div>
                    </TableCell>
                    <TableCell>
                       <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                             <Badge variant="outline" className="text-[9px] font-black uppercase py-0.5 px-2 border-red-100 bg-red-50 text-red-600">
                                {latest.qty} UNITS
                             </Badge>
                             <span className="font-bold text-slate-900 text-[11px] truncate">{latest.issue}</span>
                          </div>
                       </div>
                    </TableCell>
                    <TableCell>
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-100/50 px-2 py-1 rounded-lg border border-slate-200/50">
                          {latest.resp}
                       </span>
                    </TableCell>
                    <TableCell>
                       <span className="text-[10px] font-bold text-slate-400 block">{latest.date}</span>
                    </TableCell>
                    <TableCell className="px-6 text-right">
                       <div className="flex items-center justify-end gap-2">
                          <StatusDot status={status === "Solved" ? "green" : status === "In Progress" ? "blue" : "red"} />
                          <span className={cn("text-[10px] font-black uppercase tracking-widest", 
                            status === "Solved" ? "text-emerald-600" : 
                            status === "In Progress" ? "text-blue-600" : "text-red-600"
                          )}>
                             {status}
                          </span>
                       </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  return (
    <PageWrapper title="Rework & Defect Tracking">
      <PageHeader 
        title="Quality Guard" 
        subtitle={`${pendingOrders.length} OPEN DEVIATIONS REQUIRING ATTENTION`}
        icon={AlertTriangle}
      >
        <Button variant="outline" size="sm" className="h-10 text-[10px] font-black uppercase tracking-[0.1em] rounded-xl border-slate-200" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" /> Export Deviation Log
        </Button>
      </PageHeader>

      <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-6">
           <TabsList className="bg-slate-100/50 p-1 h-11 rounded-2xl border border-slate-200/50">
             <TabsTrigger value="pending" className="rounded-xl px-4 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Awaiting ({pendingOrders.length})</TabsTrigger>
             <TabsTrigger value="inprogress" className="rounded-xl px-4 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">In Correction ({inProgressOrders.length})</TabsTrigger>
             <TabsTrigger value="solved" className="rounded-xl px-4 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Rectified ({solvedOrders.length})</TabsTrigger>
             <TabsTrigger value="all" className="rounded-xl px-4 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Full History</TabsTrigger>
           </TabsList>
        </div>
        
        <TabsContent value="pending" className="mt-0 outline-none">{renderTable(pendingOrders)}</TabsContent>
        <TabsContent value="inprogress" className="mt-0 outline-none">{renderTable(inProgressOrders)}</TabsContent>
        <TabsContent value="solved" className="mt-0 outline-none">{renderTable(solvedOrders)}</TabsContent>
        <TabsContent value="all" className="mt-0 outline-none">{renderTable(ordersWithRework)}</TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
