import { useEffect, useState } from "react";
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
import { logActivity } from "@/lib/activityLog";

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
  const [submitting, setSubmitting] = useState(false);
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

    const fetchAll = async () => {
      const [pn, dl, pc, cs, sp, opt, cst] = await Promise.all([
        supabase.from("project_names" as any).select("*").eq("active", true).order("name") as any,
        supabase.from("dealers").select("*").eq("active", true).order("name"),
        supabase.from("project_client_names" as any).select("*").eq("active", true).order("name") as any,
        supabase.from("colour_shades").select("*").eq("active", true).order("name"),
        supabase.from("salespersons").select("*").eq("active", true).order("name"),
        supabase.from("other_product_types" as any).select("*").eq("active", true).order("name") as any,
        supabase.from("commercial_statuses" as any).select("*").eq("active", true).order("name") as any,
      ]);
      setProjectNames((pn.data as SettingsItem[]) || []);
      setDealers((dl.data as SettingsItem[]) || []);
      setProjectClients((pc.data as SettingsItem[]) || []);
      setColourShades((cs.data as SettingsItem[]) || []);
      setSalespersons((sp.data as SettingsItem[]) || []);
      setProducts((opt.data as SettingsItem[]) || []);
      setCommercialStatuses((cst.data as SettingsItem[]) || []);
    };
    fetchAll();
  }, [open, order]);

  const ownerOptions = [
    ...dealers.map((d) => ({ label: `${d.name} (Dealer)`, value: d.name })),
    ...projectClients.map((c) => ({ label: `${c.name} (Client)`, value: c.name })),
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderName.trim()) return toast.error("Order Name is required");
    if (selectedProducts.length === 0) return toast.error("Select at least one product");
    if (advanceReceived && Number(advanceAmount) > Number(orderValue)) return toast.error("Advance cannot exceed Order Value");

    if (quoteNo.trim()) {
      const { data: existing } = await supabase
        .from("orders").select("id").eq("quote_no", quoteNo.trim()).neq("id", order.id).maybeSingle();
      if (existing) return toast.error("Quotation Number already exists");
    }

    setSubmitting(true);
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
    };

    // Log changes
    const changedFields = Object.entries(payload).filter(([key, val]) => {
      const oldVal = order[key];
      return String(val ?? "") !== String(oldVal ?? "");
    });

    const { error } = await supabase.from("orders").update(payload).eq("id", order.id);
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
    } else {
      // Log activity for changed fields
      for (const [key, val] of changedFields) {
        await logActivity({
          orderId: order.id,
          module: "sales",
          fieldName: key,
          oldValue: order[key] != null ? String(order[key]) : null,
          newValue: val != null ? String(val) : null,
        });
      }
      toast.success("Order updated");
      onOpenChange(false);
      onUpdated();
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you exactly sure you want to delete this order? This action cannot be undone.")) return;

    // Deletion constraint logic: Only delete if no downstream modules have progressed
    if ((order.survey_done_windows || 0) > 0) return toast.error("Cannot delete: Order has progressed to Survey module. Survey must be reverted back to 0 first.");
    if ((order.design_released_windows || 0) > 0) return toast.error("Cannot delete: Order has progressed to Design module. Design must be reverted back to 0 first.");

    // Check for Production logs specifically (if foreign-key constraint doesn't cascade, we should warn manually)
    const { count: prodCount } = await supabase.from("production_logs").select("*", { count: 'exact', head: true }).eq("order_id", order.id);
    if ((prodCount || 0) > 0) return toast.error("Cannot delete: Order has production logs. Production logs must be deleted first.");

    const { count: paymentCount } = await supabase.from("payment_logs").select("*", { count: 'exact', head: true }).eq("order_id", order.id);
    if ((paymentCount || 0) > 0) return toast.error("Cannot delete: Order has payment logs. Finance must delete logs first.");

    setDeleting(true);

    try {
      // Explicitly delete ALL child records — manual cascade
      const tables = [
        "order_activity_log",
        "dispatch",
        "dispatch_logs",
        "installation",
        "installation_logs",
        "material_status",
        "production_status",
        "payment_logs",
        "production_logs",
        "rework_logs",
      ] as const;

      for (const table of tables) {
        const { error: childErr } = await (supabase.from(table as any) as any).delete().eq("order_id", order.id);
        if (childErr && childErr.code !== "PGRST204") {
          console.warn(`Failed to delete from ${table}:`, childErr.message);
        }
      }

      // Also cleanup polymorphic audit logs
      const { error: auditErr } = await supabase.from("audit_log").delete().eq("entity_id", order.id).eq("entity_type", "orders");
      if (auditErr) console.warn("Failed to cleanup audit_log:", auditErr.message);

      // Now attempt main order deletion
      const { error: deleteErr, count } = await (supabase.from("orders") as any).delete({ count: "exact" }).eq("id", order.id);

      console.log("Order delete result — error:", deleteErr, "count:", count);

      if (deleteErr) {
        toast.error(`Delete failed: ${deleteErr.message}`);
        setDeleting(false);
        return;
      }

      if (!count || count === 0) {
        // Fallback: If exact count check failed but error is null, it might be an RLS issue or just count reporting quirk.
        // We will try one more time without count check or just warn more clearly.
        toast.error("Database rejected the deletion (0 rows affected). Please contact admin to check your Delete permissions (RLS) for the 'orders' table.");
        setDeleting(false);
        return;
      }

      toast.success("Order deleted successfully");
      onOpenChange(false);
      onUpdated();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "An unexpected error occurred during deletion.");
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
