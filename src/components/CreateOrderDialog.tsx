import { useState } from "react";
import { api } from "@/services/api";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import OrderForm from "./orders/OrderForm";

interface CreateOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export default function CreateOrderDialog({ open, onOpenChange, onCreated }: CreateOrderDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (payload: any) => {
    setSubmitting(true);
    try {
      const result = await api.orders.create(payload);
      if (result && result.id) {
        toast.success("Order created successfully");
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
          <DialogTitle>Create New Order</DialogTitle>
        </DialogHeader>
        <OrderForm 
          onSubmit={handleSubmit} 
          onCancel={() => onOpenChange(false)} 
          submitting={submitting} 
          submitLabel="Create Order" 
        />
      </DialogContent>
    </Dialog>
  );
}
