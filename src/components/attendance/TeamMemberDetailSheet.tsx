import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';

interface TeamMemberDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

export const TeamMemberDetailSheet = ({ isOpen, onClose, userId, userName }: TeamMemberDetailSheetProps) => {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [regularizations, setRegularizations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

  useEffect(() => {
    if (isOpen && userId) {
      fetchData();
    }
  }, [isOpen, userId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [attRes, leaveRes, regRes] = await Promise.all([
        supabase
          .from('attendance')
          .select('*')
          .eq('user_id', userId)
          .gte('date', monthStart)
          .lte('date', monthEnd)
          .order('date', { ascending: false }),
        supabase
          .from('leave_applications')
          .select('*, leave_types(name)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('regularization_requests')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      setAttendance(attRes.data || []);
      setLeaves(leaveRes.data || []);
      setRegularizations(regRes.data || []);
    } catch (error) {
      console.error('Error fetching member detail:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (t: string | null) => {
    if (!t) return '--:--';
    return new Date(t).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const presentCount = attendance.filter(a => a.status === 'present' || a.status === 'regularized').length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto p-4">
        <DialogHeader>
          <DialogTitle className="text-base">{userName} — Attendance</DialogTitle>
        </DialogHeader>

        {/* Monthly Summary */}
        <div className="flex items-center justify-center gap-6 py-2">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{presentCount}</div>
            <div className="text-xs text-muted-foreground">Present</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{attendance.length}</div>
            <div className="text-xs text-muted-foreground">Records</div>
          </div>
        </div>

        <Tabs defaultValue="attendance" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-8">
            <TabsTrigger value="attendance" className="text-xs">Attendance</TabsTrigger>
            <TabsTrigger value="leaves" className="text-xs">Leaves</TabsTrigger>
            <TabsTrigger value="regularization" className="text-xs">Regularization</TabsTrigger>
          </TabsList>

          <TabsContent value="attendance" className="space-y-2 mt-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
            ) : attendance.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No attendance records</p>
            ) : (
              attendance.map((record) => {
                const isPresent = record.status === 'present' || record.status === 'regularized';
                return (
                  <div
                    key={record.id}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg border',
                      isPresent
                        ? 'bg-green-50/50 border-green-200 dark:bg-green-950/30 dark:border-green-800'
                        : 'bg-red-50/50 border-red-200 dark:bg-red-950/30 dark:border-red-800'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {isPresent ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <div>
                        <div className="text-sm font-medium">
                          {format(new Date(record.date), 'EEE, MMM dd')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          In: {formatTime(record.check_in_time)} | Out: {formatTime(record.check_out_time)}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px]',
                        record.status === 'regularized'
                          ? 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                          : isPresent
                          ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
                          : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                      )}
                    >
                      {record.status}
                    </Badge>
                  </div>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="leaves" className="space-y-2 mt-2">
            {leaves.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No leave applications</p>
            ) : (
              leaves.map((leave) => (
                <div key={leave.id} className="p-3 rounded-lg border space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {(leave.leave_types as any)?.name || 'Leave'}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px]',
                        leave.status === 'approved' && 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
                        leave.status === 'pending' && 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
                        leave.status === 'rejected' && 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                      )}
                    >
                      {leave.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(leave.start_date), 'MMM dd')} - {format(new Date(leave.end_date), 'MMM dd, yyyy')}
                  </p>
                  {leave.reason && <p className="text-xs text-muted-foreground line-clamp-1">{leave.reason}</p>}
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="regularization" className="space-y-2 mt-2">
            {regularizations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No regularization requests</p>
            ) : (
              regularizations.map((req) => (
                <div key={req.id} className="p-3 rounded-lg border space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {format(new Date(req.attendance_date), 'EEE, MMM dd')}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px]',
                        req.status === 'approved' && 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
                        req.status === 'pending' && 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
                        req.status === 'rejected' && 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                      )}
                    >
                      {req.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatTime(req.requested_check_in_time)} - {formatTime(req.requested_check_out_time)}
                  </p>
                  {req.reason && <p className="text-xs text-muted-foreground line-clamp-1">{req.reason}</p>}
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
