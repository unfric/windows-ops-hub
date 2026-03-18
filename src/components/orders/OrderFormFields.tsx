import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface SettingsItem {
  id: string;
  name: string;
  active: boolean;
}

interface OrderFormFieldsProps {
  orderType: "Retail" | "Project";
  setOrderType: (type: "Retail" | "Project") => void;
  orderName: string;
  setOrderName: (name: string) => void;
  lotName?: string;
  setLotName?: (name: string) => void;
  orderOwner: string;
  setOrderOwner: (owner: string) => void;
  quoteNo: string;
  setQuoteNo: (no: string) => void;
  colourShade: string;
  setColourShade: (shade: string) => void;
  salesperson: string;
  setSalesperson: (person: string) => void;
  commercialStatus: string;
  setCommercialStatus: (status: string) => void;
  orderDate: string;
  setOrderDate: (date: string) => void;
  selectedProducts: string[];
  setSelectedProducts: (products: string[] | ((prev: string[]) => string[])) => void;
  qty: string;
  setQty: (qty: string) => void;
  sqft: string;
  setSqft: (sqft: string) => void;
  orderValue: string;
  setOrderValue: (value: string) => void;
  advanceReceived: boolean;
  setAdvanceReceived: (received: boolean) => void;
  advanceAmount: string;
  setAdvanceAmount: (amount: string) => void;
  
  // Data for selects
  projectNames: SettingsItem[];
  ownerOptions: { label: string; value: string }[];
  colourShades: SettingsItem[];
  salespersons: SettingsItem[];
  commercialStatuses: SettingsItem[];
  products: SettingsItem[];
}

export function OrderFormFields({
  orderType, setOrderType,
  orderName, setOrderName,
  lotName, setLotName,
  orderOwner, setOrderOwner,
  quoteNo, setQuoteNo,
  colourShade, setColourShade,
  salesperson, setSalesperson,
  commercialStatus, setCommercialStatus,
  orderDate, setOrderDate,
  selectedProducts, setSelectedProducts,
  qty, setQty,
  sqft, setSqft,
  orderValue, setOrderValue,
  advanceReceived, setAdvanceReceived,
  advanceAmount, setAdvanceAmount,
  projectNames,
  ownerOptions,
  colourShades,
  salespersons,
  commercialStatuses,
  products
}: OrderFormFieldsProps) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
      {/* LEFT COLUMN */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Order Type</Label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox 
                checked={orderType === "Retail"} 
                onCheckedChange={() => { 
                  setOrderType("Retail"); 
                  setOrderName(""); 
                  if (setLotName) setLotName(""); 
                }} 
              />
              <span className="text-sm">Retail</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox 
                checked={orderType === "Project"} 
                onCheckedChange={() => { 
                  setOrderType("Project"); 
                  setOrderName(""); 
                  if (setLotName) setLotName(""); 
                }} 
              />
              <span className="text-sm">Project</span>
            </label>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Order Date</Label>
          <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} required />
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

        {orderType === "Project" && setLotName && (
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
  );
}
