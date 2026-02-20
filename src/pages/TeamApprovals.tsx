import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, CalendarDays, ClipboardCheck, Check, X, ChevronRight } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { useTeamAttendance, PendingApproval } from '@/hooks/useTeamAttendance';
import { useSubordinates } from '@/hooks/useSubordinates';
import RejectionReasonDialog from '@/components/RejectionReasonDialog';
import { PaginationControls } from '@/components/ui/PaginationControls';

type ApprovalTab = 'leave' | 'regularization';
const PAGE_SIZE = 10;

export const TeamApprovals = () => {
  const navigate = useNavigate();
  const { subordinateIds, directReportIds } = useSubordinates();
  const {
    pendingApprovals,
    handleLeaveAction,
    handleRegularizationAction,
  } = useTeamAttendance(subordinateIds, directReportIds);

  const [activeTab, setActiveTab] = useState<ApprovalTab>('leave');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectionTarget, setRejectionTarget] = useState<{ id: string; type: ApprovalTab; approvalRequestId?: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const leaveApprovals = useMemo(() => pendingApprovals.filter(a => a.type === 'leave'), [pendingApprovals]);
  const regApprovals = useMemo(() => pendingApprovals.filter(a => a.type === 'regularization'), [pendingApprovals]);

  const currentList = activeTab === 'leave' ? leaveApprovals : regApprovals;
  const totalPages = Math.max(1, Math.ceil(currentList.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedList = currentList.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const startIndex = currentList.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const endIndex = Math.min(safePage * PAGE_SIZE, currentList.length);

  const handleApprove = async (approval: PendingApproval) => {
    setProcessingId(approval.id);
    try {
      if (approval.type === 'leave') {
        await handleLeaveAction(approval.id, 'approved', approval.approvalRequestId);
      } else {
        await handleRegularizationAction(approval.id, 'approved', undefined, approval.approvalRequestId);
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
      handleLeaveAction(approval.id, 'rejected', approval.approvalRequestId).finally(() => setProcessingId(null));
    }
  };

  const handleConfirmRejection = async (reason: string) => {
    if (!rejectionTarget) return;
    setProcessingId(rejectionTarget.id);
    try {
      await handleRegularizationAction(rejectionTarget.id, 'rejected', reason, rejectionTarget.approvalRequestId);
    } finally {
      setProcessingId(null);
      setRejectionTarget(null);
    }
  };

  const getInitials = (name: string) => name?.substring(0, 2).toUpperCase() || '??';

  const getDayCount = (start: string, end?: string) => {
    if (!end || end === start) return '1 day';
    const days = differenceInDays(new Date(end), new Date(start)) + 1;
    return `${days} days`;
  };

  const switchTab = (tab: ApprovalTab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const getLevelBadge = (approval: PendingApproval) => {
    if (!approval.approvalRequestId || !approval.totalLevels) return null;
    return (
      <Badge
        variant="outline"
        className={cn(
          'text-[10px] px-1.5 py-0 h-4',
          approval.isFinalLevel
            ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-700'
            : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-700'
        )}
      >
        L{approval.myLevel}/{approval.totalLevels}
      </Badge>
    );
  };

  const getApproveLabel = (approval: PendingApproval) => {
    if (!approval.approvalRequestId) return 'Approve';
    if (approval.isFinalLevel) return 'Final Approve';
    return 'Approve & Forward';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">Approvals</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Summary */}
        <p className="text-center text-sm font-medium text-muted-foreground">
          You have {pendingApprovals.length} pending request{pendingApprovals.length !== 1 ? 's' : ''}
        </p>

        {/* Tabs */}
        <div className="flex bg-muted rounded-lg p-1 gap-1">
          <button
            onClick={() => switchTab('leave')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all',
              activeTab === 'leave'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Leave Requests
            <Badge className="h-4 min-w-4 px-1 text-[10px] bg-green-600 text-white hover:bg-green-600">
              {leaveApprovals.length}
            </Badge>
          </button>
          <button
            onClick={() => switchTab('regularization')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all',
              activeTab === 'regularization'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <ClipboardCheck className="h-3.5 w-3.5" />
            Regularization
            <Badge className="h-4 min-w-4 px-1 text-[10px] bg-green-600 text-white hover:bg-green-600">
              {regApprovals.length}
            </Badge>
          </button>
        </div>

        {/* List */}
        {currentList.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No pending {activeTab === 'leave' ? 'leave requests' : 'regularizations'}
          </p>
        ) : (
          <div className="space-y-3">
            {paginatedList.map((approval) => (
              <Card key={`${approval.type}-${approval.id}`} className="border shadow-sm rounded-xl overflow-hidden">
                <CardContent className="p-0">
                  {/* Top section with avatar and info */}
                  <div className="flex items-start gap-3 p-3 pb-2">
                    <Avatar className="h-10 w-10 mt-0.5 border-2 border-muted">
                      <AvatarImage src={approval.profilePictureUrl || undefined} />
                      <AvatarFallback className="text-xs font-medium">{getInitials(approval.fullName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold truncate">{approval.fullName}</span>
                        {approval.type === 'regularization' && (
                          <Badge className="bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200 border-0 text-[10px] px-1.5 py-0">
                            Regularization
                          </Badge>
                        )}
                        {getLevelBadge(approval)}
                      </div>
                      {approval.designation && (
                        <p className="text-xs text-muted-foreground">{approval.designation}</p>
                      )}
                    </div>
                  </div>

                  {/* Details section */}
                  <div className="px-3 pb-2 space-y-1">
                    <p className="text-xs font-medium">
                      <span className="text-green-700 dark:text-green-400">
                        {approval.type === 'leave' ? 'Leave' : 'Type'}:
                      </span>{' '}
                      <span className="font-semibold text-foreground">
                        {approval.type === 'leave' ? (approval.leaveTypeName || 'Leave') : 'Regularization'}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {approval.type === 'leave'
                        ? `Date${approval.endDate && approval.endDate !== approval.date ? 's' : ''}: ${format(new Date(approval.date), 'MMM dd')}${approval.endDate && approval.endDate !== approval.date ? ` - ${format(new Date(approval.endDate), 'MMM dd')}` : ''} (${getDayCount(approval.date, approval.endDate)})`
                        : `Date: ${format(new Date(approval.date), 'MMM dd, yyyy')}`}
                    </p>
                    {approval.reason && (
                      <p className="text-xs text-muted-foreground">
                        {approval.type === 'leave' ? 'Reason' : 'Issue'}: {approval.reason}
                      </p>
                    )}
                    {/* Forward indicator */}
                    {approval.approvalRequestId && !approval.isFinalLevel && (
                      <div className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 mt-1">
                        <ChevronRight className="h-3 w-3" />
                        <span>Will forward to Level {(approval.myLevel || 0) + 1} after approval</span>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 px-3 pb-3">
                    <Button
                      size="sm"
                      className={cn(
                        'flex-1 h-8 text-white text-xs rounded-lg',
                        approval.isFinalLevel
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-blue-600 hover:bg-blue-700'
                      )}
                      onClick={() => handleApprove(approval)}
                      disabled={processingId === approval.id}
                    >
                      <Check className="h-3.5 w-3.5 mr-1" />
                      {getApproveLabel(approval)}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1 h-8 text-xs rounded-lg"
                      onClick={() => handleReject(approval)}
                      disabled={processingId === approval.id}
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            <PaginationControls
              currentPage={safePage}
              totalPages={totalPages}
              startIndex={startIndex}
              endIndex={endIndex}
              totalItems={currentList.length}
              hasNextPage={safePage < totalPages}
              hasPrevPage={safePage > 1}
              onNextPage={() => setCurrentPage(p => p + 1)}
              onPrevPage={() => setCurrentPage(p => p - 1)}
              onGoToPage={setCurrentPage}
            />
          </div>
        )}
      </div>

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
