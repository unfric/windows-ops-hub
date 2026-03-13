import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Check, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { logActivity } from "@/lib/activityLog";
import { format } from "date-fns";

interface Payment {
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

const APPROVAL_OPTIONS = ["Pending", "Approved", "Hold"];

import StatusDropdown from "./StatusDropdown";
import OrderActivityLog from "./OrderActivityLog";

export default function FinanceSection({ orderId, order, onRefresh, updateOrder, readOnly }: {
  orderId: string;
  order: any;
  onRefresh: () => void;
  updateOrder: (field: string, value: any) => void;
  readOnly?: boolean;
}) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editPayment, setEditPayment] = useState<Payment | null>(null);
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchPayments = async () => {
    const { data } = await (supabase.from("payment_logs" as any) as any)
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });
    const paymentList = (data || []) as Payment[];

    // Auto-create Draft payment for Sales advance if none exists
    if (order.advance_received > 0) {
      const hasSalesPayment = paymentList.some(p => p.source_module === "Sales");
      if (!hasSalesPayment) {
        const { data: { user } } = await supabase.auth.getUser();
        await (supabase.from("payment_logs" as any) as any).insert({
          order_id: orderId,
          amount: Number(order.advance_received),
          payment_date: order.created_at ? new Date(order.created_at).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
          payment_mode: null,
          entered_by: user?.id || null,
          source_module: "Sales",
          status: "Draft",
        });
        // Re-fetch after creating
        const { data: refreshed } = await (supabase.from("payment_logs" as any) as any)
          .select("*")
          .eq("order_id", orderId)
          .order("created_at", { ascending: false });
        setPayments((refreshed || []) as Payment[]);
        return;
      }
    }
    setPayments(paymentList);
  };

  useEffect(() => { fetchPayments(); }, [orderId]);

  const confirmedPayments = payments.filter(p => p.status === "Confirmed");
  const totalReceipt = confirmedPayments.reduce((s, p) => s + Number(p.amount), 0);
  const balance = Number(order.order_value) - totalReceipt;

  const resetForm = () => {
    setAmount("");
    setPaymentDate("");
    setPaymentMode("");
  };

  const handleAddPayment = async () => {
    if (!amount || Number(amount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    await (supabase.from("payment_logs" as any) as any).insert({
      order_id: orderId,
      amount: Number(amount),
      payment_date: paymentDate || null,
      payment_mode: paymentMode || null,
      entered_by: user?.id || null,
      source_module: "Finance",
      status: "Confirmed",
      confirmed_by: user?.id || null,
      confirmed_at: new Date().toISOString(),
    });
    await logActivity({
      orderId,
      module: "Finance",
      fieldName: "payment",
      oldValue: null,
      newValue: `₹${Number(amount).toLocaleString()} via ${paymentMode || "N/A"} (Confirmed)`,
    });
    toast.success("Payment recorded");
    resetForm();
    setAddOpen(false);
    setSubmitting(false);
    fetchPayments();
    onRefresh();
  };

  const handleEditPayment = async () => {
    if (!editPayment || !amount || Number(amount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setSubmitting(true);
    await (supabase.from("payment_logs" as any) as any)
      .update({
        amount: Number(amount),
        payment_date: paymentDate || null,
        payment_mode: paymentMode || null,
      })
      .eq("id", editPayment.id);
    await logActivity({
      orderId,
      module: "Finance",
      fieldName: "payment_edit",
      oldValue: `₹${Number(editPayment.amount).toLocaleString()}`,
      newValue: `₹${Number(amount).toLocaleString()} via ${paymentMode || "N/A"}`,
    });
    toast.success("Payment updated");
    resetForm();
    setEditPayment(null);
    setSubmitting(false);
    fetchPayments();
    onRefresh();
  };

  const confirmPayment = async (p: Payment) => {
    const { data: { user } } = await supabase.auth.getUser();
    await (supabase.from("payment_logs" as any) as any)
      .update({
        status: "Confirmed",
        confirmed_by: user?.id || null,
        confirmed_at: new Date().toISOString(),
      })
      .eq("id", p.id);
    await logActivity({
      orderId,
      module: "Finance",
      fieldName: "payment_status",
      oldValue: "Draft",
      newValue: `Confirmed ₹${Number(p.amount).toLocaleString()}`,
    });
    toast.success("Payment confirmed");
    fetchPayments();
    onRefresh();
  };

  const deleteDraftPayment = async (p: Payment) => {
    // If it's a Sales draft representing the advance_received, we must also zero out the advance_received
    // on the order itself, otherwise fetchPayments will instantly recreate it.
    if (p.source_module === "Sales") {
      await supabase.from("orders").update({ advance_received: 0 } as any).eq("id", orderId);
    }

    await (supabase.from("payment_logs" as any) as any).delete().eq("id", p.id);
    await logActivity({
      orderId,
      module: "Finance",
      fieldName: "payment_delete",
      oldValue: `₹${Number(p.amount).toLocaleString()} (Draft)`,
      newValue: null,
    });
    toast.success("Draft payment deleted");
    fetchPayments();
    onRefresh();
  };

  const openEditDialog = (p: Payment) => {
    setEditPayment(p);
    setAmount(String(p.amount));
    setPaymentDate(p.payment_date || "");
    setPaymentMode(p.payment_mode || "");
  };

  const updateApproval = async (field: string, value: string) => {
    const oldVal = order[field];
    if (oldVal === value) return;
    if (readOnly) return;
    await supabase.from("orders").update({ [field]: value }).eq("id", orderId);
    await logActivity({
      orderId,
      module: "Finance",
      fieldName: field,
      oldValue: oldVal,
      newValue: value,
    });
    toast.success("Updated");
    onRefresh();
  };

  const updateRemarks = async (value: string) => {
    const oldVal = order.finance_remarks;
    if (oldVal === value) return;
    if (readOnly) return;
    await supabase.from("orders").update({ finance_remarks: value } as any).eq("id", orderId);
    await logActivity({
      orderId,
      module: "Finance",
      fieldName: "finance_remarks",
      oldValue: oldVal,
      newValue: value,
    });
    toast.success("Remarks updated");
    onRefresh();
  };

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Order Value</p>
            <p className="text-lg font-semibold">₹{Number(order.order_value).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Total Receipt (Confirmed)</p>
            <p className="text-lg font-semibold text-success">₹{totalReceipt.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Balance</p>
            <p className="text-lg font-semibold">{balance < 0 ? "-" : ""}₹{Math.abs(balance).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Payments</p>
            <p className="text-lg font-semibold">{payments.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Approvals and Remarks */}
      <Card>
        <CardHeader><CardTitle className="text-base">Approvals & Remarks</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Approval for Production</Label>
              <Select disabled={readOnly} value={order.approval_for_production || "Pending"} onValueChange={(v) => updateApproval("approval_for_production", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {APPROVAL_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Approval for Dispatch</Label>
              <Select disabled={readOnly} value={order.approval_for_dispatch || "Pending"} onValueChange={(v) => updateApproval("approval_for_dispatch", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {APPROVAL_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 col-span-2 md:col-span-1">
              <Label className="text-xs text-muted-foreground">Remarks</Label>
              <Textarea
                className={cn("min-h-[60px]", readOnly && "bg-muted")}
                defaultValue={order.finance_remarks || ""}
                readOnly={readOnly}
                onBlur={(e) => updateRemarks(e.target.value)}
                placeholder={readOnly ? "" : "Finance notes..."}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Payment History</CardTitle>
          {!readOnly && (
            <Button size="sm" className="gap-1.5" onClick={() => { resetForm(); setAddOpen(true); }}>
              <Plus className="h-4 w-4" /> Add Payment
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Recorded At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.payment_date || "—"}</TableCell>
                    <TableCell className="text-right font-medium">₹{Number(p.amount).toLocaleString()}</TableCell>
                    <TableCell>{p.payment_mode || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{p.source_module || "Finance"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={p.status === "Confirmed"
                          ? "bg-success/15 text-success border-success/20"
                          : "bg-warning/15 text-warning border-warning/20"}
                      >
                        {p.status || "Confirmed"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(p.created_at), "dd MMM yyyy, HH:mm")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!readOnly && (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(p)} title="Edit">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            {p.status === "Draft" && (
                              <>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-success" onClick={() => confirmPayment(p)} title="Confirm">
                                  <Check className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteDraftPayment(p)} title="Delete">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </>
                        )}
                        {readOnly && <span className="text-xs text-muted-foreground italic">View Only</span>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Payment Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Payment</DialogTitle></DialogHeader>
          <PaymentForm
            amount={amount} setAmount={setAmount}
            paymentDate={paymentDate} setPaymentDate={setPaymentDate}
            paymentMode={paymentMode} setPaymentMode={setPaymentMode}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddPayment} disabled={submitting}>
              {submitting ? "Saving..." : "Save Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Payment Dialog */}
      <Dialog open={!!editPayment} onOpenChange={(open) => { if (!open) { setEditPayment(null); resetForm(); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Payment</DialogTitle></DialogHeader>
          <PaymentForm
            amount={amount} setAmount={setAmount}
            paymentDate={paymentDate} setPaymentDate={setPaymentDate}
            paymentMode={paymentMode} setPaymentMode={setPaymentMode}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditPayment(null); resetForm(); }}>Cancel</Button>
            <Button onClick={handleEditPayment} disabled={submitting}>
              {submitting ? "Saving..." : "Update Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <OrderActivityLog orderId={orderId} module="Finance" refreshKey={order.updated_at || order.created_at} />
    </div>
  );
}

function PaymentForm({ amount, setAmount, paymentDate, setPaymentDate, paymentMode, setPaymentMode }: {
  amount: string; setAmount: (v: string) => void;
  paymentDate: string; setPaymentDate: (v: string) => void;
  paymentMode: string; setPaymentMode: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label>Amount</Label>
        <Input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount" />
      </div>
      <div className="space-y-1">
        <Label>Payment Date</Label>
        <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label>Payment Mode</Label>
        <Select value={paymentMode} onValueChange={setPaymentMode}>
          <SelectTrigger><SelectValue placeholder="Select mode..." /></SelectTrigger>
          <SelectContent>
            {["Cash", "Bank Transfer", "Cheque", "UPI", "Other"].map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
