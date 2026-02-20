import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, X, AlertCircle, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { PendingApproval } from '@/hooks/useTeamAttendance';
import RejectionReasonDialog from '@/components/RejectionReasonDialog';

interface PendingApprovalsSectionProps {
  approvals: PendingApproval[];
  onLeaveAction: (id: string, status: 'approved' | 'rejected', approvalRequestId?: string) => Promise<void>;
  onRegularizationAction: (id: string, status: 'approved' | 'rejected', reason?: string, approvalRequestId?: string) => Promise<void>;
}

export const PendingApprovalsSection = ({
  approvals,
  onLeaveAction,
  onRegularizationAction,
}: PendingApprovalsSectionProps) => {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectionTarget, setRejectionTarget] = useState<{ id: string; type: 'leave' | 'regularization'; approvalRequestId?: string } | null>(null);

  if (approvals.length === 0) return null;

  const handleApprove = async (approval: PendingApproval) => {
    setProcessingId(approval.id);
    try {
      if (approval.type === 'leave') {
        await onLeaveAction(approval.id, 'approved', approval.approvalRequestId);
      } else {
        await onRegularizationAction(approval.id, 'approved', undefined, approval.approvalRequestId);
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = (approval: PendingApproval) => {
    if (approval.type === 'regularization') {
      setRejectionTarget({ id: approval.id, type: 'regularization', approvalRequestId: approval.approvalRequestId });
    } else {
      setProcessingId(approval.id);
      onLeaveAction(approval.id, 'rejected', approval.approvalRequestId).finally(() => setProcessingId(null));
    }
  };

  const handleConfirmRejection = async (reason: string) => {
    if (!rejectionTarget) return;
    setProcessingId(rejectionTarget.id);
    try {
      await onRegularizationAction(rejectionTarget.id, 'rejected', reason, rejectionTarget.approvalRequestId);
    } finally {
      setProcessingId(null);
      setRejectionTarget(null);
    }
  };

  const getInitials = (name: string) => name?.substring(0, 2).toUpperCase() || '??';

  const getApproveLabel = (approval: PendingApproval) => {
    if (!approval.approvalRequestId) return 'Approve';
    if (approval.isFinalLevel) return 'Final Approve';
    return 'Approve & Forward';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <h3 className="text-sm font-semibold text-foreground">
          Pending Approvals ({approvals.length})
        </h3>
      </div>

      {approvals.map((approval) => (
        <Card key={`${approval.type}-${approval.id}`} className="border shadow-sm rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-start gap-3">
              <Avatar className="h-9 w-9 mt-0.5">
                <AvatarImage src={approval.profilePictureUrl || undefined} />
                <AvatarFallback className="text-xs">{getInitials(approval.fullName)}</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium truncate">{approval.fullName}</span>
                  <Badge
                    variant="outline"
                    className={
                      approval.type === 'leave'
                        ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-700 text-[10px] px-1.5 py-0'
                        : 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-700 text-[10px] px-1.5 py-0'
                    }
                  >
                    {approval.type === 'leave' ? approval.leaveTypeName || 'Leave' : 'Regularization'}
                  </Badge>
                  {/* Level badge */}
                  {approval.approvalRequestId && approval.totalLevels && (
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] px-1.5 py-0',
                        approval.isFinalLevel
                          ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-700'
                          : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-700'
                      )}
                    >
                      L{approval.myLevel}/{approval.totalLevels}
                    </Badge>
                  )}
                </div>

                {approval.designation && (
                  <p className="text-xs text-muted-foreground">{approval.designation}</p>
                )}

                <p className="text-xs text-muted-foreground mt-1">
                  {approval.type === 'leave'
                    ? `${format(new Date(approval.date), 'MMM dd')}${approval.endDate && approval.endDate !== approval.date ? ` - ${format(new Date(approval.endDate), 'MMM dd')}` : ''}`
                    : `${format(new Date(approval.date), 'MMM dd, yyyy')}`}
                </p>

                {approval.reason && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{approval.reason}</p>
                )}

                {/* Forward indicator */}
                {approval.approvalRequestId && !approval.isFinalLevel && (
                  <div className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 mt-1">
                    <ChevronRight className="h-3 w-3" />
                    <span>Forwards to Level {(approval.myLevel || 0) + 1} after approval</span>
                  </div>
                )}

                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    className={cn(
                      'h-9 flex-1 text-white',
                      approval.isFinalLevel || !approval.approvalRequestId
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                    )}
                    onClick={() => handleApprove(approval)}
                    disabled={processingId === approval.id}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    {getApproveLabel(approval)}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-9 flex-1"
                    onClick={() => handleReject(approval)}
                    disabled={processingId === approval.id}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <RejectionReasonDialog
        isOpen={!!rejectionTarget}
        onClose={() => setRejectionTarget(null)}
        onConfirm={handleConfirmRejection}
        title="Reject Request"
        description="Please provide a reason for rejecting this request."
      />
    </div>
  );
};
