import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { TeamMemberAttendance } from '@/hooks/useTeamAttendance';
import { cn } from '@/lib/utils';

interface TeamMemberAttendanceCardProps {
  member: TeamMemberAttendance;
  onViewAttendance: (userId: string) => void;
}

const statusConfig = {
  present: { label: 'Present', className: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-700' },
  absent: { label: 'Absent', className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-700' },
  on_leave: { label: 'On Leave', className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-700' },
  late: { label: 'Late', className: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-700' },
  regularized: { label: 'Regularized', className: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-700' },
};

export const TeamMemberAttendanceCard = ({ member, onViewAttendance }: TeamMemberAttendanceCardProps) => {
  const status = statusConfig[member.todayStatus];
  const initials = member.profile.full_name?.substring(0, 2).toUpperCase() || '??';

  const formatTime = (t: string | null) => {
    if (!t) return '--:--';
    return new Date(t).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card className="shadow-sm rounded-xl">
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={member.profile.profile_picture_url || undefined} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{member.profile.full_name}</p>
                {member.profile.designation && (
                  <p className="text-xs text-muted-foreground truncate">{member.profile.designation}</p>
                )}
              </div>
              <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 whitespace-nowrap', status.className)}>
                {status.label}
              </Badge>
            </div>

            <div className="flex items-center justify-between mt-1.5">
              <div className="flex gap-3 text-xs text-muted-foreground">
                {member.todayStatus === 'present' || member.todayStatus === 'regularized' ? (
                  <>
                    <span>In: {formatTime(member.checkInTime)}</span>
                    {member.totalHours != null && (
                      <span>{member.totalHours.toFixed(1)}h</span>
                    )}
                  </>
                ) : (
                  <span>--</span>
                )}
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                {member.monthlyPresent} / {member.monthlyTotal}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full h-7 text-xs mt-2"
              onClick={() => onViewAttendance(member.profile.id)}
            >
              <Eye className="h-3 w-3 mr-1" />
              View Attendance
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
