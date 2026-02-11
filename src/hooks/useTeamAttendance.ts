import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export interface TeamMemberProfile {
  id: string;
  full_name: string;
  profile_picture_url: string | null;
  designation: string | null;
}

export interface TeamMemberAttendance {
  profile: TeamMemberProfile;
  todayStatus: 'present' | 'absent' | 'on_leave' | 'late' | 'regularized';
  checkInTime: string | null;
  checkOutTime: string | null;
  totalHours: number | null;
  monthlyPresent: number;
  monthlyTotal: number;
}

export interface PendingApproval {
  id: string;
  type: 'leave' | 'regularization';
  userId: string;
  fullName: string;
  profilePictureUrl: string | null;
  designation: string | null;
  date: string;
  endDate?: string;
  reason: string | null;
  leaveTypeName?: string;
  // regularization specific
  requestedCheckIn?: string | null;
  requestedCheckOut?: string | null;
  attendanceDate?: string;
}

const today = format(new Date(), 'yyyy-MM-dd');
const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

export const useTeamAttendance = (subordinateIds: string[]) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const enabled = subordinateIds.length > 0;

  // 1. Subordinate profiles
  const { data: profiles = [] } = useQuery({
    queryKey: ['team-profiles', subordinateIds],
    queryFn: async () => {
      if (!subordinateIds.length) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, profile_picture_url, designation')
        .in('id', subordinateIds);
      if (error) throw error;
      return (data || []) as TeamMemberProfile[];
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  // 2. Today's attendance
  const { data: todayAttendance = [] } = useQuery({
    queryKey: ['team-today-attendance', subordinateIds, today],
    queryFn: async () => {
      if (!subordinateIds.length) return [];
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .in('user_id', subordinateIds)
        .eq('date', today);
      if (error) throw error;
      return data || [];
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  });

  // 3. Today's approved leaves
  const { data: todayLeaves = [] } = useQuery({
    queryKey: ['team-today-leaves', subordinateIds, today],
    queryFn: async () => {
      if (!subordinateIds.length) return [];
      const { data, error } = await supabase
        .from('leave_applications')
        .select('user_id, start_date, end_date')
        .in('user_id', subordinateIds)
        .eq('status', 'approved')
        .lte('start_date', today)
        .gte('end_date', today);
      if (error) throw error;
      return data || [];
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  // 4. Monthly attendance counts
  const { data: monthlyCountsRaw = [] } = useQuery({
    queryKey: ['team-monthly-counts', subordinateIds, monthStart],
    queryFn: async () => {
      if (!subordinateIds.length) return [];
      const { data, error } = await supabase
        .from('attendance')
        .select('user_id, date')
        .in('user_id', subordinateIds)
        .gte('date', monthStart)
        .lte('date', monthEnd)
        .in('status', ['present', 'regularized']);
      if (error) throw error;
      return data || [];
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  // 5. Pending leave approvals
  const { data: pendingLeaves = [] } = useQuery({
    queryKey: ['team-pending-leaves', subordinateIds],
    queryFn: async () => {
      if (!subordinateIds.length) return [];
      const { data, error } = await supabase
        .from('leave_applications')
        .select('id, user_id, start_date, end_date, reason, leave_type_id, status')
        .in('user_id', subordinateIds)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      
      // Get leave type names
      if (data && data.length > 0) {
        const typeIds = [...new Set(data.map(d => d.leave_type_id).filter(Boolean))];
        const { data: types } = await supabase
          .from('leave_types')
          .select('id, name')
          .in('id', typeIds);
        const typeMap = new Map(types?.map(t => [t.id, t.name]) || []);
        return data.map(d => ({ ...d, leaveTypeName: typeMap.get(d.leave_type_id) || 'Leave' }));
      }
      return data || [];
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  });

  // 6. Pending regularization approvals
  const { data: pendingRegularizations = [] } = useQuery({
    queryKey: ['team-pending-regularizations', subordinateIds],
    queryFn: async () => {
      if (!subordinateIds.length) return [];
      const { data, error } = await supabase
        .from('regularization_requests')
        .select('id, user_id, attendance_date, reason, requested_check_in_time, requested_check_out_time, status')
        .in('user_id', subordinateIds)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  });

  // Compute monthly counts map
  const monthlyCounts = new Map<string, number>();
  monthlyCountsRaw.forEach((r: any) => {
    monthlyCounts.set(r.user_id, (monthlyCounts.get(r.user_id) || 0) + 1);
  });

  // Compute sets
  const presentUserIds = new Set(todayAttendance.map((a: any) => a.user_id));
  const onLeaveUserIds = new Set(todayLeaves.map((l: any) => l.user_id));

  // Summary counts
  const presentCount = presentUserIds.size;
  const onLeaveCount = [...onLeaveUserIds].filter(id => !presentUserIds.has(id)).length;
  const absentCount = subordinateIds.length - presentCount - onLeaveCount;

  // Working days in month (approx)
  const totalWorkingDaysInMonth = 22;

  // Build team members list
  const profileMap = new Map(profiles.map(p => [p.id, p]));
  const attendanceMap = new Map(todayAttendance.map((a: any) => [a.user_id, a]));

  const teamMembers: TeamMemberAttendance[] = subordinateIds.map(id => {
    const profile = profileMap.get(id) || { id, full_name: 'Unknown', profile_picture_url: null, designation: null };
    const att = attendanceMap.get(id);
    const isOnLeave = onLeaveUserIds.has(id) && !presentUserIds.has(id);
    
    let todayStatus: TeamMemberAttendance['todayStatus'] = 'absent';
    if (att) {
      todayStatus = att.status === 'regularized' ? 'regularized' : 'present';
    } else if (isOnLeave) {
      todayStatus = 'on_leave';
    }

    return {
      profile,
      todayStatus,
      checkInTime: att?.check_in_time || null,
      checkOutTime: att?.check_out_time || null,
      totalHours: att?.total_hours || null,
      monthlyPresent: monthlyCounts.get(id) || 0,
      monthlyTotal: totalWorkingDaysInMonth,
    };
  });

  // Build pending approvals list
  const pendingApprovals: PendingApproval[] = [
    ...pendingLeaves.map((l: any) => ({
      id: l.id,
      type: 'leave' as const,
      userId: l.user_id,
      fullName: profileMap.get(l.user_id)?.full_name || 'Unknown',
      profilePictureUrl: profileMap.get(l.user_id)?.profile_picture_url || null,
      designation: profileMap.get(l.user_id)?.designation || null,
      date: l.start_date,
      endDate: l.end_date,
      reason: l.reason,
      leaveTypeName: l.leaveTypeName,
    })),
    ...pendingRegularizations.map((r: any) => ({
      id: r.id,
      type: 'regularization' as const,
      userId: r.user_id,
      fullName: profileMap.get(r.user_id)?.full_name || 'Unknown',
      profilePictureUrl: profileMap.get(r.user_id)?.profile_picture_url || null,
      designation: profileMap.get(r.user_id)?.designation || null,
      date: r.attendance_date,
      reason: r.reason,
      requestedCheckIn: r.requested_check_in_time,
      requestedCheckOut: r.requested_check_out_time,
      attendanceDate: r.attendance_date,
    })),
  ];

  // Approve/Reject leave
  const handleLeaveAction = async (applicationId: string, newStatus: 'approved' | 'rejected') => {
    try {
      const updateData: any = {
        status: newStatus,
        approved_date: newStatus === 'approved' ? new Date().toISOString() : null,
      };
      if (user) updateData.approved_by = user.id;

      const { error } = await supabase
        .from('leave_applications')
        .update(updateData)
        .eq('id', applicationId);
      if (error) throw error;

      toast({ title: `Leave ${newStatus} successfully` });
      queryClient.invalidateQueries({ queryKey: ['team-pending-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['team-today-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['team-today-attendance'] });
    } catch (error) {
      console.error('Error updating leave:', error);
      toast({ title: 'Failed to update leave', variant: 'destructive' });
    }
  };

  // Approve/Reject regularization
  const handleRegularizationAction = async (requestId: string, newStatus: 'approved' | 'rejected', rejectionReason?: string) => {
    try {
      if (newStatus === 'approved') {
        // Get request details
        const { data: request, error: fetchError } = await supabase
          .from('regularization_requests')
          .select('*')
          .eq('id', requestId)
          .single();
        if (fetchError) throw fetchError;

        // Calculate total hours
        let totalHours = null;
        if (request.requested_check_in_time && request.requested_check_out_time) {
          const checkIn = new Date(request.requested_check_in_time);
          const checkOut = new Date(request.requested_check_out_time);
          totalHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
        }

        // Upsert attendance
        const { error: attendanceError } = await supabase
          .from('attendance')
          .upsert({
            user_id: request.user_id,
            date: request.attendance_date,
            check_in_time: request.requested_check_in_time,
            check_out_time: request.requested_check_out_time,
            status: 'regularized',
            total_hours: totalHours,
            notes: `Regularized via request #${requestId.slice(0, 8)}`,
            regularized_request_id: requestId,
          }, { onConflict: 'user_id,date' });
        if (attendanceError) throw attendanceError;
      }

      const updateData: any = {
        status: newStatus,
        approved_at: newStatus === 'approved' ? new Date().toISOString() : null,
        rejection_reason: rejectionReason || null,
      };
      if (user) updateData.approved_by = user.id;

      const { error } = await supabase
        .from('regularization_requests')
        .update(updateData)
        .eq('id', requestId);
      if (error) throw error;

      toast({ title: `Regularization ${newStatus} successfully` });
      queryClient.invalidateQueries({ queryKey: ['team-pending-regularizations'] });
      queryClient.invalidateQueries({ queryKey: ['team-today-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['team-monthly-counts'] });
    } catch (error) {
      console.error('Error updating regularization:', error);
      toast({ title: 'Failed to update regularization', variant: 'destructive' });
    }
  };

  return {
    profiles,
    teamMembers,
    pendingApprovals,
    presentCount,
    onLeaveCount,
    absentCount,
    totalSubordinates: subordinateIds.length,
    handleLeaveAction,
    handleRegularizationAction,
  };
};
