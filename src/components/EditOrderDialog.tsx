import { useEffect, useState } from "react";
import { api } from "@/services/api";
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

interface SettingsItem { id: string; name: string; active: boolean; }

interface EditOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
  order: any;
}

export default function EditOrderDialog({ open, onOpenChange, onUpdated, order }: EditOrderDialogProps) {
  const [orderType, setOrderType] = useState<"Retail" | "Project">("Retail");
  const [orderName, setOrderName] = useState("");
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
  const [orderDate, setOrderDate] = useState("");
  const [tatDate, setTatDate] = useState("");
  const [targetDeliveryDate, setTargetDeliveryDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tatConfig, setTatConfig] = useState<any[]>([]);
  const [deleting, setDeleting] = useState(false);

  const [projectNames, setProjectNames] = useState<SettingsItem[]>([]);
  const [dealers, setDealers] = useState<SettingsItem[]>([]);
  const [projectClients, setProjectClients] = useState<SettingsItem[]>([]);
  const [colourShades, setColourShades] = useState<SettingsItem[]>([]);
  const [salespersons, setSalespersons] = useState<SettingsItem[]>([]);
  const [products, setProducts] = useState<SettingsItem[]>([]);
  const [commercialStatuses, setCommercialStatuses] = useState<SettingsItem[]>([]);

  useEffect(() => {
    if (!open || !order) return;
    setOrderType(order.order_type === "Project" ? "Project" : "Retail");
    setOrderName(order.order_name || "");
    setOrderOwner(order.dealer_name || "");
    setQuoteNo(order.quote_no || "");
    setColourShade(order.colour_shade || "");
    setSalesperson(order.salesperson || "");
    setSelectedProducts(order.product_type ? order.product_type.split(", ").filter(Boolean) : []);
    setQty(String(order.total_windows || ""));
    setSqft(String(order.sqft || ""));
    setOrderValue(String(order.order_value || ""));
    const adv = Number(order.advance_received) || 0;
    setAdvanceReceived(adv > 0);
    setAdvanceAmount(adv > 0 ? String(adv) : "");
    setCommercialStatus(order.commercial_status || "");
    setOrderDate(order.order_date ? new Date(order.order_date).toISOString().split('T')[0] : "");
    setTatDate(order.tat_date ? new Date(order.tat_date).toISOString().split('T')[0] : "");
    setTargetDeliveryDate(order.target_delivery_date ? new Date(order.target_delivery_date).toISOString().split('T')[0] : "");

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
          setTatConfig(settings.tat_config || []);
        }
      } catch (err) {
        console.error("Error fetching settings:", err);
      }
    };
    fetchAll();
  }, [open, order]);

  useEffect(() => {
    // No TAT auto-calculation in edit modal — managed from Order Details tab
  }, []);

  const ownerOptions = [
    ...dealers.map((d) => ({ label: `${d.name} (Dealer)`, value: d.name })),
    ...projectClients.map((c) => ({ label: `${c.name} (Client)`, value: c.name })),
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderName.trim()) return toast.error("Order Name is required");
    if (selectedProducts.length === 0) return toast.error("Select at least one product");
    if (advanceReceived && Number(advanceAmount) > Number(orderValue)) return toast.error("Advance cannot exceed Order Value");

    setSubmitting(true);
    try {
      const payload: Record<string, any> = {
        order_type: orderType,
        order_name: orderName.trim(),
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
        order_date: orderDate || null,
        tat_date: tatDate || null,
        target_delivery_date: targetDeliveryDate || null,
      };

      await api.orders.update(order.id, payload);
      toast.success("Order updated");
      onOpenChange(false);
      onUpdated();
    } catch (err: any) {
      toast.error(err.message || "Failed to update order");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you exactly sure you want to delete this order? This action cannot be undone.")) return;

    setDeleting(true);
    try {
      await api.orders.delete(order.id);
      toast.success("Order deleted successfully");
      onOpenChange(false);
      onUpdated();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete order");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Order</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Order Type</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={orderType === "Retail"} onCheckedChange={() => { setOrderType("Retail"); setOrderName(""); }} />
                    <span className="text-sm">Retail</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={orderType === "Project"} onCheckedChange={() => { setOrderType("Project"); setOrderName(""); }} />
                    <span className="text-sm">Project</span>
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Order Date</Label>
                <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Order Name *</Label>
                {orderType === "Retail" ? (
                  <Input value={orderName} onChange={(e) => setOrderName(e.target.value)} placeholder="Enter order name" required />
                ) : (
                  <Select value={orderName} onValueChange={setOrderName}>
                    <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                    <SelectContent>
                      {projectNames.map((p) => (<SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Order Owner</Label>
                <Select value={orderOwner} onValueChange={setOrderOwner}>
                  <SelectTrigger><SelectValue placeholder="Select owner" /></SelectTrigger>
                  <SelectContent>
                    {ownerOptions.map((o) => (<SelectItem key={o.value + o.label} value={o.value}>{o.label}</SelectItem>))}
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
                    {colourShades.map((c) => (<SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Salesperson</Label>
                <Select value={salesperson} onValueChange={setSalesperson}>
                  <SelectTrigger><SelectValue placeholder="Select salesperson" /></SelectTrigger>
                  <SelectContent>
                    {salespersons.map((s) => (<SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Commercial Status</Label>
                <Select value={commercialStatus} onValueChange={setCommercialStatus}>
                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    {commercialStatuses.map((s) => (<SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Products *</Label>
                <div className="flex flex-wrap gap-3">
                  {products.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={selectedProducts.includes(p.name)}
                        onCheckedChange={(checked) => {
                          setSelectedProducts((prev) => checked ? [...prev, p.name] : prev.filter((n) => n !== p.name));
                        }}
                      />
                      <span className="text-sm">{p.name}</span>
                    </label>
                  ))}
                  {products.length === 0 && <span className="text-sm text-muted-foreground">No products configured</span>}
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

          <div className="flex gap-4 pt-2 border-t mt-4">
            <Button
              type="button"
              variant="destructive"
              className="mr-auto w-1/3"
              onClick={handleDelete}
              disabled={submitting || deleting}
            >
              {deleting ? "Deleting…" : "Delete Order"}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting || deleting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || deleting} className="flex-1">
              {submitting ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
