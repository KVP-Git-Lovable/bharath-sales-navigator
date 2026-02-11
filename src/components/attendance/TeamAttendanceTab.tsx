import { useState } from 'react';
import { useTeamAttendance } from '@/hooks/useTeamAttendance';
import { TeamSummaryCards, TeamFilter } from './TeamSummaryCards';
import { PendingApprovalsSection } from './PendingApprovalsSection';
import { TeamMemberAttendanceCard } from './TeamMemberAttendanceCard';
import { TeamMemberDetailSheet } from './TeamMemberDetailSheet';

interface TeamAttendanceTabProps {
  subordinateIds: string[];
}

export const TeamAttendanceTab = ({ subordinateIds }: TeamAttendanceTabProps) => {
  const [filter, setFilter] = useState<TeamFilter>('all');
  const [detailUserId, setDetailUserId] = useState<string | null>(null);

  const {
    teamMembers,
    pendingApprovals,
    presentCount,
    onLeaveCount,
    absentCount,
    handleLeaveAction,
    handleRegularizationAction,
  } = useTeamAttendance(subordinateIds);

  const filteredMembers = filter === 'all'
    ? teamMembers
    : teamMembers.filter((m) => m.todayStatus === filter);

  const detailMember = teamMembers.find(m => m.profile.id === detailUserId);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <TeamSummaryCards
        presentCount={presentCount}
        onLeaveCount={onLeaveCount}
        absentCount={absentCount}
        activeFilter={filter}
        onFilterChange={setFilter}
      />

      {/* Pending Approvals */}
      <PendingApprovalsSection
        approvals={pendingApprovals}
        onLeaveAction={handleLeaveAction}
        onRegularizationAction={handleRegularizationAction}
      />

      {/* Team Member List */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">
          Team Members ({filteredMembers.length})
        </h3>
        {filteredMembers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No team members {filter !== 'all' ? `with status "${filter.replace('_', ' ')}"` : 'found'}
          </p>
        ) : (
          filteredMembers.map((member) => (
            <TeamMemberAttendanceCard
              key={member.profile.id}
              member={member}
              onViewAttendance={setDetailUserId}
            />
          ))
        )}
      </div>

      {/* Detail Sheet */}
      <TeamMemberDetailSheet
        isOpen={!!detailUserId}
        onClose={() => setDetailUserId(null)}
        userId={detailUserId || ''}
        userName={detailMember?.profile.full_name || ''}
      />
    </div>
  );
};
