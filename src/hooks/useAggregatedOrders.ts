import { useState, useCallback, useEffect } from "react";
import { api } from "@/services/api";
import { Order, AggregatedOrder, aggregateOrders } from "@/lib/order-logic";

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
      
      const result = aggregateOrders(data);
      setOrders(result.orders);
      setAggregated(result.aggregated);
      setStagesMap(result.stagesMap);
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
