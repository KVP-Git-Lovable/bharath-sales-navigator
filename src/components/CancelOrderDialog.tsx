import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cancelOrder } from "@/utils/orderCancellation";
import { useAuth } from "@/hooks/useAuth";

interface CancelOrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string | null;
  invoiceNumber?: string;
  retailerName: string;
  orderAmount: number;
  isCreditOrder?: boolean;
  creditPendingAmount?: number;
  onCancelled: () => void;
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
  orderId,
  invoiceNumber,
  retailerName,
  orderAmount,
  isCreditOrder = false,
  creditPendingAmount = 0,
  onCancelled
}: CancelOrderDialogProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState<'reason' | 'confirm'>('reason');
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setStep('reason');
    setSelectedReason('');
    setAdditionalNotes('');
    setIsSubmitting(false);
    onClose();
  };

  const handleProceedToConfirm = () => {
    if (!selectedReason) {
      toast({
        title: "Reason required",
        description: "Please select a reason for cancellation",
        variant: "destructive"
      });
      return;
    }
    setStep('confirm');
  };

  const handleConfirmCancellation = async () => {
    if (!orderId || !user?.id) {
      toast({
        title: "Error",
        description: "Missing order or user information",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Construct full reason text
      const reasonLabel = CANCELLATION_REASONS.find(r => r.value === selectedReason)?.label || selectedReason;
      const fullReason = additionalNotes 
        ? `${reasonLabel}: ${additionalNotes}`
        : reasonLabel;

      const result = await cancelOrder(orderId, fullReason, user.id);

      if (result.success) {
        toast({
          title: "Order cancelled",
          description: `Order ${invoiceNumber || ''} has been cancelled successfully.`,
        });
        onCancelled();
        handleClose();
      } else {
        toast({
          title: "Cancellation failed",
          description: result.error || "Unable to cancel the order. Please try again.",
          variant: "destructive"
        });
        setIsSubmitting(false);
      }
    } catch (error: any) {
      console.error('[CancelOrderDialog] Error:', error);
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
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
            Cancel Order
          </DialogTitle>
          <DialogDescription>
            {invoiceNumber && <span className="font-medium">{invoiceNumber}</span>}
          </DialogDescription>
        </DialogHeader>

        {step === 'reason' ? (
          <div className="space-y-4 py-2">
            {/* Order Summary */}
            <div className="bg-muted/50 p-3 rounded-lg space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Retailer:</span>
                <span className="font-medium">{retailerName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-semibold">₹{Math.round(orderAmount).toLocaleString()}</span>
              </div>
              {isCreditOrder && creditPendingAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-warning">Credit Pending:</span>
                  <span className="font-medium text-warning">₹{Math.round(creditPendingAmount).toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Reason Selection */}
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

            {/* Additional Notes */}
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
        ) : (
          <div className="space-y-4 py-2">
            {/* Confirmation Warning */}
            <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="font-medium text-destructive">This action will:</p>
                  <ul className="text-sm space-y-1 text-foreground/80">
                    <li>• Mark order as <strong>Cancelled</strong></li>
                    <li>• Revert visit status to <strong>Planned</strong></li>
                    {isCreditOrder && creditPendingAmount > 0 && (
                      <li>• Reverse credit amount: <strong>₹{Math.round(creditPendingAmount).toLocaleString()}</strong></li>
                    )}
                    <li>• Remove gamification points earned</li>
                    <li>• Cancel associated invoice</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Cancellation Details */}
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
          {step === 'reason' ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleProceedToConfirm}
                disabled={!selectedReason}
              >
                Continue
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                onClick={() => setStep('reason')}
                disabled={isSubmitting}
              >
                Back
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleConfirmCancellation}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cancelling...
                  </>
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
