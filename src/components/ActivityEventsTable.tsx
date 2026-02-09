import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock, MapPin, MessageSquare, Loader2 } from 'lucide-react';
import { useActivityEvents, ActivityEvent, formatActivityDuration } from '@/hooks/useActivityEvents';

interface ActivityEventsTableProps {
  userId: string;
  selectedDate: string;
}

const ACTIVITY_TYPE_COLORS: Record<string, string> = {
  Celebration: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  Event: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  Promotion: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  Demo: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  Other: 'bg-muted text-muted-foreground',
};

export const ActivityEventsTable = ({ userId, selectedDate }: ActivityEventsTableProps) => {
  const { fetchActivitiesForDate } = useActivityEvents();
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadActivities = useCallback(async () => {
    if (!userId || !selectedDate) return;
    setIsLoading(true);
    try {
      const data = await fetchActivitiesForDate(userId, selectedDate);
      setActivities(data);
    } catch (err) {
      console.error('[ActivityEventsTable] Failed to load activities:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, selectedDate, fetchActivitiesForDate]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  // Listen for refresh events
  useEffect(() => {
    const handler = () => loadActivities();
    window.addEventListener('visitDataChanged', handler);
    return () => window.removeEventListener('visitDataChanged', handler);
  }, [loadActivities]);

  if (isLoading && activities.length === 0) {
    return (
      <Card className="shadow-card border-amber-200/50 dark:border-amber-800/30">
        <CardContent className="p-4 text-center">
          <Loader2 className="h-5 w-5 animate-spin mx-auto text-amber-500" />
          <p className="text-xs text-muted-foreground mt-2">Loading activities...</p>
        </CardContent>
      </Card>
    );
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
        {activities.map((activity) => (
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
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
