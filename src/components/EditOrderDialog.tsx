import { useState } from "react";
import { api } from "@/services/api";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import OrderForm from "./orders/OrderForm";

interface EditOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
  order: any;
}

export default function EditOrderDialog({ open, onOpenChange, onUpdated, order }: EditOrderDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSubmit = async (payload: any) => {
    setSubmitting(true);
    try {
      await api.orders.update(order.id, payload);
      toast.success("Order updated successfully");
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
          <div className="flex items-center justify-between pr-8">
            <DialogTitle>Edit Order</DialogTitle>
            <Button
              variant="destructive"
              size="sm"
              className="h-8"
              onClick={handleDelete}
              disabled={submitting || deleting}
            >
              {deleting ? "Deleting…" : "Delete Order"}
            </Button>
          </div>
        </DialogHeader>
        <OrderForm 
          initialData={order} 
          onSubmit={handleSubmit} 
          onCancel={() => onOpenChange(false)} 
          submitting={submitting || deleting} 
          submitLabel="Save Changes" 
        />
      </DialogContent>
    </Dialog>
  );
}
