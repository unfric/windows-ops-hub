import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import StatusDropdown from "@/components/StatusDropdown";
import { STATUS_OPTIONS } from "@/lib/statusConfig";
import { logAuditEntry } from "@/lib/auditLog";
import { logActivity } from "@/lib/activityLog";
import { triggerStatusNotification } from "@/lib/notifications";
import { cn } from "@/lib/utils";

import ReworkSection from "@/components/ReworkSection";
import InstallationSection from "@/components/InstallationSection";
import FinanceSection from "@/components/FinanceSection";
import SurveySection from "@/components/SurveySection";
import DesignSection from "@/components/DesignSection";
import StoreSection from "@/components/StoreSection";
import ProcurementSection from "@/components/ProcurementSection";
import ProductionSection from "@/components/ProductionSection";
import DispatchSection from "@/components/DispatchSection";
import OrderActivityLog from "@/components/OrderActivityLog";

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { roles: userRoles } = useUserRoles();
  const [activeTab, setActiveTab] = useState("details");

  const isAdmin = userRoles.includes("admin");
  const isManagement = userRoles.includes("management");

  const canEdit = (moduleRole: string | string[]) => {
    if (isAdmin || isManagement) return true;
    if (Array.isArray(moduleRole)) {
      return moduleRole.some(r => userRoles.includes(r as any));
    }
    return userRoles.includes(moduleRole as any);
  };

  const fetchAll = async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .single();
    if (error) {
      toast.error("Order not found");
      return;
    }
    setOrder(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, [id]);

  const updateOrder = async (field: string, value: any) => {
    const oldValue = order[field];
    const { error } = await supabase
      .from("orders")
      .update({ [field]: value })
      .eq("id", id!);

    if (error) {
      toast.error(error.message);
    } else {
      await logAuditEntry({
        entityType: "orders",
        entityId: id!,
        field,
        oldValue: oldValue != null ? String(oldValue) : null,
        newValue: value != null ? String(value) : null,
      });

      await logActivity({
        orderId: id!,
        module: "Sales",
        fieldName: field,
        oldValue: oldValue != null ? String(oldValue) : null,
        newValue: value != null ? String(value) : null,
      });

      if (field.endsWith("_status")) {
        triggerStatusNotification(id!, order.order_name, field, String(value));
      }
      toast.success("Updated");
      fetchAll();
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!order) return <div className="p-8">Order not found</div>;

  const currentCommercialStatus = order.commercial_status || (STATUS_OPTIONS["commercial_status"] ? STATUS_OPTIONS["commercial_status"][0] : "Draft");

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="h-4 w-4" /> Back to Orders
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">{order.order_name}</h1>
          <p className="text-muted-foreground">{order.dealer_name}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="h-fit bg-blue-50 text-blue-700 border-blue-200">
            {currentCommercialStatus}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">Quote #</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold">{order.quote_no || "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">Commercial Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="text-lg font-bold py-1">
              {currentCommercialStatus}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">Total Windows</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{order.total_windows}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">₹{Number(order.balance_amount).toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Stepper */}
      <PipelineStepper
        order={order}
        activeTab={activeTab}
        onStepClick={(tab) => setActiveTab(tab)}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Hidden TabsList as requested */}
        <TabsList className="hidden">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="survey">Survey</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
          <TabsTrigger value="design">Design</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="production">Production</TabsTrigger>
          <TabsTrigger value="dispatch">Dispatch</TabsTrigger>
          <TabsTrigger value="installation">Installation</TabsTrigger>
          <TabsTrigger value="rework">Rework</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Sales Order Number</Label>
                <Input
                  defaultValue={order.sales_order_no ?? ""}
                  readOnly={!canEdit(["sales", "design"])}
                  className={!canEdit(["sales", "design"]) ? "bg-muted" : ""}
                  onBlur={(e) => {
                    const val = e.target.value;
                    if (val !== (order.sales_order_no ?? "").toString()) updateOrder("sales_order_no", val);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Colour / Shade</Label>
                <Input
                  defaultValue={order.colour_shade ?? ""}
                  readOnly={!canEdit(["sales", "design"])}
                  className={!canEdit(["sales", "design"]) ? "bg-muted" : ""}
                  onBlur={(e) => {
                    const val = e.target.value;
                    if (val !== (order.colour_shade ?? "").toString()) updateOrder("colour_shade", val);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Advance Received (₹)</Label>
                <Input
                  type="number"
                  defaultValue={order.advance_received ?? ""}
                  readOnly={!canEdit("sales")}
                  className={!canEdit("sales") ? "bg-muted" : ""}
                  onBlur={(e) => {
                    const val = Number(e.target.value);
                    if (val !== Number(order.advance_received ?? 0)) updateOrder("advance_received", val);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Order Value (₹)</Label>
                <Input
                  type="number"
                  defaultValue={order.order_value ?? ""}
                  readOnly={!canEdit("sales")}
                  className={!canEdit("sales") ? "bg-muted" : ""}
                  onBlur={(e) => {
                    const val = Number(e.target.value);
                    if (val !== Number(order.order_value ?? 0)) updateOrder("order_value", val);
                  }}
                />
              </div>
            </CardContent>
          </Card>
          <OrderActivityLog orderId={id!} module="Sales" refreshKey={order.updated_at || order.created_at} />
        </TabsContent>

        <TabsContent value="survey" className="mt-4">
          <SurveySection orderId={id!} order={order} onRefresh={fetchAll} updateOrder={updateOrder} readOnly={!canEdit("survey")} />
        </TabsContent>

        <TabsContent value="finance" className="mt-4">
          <FinanceSection orderId={id!} order={order} onRefresh={fetchAll} updateOrder={updateOrder} readOnly={!canEdit("finance")} />
        </TabsContent>

        <TabsContent value="design" className="mt-4">
          <DesignSection orderId={id!} order={order} onRefresh={fetchAll} updateOrder={updateOrder} readOnly={!canEdit("design")} />
        </TabsContent>

        <TabsContent value="materials" className="mt-4 space-y-6">
          <StoreSection orderId={id!} order={order} onRefresh={fetchAll} readOnly={!canEdit("stores")} />
          <ProcurementSection orderId={id!} order={order} onRefresh={fetchAll} readOnly={!canEdit("procurement")} />
          <OrderActivityLog
            orderId={id!}
            module={["Store", "Procurement", "Store -> Procurement AutoSync", "Procurement -> Store AutoSync"]}
            refreshKey={order.updated_at || order.created_at}
          />
        </TabsContent>

        <TabsContent value="production" className="mt-4">
          <ProductionSection orderId={id!} order={order} onRefresh={fetchAll} readOnly={!canEdit("production")} />
        </TabsContent>

        <TabsContent value="dispatch" className="mt-4">
          <DispatchSection orderId={id!} order={order} onRefresh={fetchAll} updateOrder={updateOrder} readOnly={!canEdit("dispatch")} />
        </TabsContent>

        <TabsContent value="installation" className="mt-4">
          <InstallationSection orderId={id!} order={order} onRefresh={fetchAll} updateOrder={updateOrder} readOnly={!canEdit("installation")} />
        </TabsContent>

        <TabsContent value="rework" className="mt-4">
          <ReworkSection orderId={id!} readOnly={!canEdit(["production", "installation", "design"])} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PipelineStepper({
  order,
  activeTab,
  onStepClick
}: {
  order: any,
  activeTab: string,
  onStepClick: (tab: string) => void
}) {
  const [reworkLogs, setReworkLogs] = useState<any[]>([]);
  const [productionLogs, setProductionLogs] = useState<any[]>([]);
  const [dispatchLogs, setDispatchLogs] = useState<any[]>([]);
  const [installLogs, setInstallLogs] = useState<any[]>([]);

  useEffect(() => {
    const fetchLogData = async () => {
      const [rRes, pRes, dRes, iRes] = await Promise.all([
        supabase.from("rework_logs" as any).select("*").eq("order_id", order.id),
        supabase.from("production_logs" as any).select("*").eq("order_id", order.id),
        supabase.from("dispatch_logs" as any).select("*").eq("order_id", order.id),
        supabase.from("installation_logs" as any).select("*").eq("order_id", order.id)
      ]);
      setReworkLogs(rRes.data || []);
      setProductionLogs(pRes.data || []);
      setDispatchLogs(dRes.data || []);
      setInstallLogs(iRes.data || []);
    };
    fetchLogData();
  }, [order.id]);

  const packedCount = productionLogs.filter(l => l.stage === "Packed").reduce((s, l) => s + (l.windows_completed || 0), 0);
  const dispatchedCount = dispatchLogs.reduce((s, l) => s + (l.windows_dispatched || 0), 0);
  const installedCount = installLogs.reduce((s, l) => s + (l.windows_installed || 0), 0);

  const getShortStatus = (step: any) => {
    const { label, status, qty, total } = step;

    if (label === "Materials") {
      const availabilities = [
        order.hardware_availability,
        order.extrusion_availability,
        order.glass_availability,
        order.coated_extrusion_availability
      ];
      if (availabilities.every(v => v === "In Stock / Available" || v === "Not Required")) return "Stock";
      if (availabilities.some(v => v?.includes("Partial") || v?.includes("In Stock") || v?.includes("Placed") || v?.includes("Sent"))) return "Part Avl";
      return "Pnd";
    }

    if (label === "Finance") {
      const s = status?.toLowerCase() || "";
      if (s.includes("finance approved")) return "Fin Appr";
      if (s.includes("deviation approved")) return "Dev Appr";
      if (s.includes("advance received")) return "Adv Recv";
      return "Pnd";
    }

    if (label === "Rework") {
      if (!reworkLogs || reworkLogs.length === 0) return "NA";
      const solved = reworkLogs.filter(l => l.status === "Solved" || l.status === "Closed").length;
      return `${solved}/${reworkLogs.length}`;
    }

    // Fixed: Ensure ratios are shown even if qty or total is 0, but only if they are numeric
    if (qty !== undefined && qty !== null && total !== undefined && total !== null) {
      if (total > 0 && qty >= total) return "Comp";
      return `${qty}/${total}`;
    }

    if (!status) return "Pnd";
    return status.substring(0, 5);
  };

  const steps = [
    { label: "Details", tab: "details" },
    { label: "Survey", tab: "survey", status: order.survey_status, qty: order.survey_done_windows, total: order.total_windows },
    { label: "Finance", tab: "finance", status: order.finance_status },
    { label: "Design", tab: "design", status: order.design_status, qty: order.design_released_windows, total: order.survey_done_windows },
    { label: "Materials", tab: "materials" },
    { label: "Production", tab: "production", qty: packedCount, total: order.total_windows },
    { label: "Dispatch", tab: "dispatch", qty: dispatchedCount, total: order.design_released_windows || 0 },
    { label: "Installation", tab: "installation", qty: installedCount, total: order.total_windows },
    { label: "Rework", tab: "rework" },
  ];

  return (
    <Card className="bg-muted/30">
      <CardContent className="py-6 overflow-x-auto">
        <div className="flex items-center justify-between min-w-[950px] px-4">
          {steps.map((step, idx) => {
            const isLast = idx === steps.length - 1;
            const shortStatus = getShortStatus(step);
            const isActive = activeTab === step.tab;

            const isCompleted = shortStatus === "Comp" ||
              shortStatus === "Fin Appr" ||
              shortStatus === "Stock" ||
              (step.label === "Rework" && reworkLogs.length > 0 && shortStatus.split("/")[0] === shortStatus.split("/")[1]);

            const isPending = shortStatus === "Pnd" || shortStatus === "NA";

            return (
              <div key={step.label} className="flex-1 flex items-center">
                <button
                  onClick={() => onStepClick(step.tab)}
                  className={cn(
                    "flex flex-col items-center gap-2 transition-all hover:opacity-80 outline-none",
                    isActive ? "scale-110" : "opacity-70"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all",
                    isCompleted ? "bg-green-500 border-green-500 text-white" :
                      isPending ? "bg-muted border-muted-foreground/30 text-muted-foreground" :
                        "bg-blue-500 border-blue-500 text-white",
                    isActive && "ring-2 ring-primary ring-offset-2"
                  )}>
                    {isCompleted ? <Check className="h-4 w-4" /> : idx + 1}
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-wider",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}>{step.label}</span>
                  {shortStatus && (
                    <Badge variant="outline" className={cn(
                      "text-[9px] px-1 py-0 h-4 whitespace-nowrap bg-background",
                      isActive && "border-primary text-primary font-bold"
                    )}>
                      {shortStatus}
                    </Badge>
                  )}
                </button>
                {!isLast && (
                  <div className={cn(
                    "flex-1 h-0.5 mx-2 transition-all mt-[-20px]",
                    isCompleted ? "bg-green-500" : "bg-muted-foreground/20"
                  )} />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
