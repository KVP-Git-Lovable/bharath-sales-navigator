import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, Clock, MapPin, MessageSquare, Loader2, LogIn, LogOut } from 'lucide-react';
import { useActivityEvents, ActivityEvent, formatActivityDuration } from '@/hooks/useActivityEvents';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getLocalTodayDate } from '@/utils/dateUtils';

interface ActivityEventsTableProps {
  userId: string;
  selectedDate: string;
  onActivitiesLoaded?: (count: number) => void;
}

interface VisitStatus {
  check_in_time: string | null;
  check_out_time: string | null;
  status: string | null;
}

const ACTIVITY_TYPE_COLORS: Record<string, string> = {
  Celebration: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  Event: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  Promotion: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  Demo: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  Other: 'bg-muted text-muted-foreground',
};

export const ActivityEventsTable = ({ userId, selectedDate, onActivitiesLoaded }: ActivityEventsTableProps) => {
  const { fetchActivitiesForDate } = useActivityEvents();
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [visitStatuses, setVisitStatuses] = useState<Record<string, VisitStatus>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  // FIX: Track whether we've completed at least one load to prevent showing spinner on mount
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const isToday = selectedDate === getLocalTodayDate();
  
  // FIX: Stabilize onActivitiesLoaded callback ref to prevent re-render cascades
  const onActivitiesLoadedRef = useRef(onActivitiesLoaded);
  onActivitiesLoadedRef.current = onActivitiesLoaded;

  const loadActivities = useCallback(async () => {
    if (!userId || !selectedDate) return;
    // Only show loading if we haven't loaded anything yet
    if (!hasLoadedOnce && activities.length === 0) {
      setIsLoading(true);
    }
    try {
      const data = await fetchActivitiesForDate(userId, selectedDate);
      setActivities(data);
      onActivitiesLoadedRef.current?.(data.length);

      // Fetch visit statuses for all activities with visit_ids
      const visitIds = data.map(a => a.visit_id).filter(Boolean);
      if (visitIds.length > 0) {
        const { data: visits } = await supabase
          .from('visits')
          .select('id, check_in_time, check_out_time, status')
          .in('id', visitIds);

        if (visits) {
          const map: Record<string, VisitStatus> = {};
          visits.forEach(v => {
            map[v.id] = {
              check_in_time: v.check_in_time,
              check_out_time: v.check_out_time,
              status: v.status,
            };
          });
          setVisitStatuses(map);
        }
      }
    } catch (err) {
      console.error('[ActivityEventsTable] Failed to load activities:', err);
    } finally {
      setIsLoading(false);
      setHasLoadedOnce(true);
    }
  }, [userId, selectedDate, fetchActivitiesForDate, hasLoadedOnce, activities.length]);

  useEffect(() => {
    loadActivities();
  }, [userId, selectedDate]); // Only reload when userId or date changes, NOT when loadActivities changes

  useEffect(() => {
    const handler = () => loadActivities();
    window.addEventListener('visitDataChanged', handler);
    return () => window.removeEventListener('visitDataChanged', handler);
  }, [loadActivities]);

  const handleCheckIn = async (visitId: string) => {
    setActionLoading(visitId + '-in');
    try {
      const { error } = await supabase
        .from('visits')
        .update({ check_in_time: new Date().toISOString(), status: 'in-progress' } as any)
        .eq('id', visitId);

      if (error) throw error;
      toast.success('Checked in successfully');
      window.dispatchEvent(new CustomEvent('visitDataChanged'));
      await loadActivities();
    } catch (err) {
      console.error('[ActivityEventsTable] Check-in failed:', err);
      toast.error('Check-in failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCheckOut = async (visitId: string) => {
    setActionLoading(visitId + '-out');
    try {
      const { error } = await supabase
        .from('visits')
        .update({ check_out_time: new Date().toISOString(), status: 'productive' } as any)
        .eq('id', visitId);

      if (error) throw error;
      toast.success('Checked out successfully');
      window.dispatchEvent(new CustomEvent('visitDataChanged'));
      await loadActivities();
    } catch (err) {
      console.error('[ActivityEventsTable] Check-out failed:', err);
      toast.error('Check-out failed');
    } finally {
      setActionLoading(null);
    }
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // FIX: Don't show loading spinner - it causes visual flickering
  // The parent already waits for hasLoadedOnce before rendering this component
  if (!hasLoadedOnce || (isLoading && activities.length === 0)) {
    return null;
  }

  if (activities.length === 0) return null;

  return (
    <Card className="shadow-card border-amber-200/50 dark:border-amber-800/30">
      <CardHeader className="pb-2 px-4 pt-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <CalendarDays className="h-4 w-4 text-amber-600" />
          <span>Activities & Events</span>
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-xs ml-auto">
            {activities.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-2">
        {activities.map((activity) => {
          const visitStatus = activity.visit_id ? visitStatuses[activity.visit_id] : null;
          const isCheckedIn = !!visitStatus?.check_in_time;
          const isCheckedOut = !!visitStatus?.check_out_time;

          return (
            <div
              key={activity.id}
              className="rounded-lg border border-amber-200/60 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-950/20 p-3 space-y-2"
            >
              {/* Top row: Name + Type Badge */}
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-medium text-sm leading-tight">
                  {activity.activity_name || activity.activity_type}
                </h4>
                <Badge className={`text-[10px] px-2 py-0.5 shrink-0 ${ACTIVITY_TYPE_COLORS[activity.activity_type] || ACTIVITY_TYPE_COLORS.Other}`}>
                  {activity.activity_type}
                </Badge>
              </div>

              {/* Details row */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatActivityDuration(activity)}
                </span>
                {activity.retailer_name && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {activity.retailer_name}
                  </span>
                )}
              </div>

              {/* Remarks */}
              {activity.remarks && (
                <div className="flex items-start gap-1.5 text-xs text-muted-foreground bg-background/60 rounded px-2 py-1.5">
                  <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                  <span className="line-clamp-2">{activity.remarks}</span>
                </div>
              )}

              {/* Check-in/Check-out section */}
              {activity.visit_id && (
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  {/* Check In Button */}
                  {isToday && !isCheckedIn && (
                    <Button
                      size="sm"
                      className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handleCheckIn(activity.visit_id!)}
                      disabled={actionLoading === activity.visit_id + '-in'}
                    >
                      {actionLoading === activity.visit_id + '-in' ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <LogIn className="h-3 w-3" />
                      )}
                      Check In
                    </Button>
                  )}

                  {/* Check Out Button */}
                  {isToday && isCheckedIn && !isCheckedOut && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={() => handleCheckOut(activity.visit_id!)}
                      disabled={actionLoading === activity.visit_id + '-out'}
                    >
                      {actionLoading === activity.visit_id + '-out' ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <LogOut className="h-3 w-3" />
                      )}
                      Check Out
                    </Button>
                  )}

                  {/* Timestamps */}
                  {isCheckedIn && (
                    <span className="text-[10px] text-green-600 dark:text-green-400 flex items-center gap-1">
                      <LogIn className="h-3 w-3" />
                      In: {formatTime(visitStatus!.check_in_time!)}
                    </span>
                  )}
                  {isCheckedOut && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <LogOut className="h-3 w-3" />
                      Out: {formatTime(visitStatus!.check_out_time!)}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
