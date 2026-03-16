
export interface OrdersApiResponse {
  orders: Order[];
  payment_logs?: any[];
  production_logs?: any[];
  dispatch_logs?: any[];
  installation_logs?: any[];
  rework_logs?: any[];
}

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
  finance_remarks: string | null;
  survey_remarks: string | null;
  design_remarks: string | null;
  procurement_remarks: string | null;
  store_remarks: string | null;
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
/**
 * Aggregates raw order data into UI-ready objects with calculated metrics.
 */
export function aggregateOrders(data: OrdersApiResponse) {
  const rawOrders = (data.orders || []) as unknown as Order[];

  // Map stores
  const paymentMap: Record<string, number> = {};
  (data.payment_logs || []).forEach((p: any) => {
    if (p.status === "Confirmed") paymentMap[p.order_id] = (paymentMap[p.order_id] || 0) + Number(p.amount);
  });

  const packedMap: Record<string, number> = {};
  const stagesMap: Record<string, Record<string, number>> = {};
  (data.production_logs || []).forEach((p: any) => {
    if (p.stage === "Packed") packedMap[p.order_id] = (packedMap[p.order_id] || 0) + Number(p.windows_completed);
    if (!stagesMap[p.order_id]) stagesMap[p.order_id] = { "Cutting": 0, "Assembly": 0, "Glazing": 0, "Quality": 0, "Packed": 0 };
    if (p.stage in stagesMap[p.order_id]) stagesMap[p.order_id][p.stage] += Number(p.windows_completed || 0);
  });

  const dispatchMap: Record<string, number> = {};
  (data.dispatch_logs || []).forEach((d: any) => {
    dispatchMap[d.order_id] = (dispatchMap[d.order_id] || 0) + Number(d.windows_dispatched);
  });

  const installMap: Record<string, number> = {};
  (data.installation_logs || []).forEach((i: any) => {
    installMap[i.order_id] = (installMap[i.order_id] || 0) + Number(i.windows_installed);
  });

  const reworkOpenMap: Record<string, number> = {};
  const reworkTotalMap: Record<string, number> = {};
  (data.rework_logs || []).forEach((r: any) => {
    reworkTotalMap[r.order_id] = (reworkTotalMap[r.order_id] || 0) + 1;
    if (r.status === "Pending" || r.status === "In Progress") {
      reworkOpenMap[r.order_id] = (reworkOpenMap[r.order_id] || 0) + 1;
    }
  });

  const aggregated: AggregatedOrder[] = rawOrders.map((o) => {
    const receipt = paymentMap[o.id] || 0;
    const packed = packedMap[o.id] || 0;
    const dispatched = dispatchMap[o.id] || 0;
    const installed = installMap[o.id] || 0;
    const openRework = reworkOpenMap[o.id] || 0;
    const totalRework = reworkTotalMap[o.id] || 0;
    const atw = o.design_released_windows || 0;

    const partial: AggregatedOrder = {
      ...o,
      receipt,
      balance: Number(o.order_value) - receipt,
      surveyDone: o.survey_done_windows || 0,
      designReleased: o.design_released_windows || 0,
      productionPacked: packed,
      atw,
      dispatchedWindows: dispatched,
      installedWindows: installed,
      reworkOpenCount: openRework,
      reworkTotalCount: totalRework,
      materialsStatus: getMaterialsStatus(o),
      dispatchLabel: getDispatchLabel(dispatched, atw),
      nextAction: "",
    };
    partial.nextAction = getNextAction(partial);
    return partial;
  });

  return { aggregated, stagesMap, orders: rawOrders };
}
