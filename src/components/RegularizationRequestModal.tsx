import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AttendanceRecord {
  id?: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status?: string;
  isAbsentPlaceholder?: boolean;
}

interface RegularizationRequest {
  id: string;
  status: string;
  requested_check_in_time: string | null;
  requested_check_out_time: string | null;
  reason: string;
  rejection_reason?: string | null;
  created_at: string;
}

interface RegularizationRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendanceRecord: AttendanceRecord | null;
  existingRequest: RegularizationRequest | null;
  onSubmit: () => void;
  userId: string;
}

const RegularizationRequestModal: React.FC<RegularizationRequestModalProps> = ({
  isOpen,
  onClose,
  attendanceRecord,
  existingRequest,
  onSubmit,
  userId
}) => {
  const [requestedCheckIn, setRequestedCheckIn] = useState('');
  const [requestedCheckOut, setRequestedCheckOut] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when opening
  useEffect(() => {
    if (isOpen && attendanceRecord) {
      setRequestedCheckIn('');
      setRequestedCheckOut('');
      setReason('');
    }
  }, [isOpen, attendanceRecord]);

  const formatTime = (timeString: string | null): string => {
    if (!timeString) return '--';
    try {
      return format(new Date(timeString), 'HH:mm');
    } catch {
      return '--';
    }
  };

  const handleSubmit = async () => {
    if (!attendanceRecord || !userId) return;

    // Validation
    if (!requestedCheckIn && !requestedCheckOut) {
      toast.error('Please provide at least one time correction');
      return;
    }

    if (!reason || reason.trim().length < 10) {
      toast.error('Please provide a reason (minimum 10 characters)');
      return;
    }

    setIsSubmitting(true);
    try {
      // Build the requested times as full timestamps
      const attendanceDate = attendanceRecord.date;
      const requestedCheckInTime = requestedCheckIn 
        ? new Date(`${attendanceDate}T${requestedCheckIn}:00`).toISOString()
        : null;
      const requestedCheckOutTime = requestedCheckOut
        ? new Date(`${attendanceDate}T${requestedCheckOut}:00`).toISOString()
        : null;

      const { error } = await supabase
        .from('regularization_requests')
        .insert({
          user_id: userId,
          attendance_date: attendanceDate,
          current_check_in_time: attendanceRecord.check_in_time,
          current_check_out_time: attendanceRecord.check_out_time,
          requested_check_in_time: requestedCheckInTime,
          requested_check_out_time: requestedCheckOutTime,
          reason: reason.trim(),
          status: 'pending'
        });

      if (error) throw error;

      toast.success('Regularization request submitted successfully');
      onSubmit();
      onClose();
    } catch (error) {
      console.error('Error submitting regularization request:', error);
      toast.error('Failed to submit regularization request');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!attendanceRecord) return null;

  const isAbsent = attendanceRecord.status === 'absent' || attendanceRecord.isAbsentPlaceholder;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Request Regularization
          </DialogTitle>
          <DialogDescription>
            Submit a request to correct your attendance for {format(new Date(attendanceRecord.date), 'MMMM dd, yyyy')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Existing Request Status */}
          {existingRequest && (
            <div className={`p-4 rounded-lg border ${
              existingRequest.status === 'pending' ? 'bg-yellow-50 border-yellow-200' :
              existingRequest.status === 'approved' ? 'bg-green-50 border-green-200' :
              'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {existingRequest.status === 'pending' && <Clock className="h-4 w-4 text-yellow-600" />}
                {existingRequest.status === 'approved' && <CheckCircle className="h-4 w-4 text-green-600" />}
                {existingRequest.status === 'rejected' && <XCircle className="h-4 w-4 text-red-600" />}
                <span className="font-medium capitalize">{existingRequest.status} Request</span>
              </div>
              {existingRequest.status === 'rejected' && existingRequest.rejection_reason && (
                <p className="text-sm text-red-700 mt-1">
                  Rejection Reason: {existingRequest.rejection_reason}
                </p>
              )}
              {existingRequest.status === 'pending' && (
                <p className="text-sm text-yellow-700">
                  A request is already pending for this date.
                </p>
              )}
              {existingRequest.status === 'approved' && (
                <p className="text-sm text-green-700">
                  Your request has been approved.
                </p>
              )}
            </div>
          )}

          {/* Current Attendance Info */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Current Attendance</Label>
            <div className="flex gap-4 p-3 bg-muted rounded-lg">
              <div className="flex-1">
                <div className="text-xs text-muted-foreground">Check-in</div>
                <div className="font-medium">{formatTime(attendanceRecord.check_in_time)}</div>
              </div>
              <div className="flex-1">
                <div className="text-xs text-muted-foreground">Check-out</div>
                <div className="font-medium">{formatTime(attendanceRecord.check_out_time)}</div>
              </div>
              <div className="flex-1">
                <div className="text-xs text-muted-foreground">Status</div>
                <Badge variant={isAbsent ? 'destructive' : 'default'} className="mt-1">
                  {isAbsent ? 'Absent' : attendanceRecord.status || 'Present'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Allow new submission only if no pending/approved request */}
          {(!existingRequest || existingRequest.status === 'rejected') && (
            <>
              {/* Requested Times */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="requestedCheckIn">Requested Check-in Time</Label>
                  <Input
                    id="requestedCheckIn"
                    type="time"
                    value={requestedCheckIn}
                    onChange={(e) => setRequestedCheckIn(e.target.value)}
                    placeholder="HH:mm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="requestedCheckOut">Requested Check-out Time</Label>
                  <Input
                    id="requestedCheckOut"
                    type="time"
                    value={requestedCheckOut}
                    onChange={(e) => setRequestedCheckOut(e.target.value)}
                    placeholder="HH:mm"
                  />
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <Label htmlFor="reason">
                  Reason <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Please explain why you need to regularize your attendance..."
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Minimum 10 characters required
                </p>
              </div>

              {/* Info */}
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Your request will be sent to your manager for approval. Once approved, your attendance will be updated automatically.
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {(!existingRequest || existingRequest.status === 'rejected') && (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Request
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RegularizationRequestModal;
