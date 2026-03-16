
export interface Order {
  id: string;
  order_type: string;
  quote_no: string | null;
  sales_order_no: string | null;
  order_name: string;
  dealer_name: string;
  salesperson: string | null;
  colour_shade: string | null;
  product_type: string;
  total_windows: number;
  windows_released: number;
  sqft: number;
  order_value: number;
  advance_received: number;
  balance_amount: number;
  commercial_status: string;
  dispatch_status: string;
  installation_status: string;
  survey_done_windows: number;
  design_released_windows: number;
  hardware_availability: string;
  extrusion_availability: string;
  glass_availability: string;
  coated_extrusion_availability: string;
  hardware_po_status: string;
  hardware_delivery_date: string | null;
  extrusion_po_status: string;
  extrusion_delivery_date: string | null;
  glass_po_status: string;
  glass_delivery_date: string | null;
  coating_status: string;
  coating_delivery_date: string | null;
  approval_for_production: string;
  approval_for_dispatch: string;
  created_at: string;
  updated_at?: string;
  finance_remarks?: string;
}

export interface AggregatedOrder extends Order {
  receipt: number;
  balance: number;
  surveyDone: number;
  designReleased: number;
  productionPacked: number;
  atw: number;
  dispatchedWindows: number;
  installedWindows: number;
  reworkOpenCount: number;
  reworkTotalCount: number;
  materialsStatus: "Ready" | "Partial" | "Pending";
  dispatchLabel: string;
  nextAction: string;
}

/**
 * Calculates the materials status based on availability fields.
 */
export function getMaterialsStatus(o: Partial<Order>): "Ready" | "Partial" | "Pending" {
  const items = [
    o.hardware_availability, 
    o.extrusion_availability, 
    o.glass_availability, 
    o.coated_extrusion_availability
  ];
  const ready = items.filter((s) => s === "In Stock / Available" || s === "Not Required" || s === "Delivered");
  
  if (ready.length === items.length) return "Ready";
  
  const isPartial = items.some((s) => 
    s === "Partially Available" || 
    s === "PO Placed" || 
    s === "Sent to Coating" ||
    s === "Delivered" ||
    (ready.length > 0)
  );
  
  if (isPartial) return "Partial";
  return "Pending";
}

/**
 * Returns a human-readable dispatch label based on windows dispatched vs ATW.
 */
export function getDispatchLabel(dispatched: number, atw: number): string {
  if (dispatched <= 0) return "Not Dispatched";
  if (dispatched < atw) return "Partially Dispatched";
  return "Fully Dispatched";
}

/**
 * Determines the logical next action for an order based on its current state.
 */
export function getNextAction(agg: AggregatedOrder): string {
  if (agg.surveyDone < agg.total_windows) return "Survey";
  if (agg.designReleased < agg.surveyDone) return "Design";
  if (agg.materialsStatus !== "Ready") return "Procurement";
  if (agg.productionPacked < agg.atw) return "Production";
  if (agg.dispatchLabel !== "Fully Dispatched") return "Dispatch";
  if (agg.installedWindows < agg.dispatchedWindows) return "Installation";
  if (agg.reworkOpenCount > 0) return "Rework";
  return "—";
}

/**
 * Helper to determine the dot color for individual material categories.
 */
export function getMaterialDotColor(avail: string, po: string): "blue" | "green" | "yellow" | "orange" | "red" | "grey" {
  if (avail === "Delivered" || po === "Delivered") return "blue";
  if (avail === "In Stock / Available" || avail === "Not Required" || po === "Not Required") return "green";
  if (avail === "Partially Available" || po === "Partially Available") return "yellow";
  if (avail === "PO Placed" || avail === "Sent to Coating" || po === "PO Placed" || po === "Sent to Coating") return "orange";
  if (avail === "Pending PO" || avail === "Pending Coating" || po === "Pending PO" || po === "Pending Coating") return "red";
  return "grey";
}
