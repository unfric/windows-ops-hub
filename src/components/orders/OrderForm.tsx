
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useSettingsOptions } from "@/hooks/useSettingsOptions";
import { toast } from "sonner";

interface OrderFormProps {
  initialData?: any;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  submitting: boolean;
  submitLabel?: string;
}

export default function OrderForm({ initialData, onSubmit, onCancel, submitting, submitLabel = "Save Order" }: OrderFormProps) {
  const isEditing = !!initialData;
  const { settings, ownerOptions, loading: settingsLoading } = useSettingsOptions();

  const [orderType, setOrderType] = useState<"Retail" | "Project">(initialData?.order_type === "Project" ? "Project" : "Retail");
  const [orderName, setOrderName] = useState(initialData?.order_name || "");
  const [lotName, setLotName] = useState("");
  const [orderOwner, setOrderOwner] = useState(initialData?.dealer_name || "");
  const [quoteNo, setQuoteNo] = useState(initialData?.quote_no || "");
  const [colourShade, setColourShade] = useState(initialData?.colour_shade || "");
  const [salesperson, setSalesperson] = useState(initialData?.salesperson || "");
  const [selectedProducts, setSelectedProducts] = useState<string[]>(
    initialData?.product_type ? initialData.product_type.split(", ").filter(Boolean) : []
  );
  const [qty, setQty] = useState(initialData ? String(initialData.total_windows || "") : "");
  const [sqft, setSqft] = useState(initialData ? String(initialData.sqft || "") : "");
  const [orderValue, setOrderValue] = useState(initialData ? String(initialData.order_value || "") : "");
  const [advanceReceived, setAdvanceReceived] = useState(Number(initialData?.advance_received) > 0);
  const [advanceAmount, setAdvanceAmount] = useState(Number(initialData?.advance_received) > 0 ? String(initialData.advance_received) : "");
  const [commercialStatus, setCommercialStatus] = useState(initialData?.commercial_status || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (orderType === "Retail" && !orderName.trim()) return toast.error("Order Name is required");
    if (orderType === "Project" && !isEditing && (!orderName.trim() || !lotName.trim())) return toast.error("Project Name and Lot Name are required");
    if (selectedProducts.length === 0) return toast.error("Select at least one product");
    if (advanceReceived && Number(advanceAmount) > Number(orderValue)) return toast.error("Advance cannot exceed Order Value");

    const finalOrderName = (!isEditing && orderType === "Project") ? `${orderName.trim()} - ${lotName.trim()}` : orderName.trim();

    const payload = {
      order_type: orderType,
      order_name: finalOrderName,
      dealer_name: orderOwner,
      quote_no: quoteNo.trim() || null,
      colour_shade: colourShade || null,
      salesperson: salesperson || null,
      product_type: selectedProducts.join(", "),
      total_windows: Number(qty) || 0,
      sqft: Number(sqft) || 0,
      order_value: Number(orderValue) || 0,
      advance_received: advanceReceived ? Number(advanceAmount) || 0 : 0,
      commercial_status: commercialStatus || "Pipeline",
    };

    await onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        {/* LEFT COLUMN */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Order Type</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox 
                  checked={orderType === "Retail"} 
                  onCheckedChange={() => { setOrderType("Retail"); if(!isEditing) setOrderName(""); }} 
                />
                <span className="text-sm">Retail</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox 
                  checked={orderType === "Project"} 
                  onCheckedChange={() => { setOrderType("Project"); if(!isEditing) setOrderName(""); }} 
                />
                <span className="text-sm">Project</span>
              </label>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">{orderType === "Project" ? "Project Name *" : "Order Name *"}</Label>
            {orderType === "Retail" || isEditing ? (
              <Input value={orderName} onChange={(e) => setOrderName(e.target.value)} placeholder="Enter order name" required />
            ) : (
              <Select value={orderName} onValueChange={setOrderName}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  {(settings?.project_names || []).map((p) => (
                    <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {orderType === "Project" && !isEditing && (
            <div className="space-y-1.5">
              <Label className="text-sm">Lot Name *</Label>
              <Input value={lotName} onChange={(e) => setLotName(e.target.value)} placeholder="e.g. Tower A - Phase 1" required />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-sm">Order Owner</Label>
            <Select value={orderOwner} onValueChange={setOrderOwner}>
              <SelectTrigger><SelectValue placeholder="Select owner" /></SelectTrigger>
              <SelectContent>
                {ownerOptions.map((o) => (
                  <SelectItem key={o.value + o.label} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Quotation No</Label>
            <Input value={quoteNo} onChange={(e) => setQuoteNo(e.target.value)} placeholder="Quotation number" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Colour Shade</Label>
            <Select value={colourShade} onValueChange={setColourShade}>
              <SelectTrigger><SelectValue placeholder="Select shade" /></SelectTrigger>
              <SelectContent>
                {(settings?.colour_shades || []).map((c) => (
                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Salesperson</Label>
            <Select value={salesperson} onValueChange={setSalesperson}>
              <SelectTrigger><SelectValue placeholder="Select salesperson" /></SelectTrigger>
              <SelectContent>
                {(settings?.salespersons || []).map((s) => (
                  <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Commercial Status</Label>
            <Select value={commercialStatus} onValueChange={setCommercialStatus}>
              <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
              <SelectContent>
                {(settings?.commercial_statuses || []).map((s) => (
                  <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Products *</Label>
            <div className="flex flex-wrap gap-3">
              {(settings?.other_product_types || []).map((p) => (
                <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={selectedProducts.includes(p.name)}
                    onCheckedChange={(checked) => {
                      setSelectedProducts((prev) =>
                        checked ? [...prev, p.name] : prev.filter((n) => n !== p.name)
                      );
                    }}
                  />
                  <span className="text-sm">{p.name}</span>
                </label>
              ))}
              {(!settings || settings.other_product_types.length === 0) && !settingsLoading && (
                <span className="text-sm text-muted-foreground">No products configured</span>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Qty (No of Windows)</Label>
            <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" min="0" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Sqft</Label>
            <Input type="number" step="0.01" value={sqft} onChange={(e) => setSqft(e.target.value)} placeholder="0" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Order Value (₹)</Label>
            <Input type="number" step="0.01" value={orderValue} onChange={(e) => setOrderValue(e.target.value)} placeholder="0" />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={advanceReceived} onCheckedChange={(v) => { setAdvanceReceived(!!v); if (!v) setAdvanceAmount(""); }} />
              <span className="text-sm">Advance Received?</span>
            </label>
            {advanceReceived && (
              <div className="space-y-1.5">
                <Label className="text-sm">Receipt Amount (₹)</Label>
                <Input type="number" step="0.01" value={advanceAmount} onChange={(e) => setAdvanceAmount(e.target.value)} placeholder="0" max={orderValue || undefined} />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1" disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" className="flex-[2]" disabled={submitting}>
          {submitting ? "Processing…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
