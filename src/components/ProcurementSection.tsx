import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUS_VALUES = ["Pending PO", "PO Placed", "Delivered", "Not Required"];
const COATING_VALUES = ["Pending Coating", "Sent to Coating", "Delivered", "Not Required"];

const FIELDS = [
  { label: "Hardware PO", field: "hardware_po_status", date_field: "hardware_delivery_date", statuses: STATUS_VALUES },
  { label: "Extrusion PO", field: "extrusion_po_status", date_field: "extrusion_delivery_date", statuses: STATUS_VALUES },
  { label: "Glass PO", field: "glass_po_status", date_field: "glass_delivery_date", statuses: STATUS_VALUES },
  { label: "Sent to Coating", field: "coating_status", date_field: "coating_delivery_date", statuses: COATING_VALUES },
];

interface ProcurementSectionProps {
  orderId: string;
  order: any;
  onRefresh: () => void;
  readOnly?: boolean;
}

export default function ProcurementSection({ orderId, order, onRefresh, readOnly }: ProcurementSectionProps) {
  const updateField = async (field: string, value: any) => {
    if (readOnly) return;
    try {
      // 1. Update main field
      await api.orders.updateField(orderId, field, value, "Procurement");

      // 2. Unified Auto-sync to Store if necessary
      const storeFieldMap: Record<string, string> = {
        hardware_po_status: "hardware_availability",
        extrusion_po_status: "extrusion_availability",
        glass_po_status: "glass_availability",
        coating_status: "coated_extrusion_availability",
      };

      const storeField = storeFieldMap[field];
      if (storeField && order[storeField] !== value) {
        await api.orders.updateField(orderId, storeField, value, "Procurement -> Store AutoSync");
      }

      toast.success("Updated");
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Procurement — PO & Delivery Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {FIELDS.map((f) => {
            return (
              <div key={f.field} className="space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{f.label}</Label>
                  <Select 
                    disabled={readOnly} 
                    value={order[f.field] || f.statuses[0]} 
                    onValueChange={(v) => updateField(f.field, v)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {f.statuses.map((s) => {
                        let isDisabledOption = false;
                        let tooltipText = "";

                        if (f.field === "coating_status" && (s === "Sent to Coating" || s === "Delivered")) {
                          const hasExtrusion = order.extrusion_availability === "In Stock / Available";
                          if (!hasExtrusion) {
                            isDisabledOption = true;
                            tooltipText = " (Req. Extrusion in Store)";
                          }
                        }

                        return (
                          <SelectItem key={s} value={s} disabled={isDisabledOption}>
                            {s}{tooltipText}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                {(order[f.field] === "PO Placed" || order[f.field] === "Sent to Coating") && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Delivery By</Label>
                    <Input
                      type="date"
                      defaultValue={order[f.date_field] || ""}
                      readOnly={readOnly}
                      className={cn(readOnly && "bg-muted")}
                      onBlur={(e) => updateField(f.date_field, e.target.value || null)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Procurement Remarks</Label>
          <Textarea
            defaultValue={order.procurement_remarks || ""}
            readOnly={readOnly}
            className={cn(readOnly && "bg-muted")}
            rows={2}
            onBlur={(e) => {
              if (e.target.value !== (order.procurement_remarks || "")) updateField("procurement_remarks", e.target.value);
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
