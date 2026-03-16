
import { useState } from "react";
import { api } from "@/services/api";
import { toast } from "sonner";

export interface Payment {
  id: string;
  amount: number;
  payment_date: string | null;
  payment_mode: string | null;
  source_module: string;
  status: string;
  confirmed_by: string | null;
  confirmed_at: string | null;
  created_at: string;
}

export function useFinanceActions(orderId: string, onRefresh: () => void) {
  const [submitting, setSubmitting] = useState(false);

  const addPayment = async (data: { amount: number; payment_date?: string | null; payment_mode?: string | null }) => {
    setSubmitting(true);
    try {
      await api.orders.addLog("payment_logs", {
        order_id: orderId,
        amount: data.amount,
        payment_date: data.payment_date || null,
        payment_mode: data.payment_mode || null,
        source_module: "Finance",
        status: "Confirmed",
        confirmed_at: new Date().toISOString(),
      });
      toast.success("Payment recorded");
      onRefresh();
      return true;
    } catch (error: any) {
      toast.error(error.message);
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const updatePayment = async (id: string, data: { amount: number; payment_date?: string | null; payment_mode?: string | null }) => {
    setSubmitting(true);
    try {
      await api.orders.updateLog("payment_logs", id, {
        amount: data.amount,
        payment_date: data.payment_date || null,
        payment_mode: data.payment_mode || null,
      });
      toast.success("Payment updated");
      onRefresh();
      return true;
    } catch (error: any) {
      toast.error(error.message);
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const confirmPayment = async (id: string) => {
    try {
      await api.orders.updateLog("payment_logs", id, {
        status: "Confirmed",
        confirmed_at: new Date().toISOString(),
      });
      toast.success("Payment confirmed");
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const deleteDraftPayment = async (id: string, sourceModule?: string) => {
    try {
      if (sourceModule === "Sales") {
        await api.orders.updateField(orderId, "advance_received", 0, "Finance");
      }
      await api.orders.deleteLog("payment_logs", id);
      toast.success("Draft payment deleted");
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const updateApproval = async (field: string, value: string) => {
    try {
      await api.orders.updateField(orderId, field, value, "Finance");
      toast.success("Updated");
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const updateRemarks = async (value: string) => {
    try {
      await api.orders.updateField(orderId, "finance_remarks", value, "Finance");
      toast.success("Remarks updated");
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return {
    submitting,
    addPayment,
    updatePayment,
    confirmPayment,
    deleteDraftPayment,
    updateApproval,
    updateRemarks,
  };
}
