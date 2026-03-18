import { useEffect, useState } from "react";
import { api } from "@/services/api";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { OrderFormFields, SettingsItem } from "./orders/OrderFormFields";

interface EditOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
  order: any;
}

export default function EditOrderDialog({ open, onOpenChange, onUpdated, order }: EditOrderDialogProps) {
  const [orderType, setOrderType] = useState<"Retail" | "Project">("Retail");
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
  const [orderDate, setOrderDate] = useState("");
  const [tatDate, setTatDate] = useState("");
  const [targetDeliveryDate, setTargetDeliveryDate] = useState("");
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
    
    const type = order.order_type === "Project" ? "Project" : "Retail";
    setOrderType(type);
    
    if (type === "Project" && order.order_name?.includes(" - ")) {
      const parts = order.order_name.split(" - ");
      setLotName(parts.pop() || "");
      setOrderName(parts.join(" - "));
    } else {
      setOrderName(order.order_name || "");
      setLotName("");
    }

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
        }
      } catch (err) {
        console.error("Error fetching settings:", err);
      }
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
    if (orderType === "Project" && !lotName.trim()) return toast.error("Lot Name is required");
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
          <OrderFormFields
            orderType={orderType} setOrderType={setOrderType}
            orderName={orderName} setOrderName={setOrderName}
            lotName={lotName} setLotName={setLotName}
            orderOwner={orderOwner} setOrderOwner={setOrderOwner}
            quoteNo={quoteNo} setQuoteNo={setQuoteNo}
            colourShade={colourShade} setColourShade={setColourShade}
            salesperson={salesperson} setSalesperson={setSalesperson}
            commercialStatus={commercialStatus} setCommercialStatus={setCommercialStatus}
            orderDate={orderDate} setOrderDate={setOrderDate}
            selectedProducts={selectedProducts} setSelectedProducts={setSelectedProducts}
            qty={qty} setQty={setQty}
            sqft={sqft} setSqft={setSqft}
            orderValue={orderValue} setOrderValue={setOrderValue}
            advanceReceived={advanceReceived} setAdvanceReceived={setAdvanceReceived}
            advanceAmount={advanceAmount} setAdvanceAmount={setAdvanceAmount}
            projectNames={projectNames}
            ownerOptions={ownerOptions}
            colourShades={colourShades}
            salespersons={salespersons}
            commercialStatuses={commercialStatuses}
            products={products}
          />

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
