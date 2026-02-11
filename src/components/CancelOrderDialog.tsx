import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, XCircle, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cancelOrder } from "@/utils/orderCancellation";
import { useAuth } from "@/hooks/useAuth";

export interface CancelableOrder {
  id: string;
  invoice_number?: string;
  total_amount: number;
  is_credit_order: boolean;
  credit_pending_amount?: number;
}

interface CancelOrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orders: CancelableOrder[];
  retailerName: string;
  onCancelled: (cancelledOrderIds: string[]) => void;
}

const CANCELLATION_REASONS = [
  { value: 'wrong-details', label: 'Wrong order details' },
  { value: 'customer-request', label: 'Customer requested cancellation' },
  { value: 'duplicate-order', label: 'Duplicate order' },
  { value: 'pricing-error', label: 'Pricing error' },
  { value: 'other', label: 'Other' }
];

export const CancelOrderDialog = ({
  isOpen,
  onClose,
  orders,
  retailerName,
  onCancelled
}: CancelOrderDialogProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState<'select' | 'reason' | 'confirm'>('select');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedReason, setSelectedReason] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setStep('select');
    setSelectedIds(new Set());
    setSelectedReason('');
    setAdditionalNotes('');
    setIsSubmitting(false);
    onClose();
  };

  const toggleOrder = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === orders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(orders.map(o => o.id)));
    }
  };

  const selectedOrders = orders.filter(o => selectedIds.has(o.id));
  const selectedTotal = selectedOrders.reduce((s, o) => s + o.total_amount, 0);
  const allSelected = selectedIds.size === orders.length;

  const handleProceedToReason = () => {
    if (selectedIds.size === 0) return;
    // If only 1 order total, skip selection step — but we still use this step
    setStep('reason');
  };

  const handleProceedToConfirm = () => {
    if (!selectedReason) {
      toast({ title: "Reason required", description: "Please select a reason for cancellation", variant: "destructive" });
      return;
    }
    setStep('confirm');
  };

  const handleConfirmCancellation = async () => {
    if (!user?.id) return;
    setIsSubmitting(true);

    const reasonLabel = CANCELLATION_REASONS.find(r => r.value === selectedReason)?.label || selectedReason;
    const fullReason = additionalNotes ? `${reasonLabel}: ${additionalNotes}` : reasonLabel;

    const cancelledIds: string[] = [];
    const failures: string[] = [];

    for (const order of selectedOrders) {
      try {
        const result = await cancelOrder(order.id, fullReason, user.id);
        if (result.success) {
          cancelledIds.push(order.id);
        } else {
          failures.push(order.invoice_number || order.id);
        }
      } catch {
        failures.push(order.invoice_number || order.id);
      }
    }

    if (cancelledIds.length > 0) {
      toast({
        title: `${cancelledIds.length} order${cancelledIds.length > 1 ? 's' : ''} cancelled`,
        description: failures.length > 0
          ? `Failed to cancel: ${failures.join(', ')}`
          : `Successfully cancelled ${cancelledIds.length} invoice${cancelledIds.length > 1 ? 's' : ''}.`,
      });
      onCancelled(cancelledIds);
      handleClose();
    } else {
      toast({ title: "Cancellation failed", description: "Unable to cancel selected orders.", variant: "destructive" });
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95%] max-w-md mx-auto rounded-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            Cancel Order{orders.length > 1 ? 's' : ''}
          </DialogTitle>
          <DialogDescription>{retailerName}</DialogDescription>
        </DialogHeader>

        {/* Step 1: Invoice Selection */}
        {step === 'select' && (
          <div className="space-y-3 py-2">
            {orders.length > 1 && (
              <div className="flex items-center gap-2 pb-2 border-b">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  id="select-all"
                />
                <Label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                  Select All ({orders.length})
                </Label>
              </div>
            )}

            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {orders.map(order => (
                <div
                  key={order.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedIds.has(order.id)
                      ? 'border-destructive/50 bg-destructive/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                  onClick={() => toggleOrder(order.id)}
                >
                  <Checkbox
                    checked={selectedIds.has(order.id)}
                    onCheckedChange={() => toggleOrder(order.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {order.invoice_number || 'No Invoice'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm font-semibold">
                        ₹{Math.round(order.total_amount).toLocaleString()}
                      </span>
                      {order.is_credit_order && (
                        <span className="text-xs bg-warning/20 text-warning px-1.5 py-0.5 rounded">
                          Credit
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedIds.size > 0 && (
              <div className="bg-muted/50 p-2.5 rounded-lg flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {selectedIds.size} of {orders.length} selected
                </span>
                <span className="font-semibold">₹{Math.round(selectedTotal).toLocaleString()}</span>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Reason */}
        {step === 'reason' && (
          <div className="space-y-4 py-2">
            <div className="bg-muted/50 p-3 rounded-lg text-sm">
              <span className="text-muted-foreground">Cancelling:</span>{' '}
              <span className="font-medium">{selectedIds.size} invoice{selectedIds.size > 1 ? 's' : ''}</span>
              <span className="text-muted-foreground"> — </span>
              <span className="font-semibold">₹{Math.round(selectedTotal).toLocaleString()}</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for cancellation *</Label>
              <Select value={selectedReason} onValueChange={setSelectedReason}>
                <SelectTrigger id="reason">
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent>
                  {CANCELLATION_REASONS.map(reason => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Additional notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Enter any additional details..."
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 'confirm' && (
          <div className="space-y-4 py-2">
            <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="font-medium text-destructive">
                    This will cancel {selectedIds.size} invoice{selectedIds.size > 1 ? 's' : ''}:
                  </p>
                  <ul className="text-sm space-y-1 text-foreground/80">
                    {selectedOrders.map(o => (
                      <li key={o.id}>• {o.invoice_number || 'No Invoice'} — ₹{Math.round(o.total_amount).toLocaleString()}</li>
                    ))}
                  </ul>
                  <div className="pt-2 border-t border-destructive/20 mt-2 space-y-1 text-sm text-foreground/80">
                    <li>• Mark as <strong>Cancelled</strong></li>
                    {allSelected && <li>• Revert visit to <strong>Planned</strong></li>}
                    <li>• Reverse credit amounts</li>
                    <li>• Remove gamification & loyalty points</li>
                    <li>• Cancel associated invoices</li>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-muted/50 p-3 rounded-lg space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reason:</span>
                <span className="font-medium text-right max-w-[60%]">
                  {CANCELLATION_REASONS.find(r => r.value === selectedReason)?.label}
                </span>
              </div>
              {additionalNotes && (
                <div className="pt-1 border-t">
                  <span className="text-muted-foreground">Notes:</span>
                  <p className="mt-1 text-xs">{additionalNotes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === 'select' && (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button variant="destructive" onClick={handleProceedToReason} disabled={selectedIds.size === 0}>
                Continue
              </Button>
            </>
          )}
          {step === 'reason' && (
            <>
              <Button variant="outline" onClick={() => setStep('select')}>Back</Button>
              <Button variant="destructive" onClick={handleProceedToConfirm} disabled={!selectedReason}>
                Continue
              </Button>
            </>
          )}
          {step === 'confirm' && (
            <>
              <Button variant="outline" onClick={() => setStep('reason')} disabled={isSubmitting}>Back</Button>
              <Button variant="destructive" onClick={handleConfirmCancellation} disabled={isSubmitting}>
                {isSubmitting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Cancelling...</>
                ) : (
                  'Confirm Cancellation'
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
