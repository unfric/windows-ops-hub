import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface SettingsItem {
  id: string;
  name: string;
  active: boolean;
}

interface CreateOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export default function CreateOrderDialog({ open, onOpenChange, onCreated }: CreateOrderDialogProps) {
  const [orderType, setOrderType] = useState<"Retail" | "Project" >("Retail");
  const [orderName, setOrderName] = useState("");
  const [lotName, setLotName] = useState("");
  const [orderOwner, setOrderOwner] = useState("");
  const [quoteNo, setQuoteNo] = useState("");
  const [colourShade, setColourShade] = useState("");
  const [salesperson, setSalesperson] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [qty, setQty] = useState("");
  const [sqft, setSqft] = useState("");
  const [orderValue, setOrderValue] = useState("");
  const [advanceReceived, setAdvanceReceived] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [commercialStatus, setCommercialStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Settings data
  const [projectNames, setProjectNames] = useState<SettingsItem[]>([]);
  const [dealers, setDealers] = useState<SettingsItem[]>([]);
  const [projectClients, setProjectClients] = useState<SettingsItem[]>([]);
  const [colourShades, setColourShades] = useState<SettingsItem[]>([]);
  const [salespersons, setSalespersons] = useState<SettingsItem[]>([]);
  const [products, setProducts] = useState<SettingsItem[]>([]);
  const [commercialStatuses, setCommercialStatuses] = useState<SettingsItem[]>([]);

  useEffect(() => {
    if (!open) return;
    const fetchAll = async () => {
      try {
        const settings = await api.settings.list();
        if (settings) {
          setProjectNames(settings.project_names || []);
          setDealers(settings.dealers || []);
          setProjectClients(settings.project_client_names || []);
          setColourShades(settings.colour_shades || []);
          setSalespersons(settings.salespersons || []);
          setProducts(settings.other_product_types || []);
          setCommercialStatuses(settings.commercial_statuses || []);
        }
      } catch (err) {
        console.error("Error fetching settings:", err);
      }
    };
    fetchAll();
  }, [open]);

  const ownerOptions = [
    ...dealers.map((d) => ({ label: `${d.name} (Dealer)`, value: d.name })),
    ...projectClients.map((c) => ({ label: `${c.name} (Client)`, value: c.name })),
  ];

  const resetForm = () => {
    setOrderType("Retail");
    setOrderName("");
    setLotName("");
    setOrderOwner("");
    setQuoteNo("");
    setColourShade("");
    setSalesperson("");
    setSelectedProducts([]);
    setQty("");
    setSqft("");
    setOrderValue("");
    setAdvanceReceived(false);
    setAdvanceAmount("");
    setCommercialStatus("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (orderType === "Retail" && !orderName.trim()) return toast.error("Project/Order Name is required");
    if (orderType === "Project" && (!orderName.trim() || !lotName.trim())) return toast.error("Project Name and Lot Name are required");
    if (selectedProducts.length === 0) return toast.error("Select at least one product");
    if (advanceReceived && Number(advanceAmount) > Number(orderValue)) return toast.error("Advance cannot exceed Order Value");

    const finalOrderName = orderType === "Project" ? `${orderName.trim()} - ${lotName.trim()}` : orderName.trim();

    setSubmitting(true);
    try {
      const payload: Record<string, any> = {
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

      const result = await api.orders.create(payload);
      
      if (result && result.id) {
        toast.success("Order created successfully");
        resetForm();
        onOpenChange(false);
        onCreated();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Order</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            {/* LEFT COLUMN */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Order Type</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={orderType === "Retail"} onCheckedChange={() => { setOrderType("Retail"); setOrderName(""); setLotName(""); }} />
                    <span className="text-sm">Retail</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={orderType === "Project"} onCheckedChange={() => { setOrderType("Project"); setOrderName(""); setLotName(""); }} />
                    <span className="text-sm">Project</span>
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">{orderType === "Project" ? "Project Name *" : "Order Name *"}</Label>
                {orderType === "Retail" ? (
                  <Input value={orderName} onChange={(e) => setOrderName(e.target.value)} placeholder="Enter order name" required />
                ) : (
                  <Select value={orderName} onValueChange={setOrderName}>
                    <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                    <SelectContent>
                      {projectNames.map((p) => (
                        <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {orderType === "Project" && (
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
                    {colourShades.map((c) => (
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
                    {salespersons.map((s) => (
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
                    {commercialStatuses.map((s) => (
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
                  {products.map((p) => (
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
                  {products.length === 0 && (
                    <span className="text-sm text-muted-foreground">No products configured in Settings</span>
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

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Creating…" : "Create Order"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
