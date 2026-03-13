import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { logActivity } from "@/lib/activityLog";

import { cn } from "@/lib/utils";
import StatusDropdown from "./StatusDropdown";
import OrderActivityLog from "./OrderActivityLog";

export default function SurveySection({ orderId, order, onRefresh, updateOrder, readOnly }: {
  orderId: string;
  order: any;
  onRefresh: () => void;
  updateOrder: (field: string, value: any) => void;
  readOnly?: boolean;
}) {
  const totalWindows = order.total_windows || 0;
  const surveyDone = order.survey_done_windows || 0;
  const surveyPending = Math.max(0, totalWindows - surveyDone);

  const updateField = async (field: string, value: any) => {
    if (readOnly) return;
    const oldVal = order[field];
    if (String(oldVal ?? "") === String(value ?? "")) return;

    // Validation: survey_done_windows cannot exceed total_windows
    if (field === "survey_done_windows") {
      const numVal = Number(value) || 0;
      if (numVal > totalWindows) {
        toast.error(`Survey done cannot exceed total windows (${totalWindows})`);
        return;
      }
      if (numVal < 0) {
        toast.error("Survey done cannot be negative");
        return;
      }
    }

    const { error } = await supabase.from("orders").update({ [field]: value } as any).eq("id", orderId);
    if (error) { toast.error(error.message); return; }

    await logActivity({
      orderId,
      module: "Survey",
      fieldName: field,
      oldValue: oldVal != null ? String(oldVal) : null,
      newValue: value != null ? String(value) : null,
    });
    toast.success("Updated");
    onRefresh();
  };

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Total Windows</p>
            <p className="text-lg font-semibold">{totalWindows}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Survey Done</p>
            <p className="text-lg font-semibold text-success">{surveyDone}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Survey Pending</p>
            <p className="text-lg font-semibold">{surveyPending}</p>
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
        <CardHeader><CardTitle className="text-base">Survey Details</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Survey Done (Windows)</Label>
              <Input
                type="number"
                min={0}
                max={totalWindows}
                defaultValue={surveyDone}
                readOnly={readOnly}
                className={readOnly ? "bg-muted" : ""}
                onBlur={(e) => updateField("survey_done_windows", Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Survey Pending</Label>
              <Input type="number" value={surveyPending} readOnly className="bg-muted" />
            </div>
            <div className="space-y-1 col-span-2 md:col-span-1">
              <Label className="text-xs text-muted-foreground">Remarks</Label>
                <Textarea
                  defaultValue={order.survey_remarks || ""}
                  readOnly={readOnly}
                  className={cn("min-h-[60px]", readOnly && "bg-muted")}
                  onBlur={(e) => updateField("survey_remarks", e.target.value || null)}
                  placeholder={readOnly ? "" : "Survey notes..."}
                />
            </div>
          </div>
        </CardContent>
      </Card>

      <OrderActivityLog orderId={orderId} module="Survey" refreshKey={order.updated_at || order.created_at} />
    </div>
  );
}
