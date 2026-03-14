import { useState } from "react";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const AVAILABILITY_VALUES = ["Pending PO", "PO Placed", "Partially Available", "In Stock / Available", "Not Required"];
const COATING_VALUES = ["Pending Coating", "Sent to Coating", "Partially Available", "In Stock / Available", "Not Required"];

const FIELDS = [
  { label: "Hardware Availability", field: "hardware_availability" },
  { label: "Extrusion Availability", field: "extrusion_availability" },
  { label: "Glass Availability", field: "glass_availability" },
  { label: "Coated Extrusion Availability", field: "coated_extrusion_availability" },
];

interface StoreSectionProps {
  orderId: string;
  order: any;
  onRefresh: () => void;
  readOnly?: boolean;
}

import { cn } from "@/lib/utils";

export default function StoreSection({ orderId, order, onRefresh, readOnly }: StoreSectionProps) {
  const updateField = async (field: string, value: any) => {
    try {
      // 1. Update main field
      await api.orders.updateField(orderId, field, value, "Store");

      // 2. Unified Auto-sync to Procurement if necessary
      const procurementFieldMap: Record<string, string> = {
        hardware_availability: "hardware_po_status",
        extrusion_availability: "extrusion_po_status",
        glass_availability: "glass_po_status",
        coated_extrusion_availability: "coating_status",
      };

      const poField = procurementFieldMap[field];
      if (poField && order[poField] !== value) {
        await api.orders.updateField(orderId, poField, value, "Store -> Procurement AutoSync");
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
        <CardTitle className="text-base">Store — Material Availability</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {FIELDS.map((f) => {
            const currentVal = order[f.field];
            const isCurrentlyAvailable = currentVal === "Yes" || currentVal === "Delivered";

            return (
              <div key={f.field} className="space-y-1">
                <Label className="text-xs text-muted-foreground">{f.label}</Label>
                <Select disabled={readOnly} value={order[f.field] || "No"} onValueChange={(v) => updateField(f.field, v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(f.field === "coated_extrusion_availability" ? COATING_VALUES : AVAILABILITY_VALUES).map((s) => {
                      let isDisabledOption = false;
                      let tooltipText = "";

                      if (f.field === "coated_extrusion_availability" && (s === "Sent to Coating" || s === "Partially Available" || s === "In Stock / Available")) {
                        const hasExtrusion = order.extrusion_availability === "In Stock / Available";
                        if (!hasExtrusion) {
                          isDisabledOption = true;
                          tooltipText = " (Req. Extrusion)";
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
            );
          })}
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Store Remarks</Label>
          <Textarea
            defaultValue={order.store_remarks || ""}
            readOnly={readOnly}
            className={cn(readOnly && "bg-muted")}
            rows={2}
            onBlur={(e) => {
              if (e.target.value !== (order.store_remarks || "")) updateField("store_remarks", e.target.value);
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
