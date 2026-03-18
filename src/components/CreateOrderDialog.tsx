import { useEffect, useState } from "react";
import { api } from "@/services/api";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { OrderFormFields, SettingsItem } from "./orders/OrderFormFields";

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
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);
  
  const [tatDate, setTatDate] = useState("");
  const [targetDeliveryDate, setTargetDeliveryDate] = useState("");

  // Settings data
  const [projectNames, setProjectNames] = useState<SettingsItem[]>([]);
  const [dealers, setDealers] = useState<SettingsItem[]>([]);
  const [projectClients, setProjectClients] = useState<SettingsItem[]>([]);
  const [colourShades, setColourShades] = useState<SettingsItem[]>([]);
  const [salespersons, setSalespersons] = useState<SettingsItem[]>([]);
  const [products, setProducts] = useState<SettingsItem[]>([]);
  const [commercialStatuses, setCommercialStatuses] = useState<SettingsItem[]>([]);

  const [appSettings, setAppSettings] = useState<any[]>([]);

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
          setAppSettings(settings.app_settings || []);
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
    setOrderDate(new Date().toISOString().split('T')[0]);
    setTatDate("");
    setTargetDeliveryDate("");
  };

  useEffect(() => {
    if (!orderDate) return;
    
    // Default TAT calculation: Setting from DB or 30 days
    const defaultDays = Number(appSettings.find(s => s.key === "default_tat_days")?.value) || 30;
    const date = new Date(orderDate);
    date.setDate(date.getDate() + defaultDays);
    const dateStr = date.toISOString().split('T')[0];
    setTatDate(dateStr);
    setTargetDeliveryDate(dateStr);
  }, [orderDate, appSettings]);

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
        order_date: orderDate || new Date().toISOString().split('T')[0],
        tat_date: tatDate || null,
        target_delivery_date: targetDeliveryDate || null,
        // Default material statuses
        hardware_availability: "Pending PO",
        extrusion_availability: "Pending PO",
        glass_availability: "Pending PO",
        coated_extrusion_availability: "Pending Coating",
        // Mirror to procurement fields
        hardware_po_status: "Pending PO",
        extrusion_po_status: "Pending PO",
        glass_po_status: "Pending PO",
        coating_status: "Pending Coating",
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

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Creating…" : "Create Order"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
