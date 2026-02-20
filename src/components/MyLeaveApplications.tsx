import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { Calendar, Clock } from 'lucide-react';

interface LeaveApplication {
  id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  applied_date: string;
  approved_date?: string;
  rejection_reason?: string;
  leave_types?: {
    name: string;
  } | null;
}

interface MyLeaveApplicationsProps {
  refreshTrigger?: number;
}

const MyLeaveApplications: React.FC<MyLeaveApplicationsProps> = ({ refreshTrigger }) => {
  const { user } = useAuth();
  const [applications, setApplications] = useState<LeaveApplication[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMyApplications();
    }
  }, [user, refreshTrigger]);

  const fetchMyApplications = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      console.log('Fetching my leave applications for user:', user.id);
      const { data, error } = await supabase
        .from('leave_applications')
        .select(`
          *,
          leave_types!leave_applications_leave_type_id_fkey (
            name
          )
        `)
        .eq('user_id', user.id)
        .order('applied_date', { ascending: false });

      console.log('Leave applications data:', data, 'error:', error);
      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedData = (data || []).map(item => ({
        ...item,
        leave_types: Array.isArray(item.leave_types) && item.leave_types.length > 0 
          ? item.leave_types[0] 
          : null
      }));
      
      setApplications(transformedData as LeaveApplication[]);
    } catch (error) {
      console.error('Error fetching leave applications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { 
        variant: 'secondary' as const, 
        className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100', 
        label: 'Pending' 
      },
      approved: { 
        variant: 'default' as const, 
        className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100', 
        label: 'Approved' 
      },
      rejected: { 
        variant: 'destructive' as const, 
        className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100', 
        label: 'Rejected' 
      }
    };

    const config = statusConfig[status] || statusConfig.pending;
    
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const calculateLeaveDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const timeDiff = end.getTime() - start.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          My Leave Applications
        </CardTitle>
      </CardHeader>
      <CardContent>
        {applications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-lg font-medium">No leave applications found</p>
            <p className="text-sm">Apply for leave to see your applications here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((application) => (
              <div
                key={application.id}
                className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg">
                      {application.leave_types?.name || 'Unknown Leave Type'}
                    </h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Applied on {format(new Date(application.applied_date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  {getStatusBadge(application.status)}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-muted-foreground">Duration:</span>
                    <p className="mt-1">
                      {format(new Date(application.start_date), 'MMM dd')} - {format(new Date(application.end_date), 'MMM dd, yyyy')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {calculateLeaveDays(application.start_date, application.end_date)} days
                    </p>
                  </div>
                  
                  <div className="col-span-1 sm:col-span-2">
                    <span className="font-medium text-muted-foreground">Reason:</span>
                    <p className="mt-1 text-sm leading-relaxed">{application.reason}</p>
                  </div>
                </div>

                {application.status === 'approved' && application.approved_date && (
                  <div className="bg-green-50 dark:bg-green-950 p-3 rounded-md">
                    <p className="text-sm text-green-700 dark:text-green-300">
                      ✅ Approved on {format(new Date(application.approved_date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                )}

                {application.status === 'rejected' && application.rejection_reason && (
                  <div className="bg-red-50 dark:bg-red-950 p-3 rounded-md">
                    <p className="text-sm text-red-700 dark:text-red-300">
                      ❌ Rejected: {application.rejection_reason}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MyLeaveApplications;