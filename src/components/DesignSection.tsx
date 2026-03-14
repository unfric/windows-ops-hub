import { api } from "@/services/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import StatusDropdown from "./StatusDropdown";
import OrderActivityLog from "./OrderActivityLog";

export default function DesignSection({ orderId, order, onRefresh, updateOrder, readOnly }: {
  orderId: string;
  order: any;
  onRefresh: () => void;
  updateOrder: (field: string, value: any) => void;
  readOnly?: boolean;
}) {
  const surveyDone = order.survey_done_windows || 0;
  const released = order.design_released_windows || 0;
  const releasePending = Math.max(0, surveyDone - released);

  const updateField = async (field: string, value: any) => {
    if (readOnly) return;
    const oldVal = order[field];
    if (String(oldVal ?? "") === String(value ?? "")) return;

    // Validation: design_released_windows cannot exceed survey_done_windows
    if (field === "design_released_windows") {
      const numVal = Number(value) || 0;
      if (numVal > surveyDone) {
        toast.error(`Design released cannot exceed surveyed windows (${surveyDone})`);
        return;
      }
      if (numVal < 0) {
        toast.error("Cannot be negative");
        return;
      }
    }

    try {
      await api.orders.updateField(orderId, field, value, "Design");
      toast.success("Updated");
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Surveyed Windows</p>
            <p className="text-lg font-semibold">{surveyDone}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Design Released</p>
            <p className="text-lg font-semibold text-success">{released}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Release Pending</p>
            <p className="text-lg font-semibold">{releasePending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Prod. Approval</p>
            <p className="text-lg font-semibold">{order.approval_for_production || "Pending"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Editable fields */}
      <Card>
        <CardHeader><CardTitle className="text-base">Design Details</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">SO Number</Label>
              <Input
                defaultValue={order.sales_order_no || ""}
                readOnly={readOnly}
                className={readOnly ? "bg-muted" : ""}
                onBlur={(e) => updateField("sales_order_no", e.target.value || null)}
                placeholder={readOnly ? "" : "Enter SO number..."}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Design Released (Windows)</Label>
              <Input
                type="number"
                min={0}
                max={surveyDone}
                defaultValue={released}
                readOnly={readOnly}
                className={readOnly ? "bg-muted" : ""}
                onBlur={(e) => updateField("design_released_windows", Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Release Pending</Label>
              <Input type="number" value={releasePending} readOnly className="bg-muted" />
            </div>
            <div className="space-y-1 col-span-2 md:col-span-3">
              <Label className="text-xs text-muted-foreground">Remarks</Label>
              <Textarea
                className={cn("min-h-[60px]", readOnly && "bg-muted")}
                defaultValue={order.design_remarks || ""}
                readOnly={readOnly}
                onBlur={(e) => updateField("design_remarks", e.target.value || null)}
                placeholder={readOnly ? "" : "Design notes..."}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <OrderActivityLog orderId={orderId} module="Design" refreshKey={order.updated_at || order.created_at} />
    </div>
  );
}
