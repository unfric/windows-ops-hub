
import { useState, useCallback, useEffect } from "react";
import { api } from "@/services/api";
import { Order, AggregatedOrder, getMaterialsStatus, getDispatchLabel, getNextAction } from "@/lib/order-logic";

/**
 * Hook to handle fetching and aggregating order data from multiple related logs.
 */
export function useAggregatedOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [aggregated, setAggregated] = useState<AggregatedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rawLogs, setRawLogs] = useState<any>(null);
  const [stagesMap, setStagesMap] = useState<Record<string, Record<string, number>>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.orders.list();
      setRawLogs(data);
      
      const rawOrders = (data.orders || []) as unknown as Order[];
      setOrders(rawOrders);

      // Map confirming payments
      const paymentMap: Record<string, number> = {};
      (data.payment_logs || []).forEach((p: any) => {
        if (p.status === "Confirmed") paymentMap[p.order_id] = (paymentMap[p.order_id] || 0) + Number(p.amount);
      });

      // Map production stages
      const packedMap: Record<string, number> = {};
      const sMap: Record<string, Record<string, number>> = {};
      (data.production_logs || []).forEach((p: any) => {
        if (p.stage === "Packed") packedMap[p.order_id] = (packedMap[p.order_id] || 0) + Number(p.windows_completed);
        
        if (!sMap[p.order_id]) sMap[p.order_id] = { "Cutting": 0, "Assembly": 0, "Glazing": 0, "Quality": 0, "Packed": 0 };
        if (p.stage in sMap[p.order_id]) {
          sMap[p.order_id][p.stage] += Number(p.windows_completed || 0);
        }
      });
      setStagesMap(sMap);

      // Map dispatches
      const dispatchMap: Record<string, number> = {};
      (data.dispatch_logs || []).forEach((d: any) => {
        dispatchMap[d.order_id] = (dispatchMap[d.order_id] || 0) + Number(d.windows_dispatched);
      });

      // Map installations
      const installMap: Record<string, number> = {};
      (data.installation_logs || []).forEach((i: any) => {
        installMap[i.order_id] = (installMap[i.order_id] || 0) + Number(i.windows_installed);
      });

      // Map rework cases
      const reworkOpenMap: Record<string, number> = {};
      const reworkTotalMap: Record<string, number> = {};
      (data.rework_logs || []).forEach((r: any) => {
        reworkTotalMap[r.order_id] = (reworkTotalMap[r.order_id] || 0) + 1;
        if (r.status === "Pending" || r.status === "In Progress") {
          reworkOpenMap[r.order_id] = (reworkOpenMap[r.order_id] || 0) + 1;
        }
      });

      // Aggregate all into one object
      const agg: AggregatedOrder[] = rawOrders.map((o) => {
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

      setAggregated(agg);
    } catch (err: any) {
      console.error("useAggregatedOrders error:", err);
      setError(err.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    orders,
    aggregated,
    loading,
    error,
    refresh: fetchData,
    rawLogs,
    stagesMap
  };
}
