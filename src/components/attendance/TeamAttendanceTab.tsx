import { useState, useMemo } from 'react';
import { useTeamAttendance } from '@/hooks/useTeamAttendance';
import { TeamSummaryCards, TeamFilter } from './TeamSummaryCards';
import { PendingApprovalsSection } from './PendingApprovalsSection';
import { TeamMemberAttendanceCard } from './TeamMemberAttendanceCard';
import { TeamMemberDetailSheet } from './TeamMemberDetailSheet';
import { SearchInput } from '@/components/SearchInput';
import { PaginationControls } from '@/components/ui/PaginationControls';

const PAGE_SIZE = 10;

interface TeamAttendanceTabProps {
  subordinateIds: string[];
}

export const TeamAttendanceTab = ({ subordinateIds }: TeamAttendanceTabProps) => {
  const [filter, setFilter] = useState<TeamFilter>('all');
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const {
    teamMembers,
    pendingApprovals,
    presentCount,
    onLeaveCount,
    absentCount,
    handleLeaveAction,
    handleRegularizationAction,
  } = useTeamAttendance(subordinateIds);

  const filteredMembers = useMemo(() => {
    let members = filter === 'all'
      ? teamMembers
      : teamMembers.filter((m) => m.todayStatus === filter);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      members = members.filter((m) =>
        m.profile.full_name.toLowerCase().includes(q) ||
        (m.profile.designation && m.profile.designation.toLowerCase().includes(q))
      );
    }
    return members;
  }, [teamMembers, filter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  if (safePage !== currentPage) setCurrentPage(safePage);

  const paginatedMembers = filteredMembers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const startIndex = filteredMembers.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const endIndex = Math.min(safePage * PAGE_SIZE, filteredMembers.length);

  const detailMember = teamMembers.find(m => m.profile.id === detailUserId);

  return (
    <div className="space-y-4">
      <TeamSummaryCards
        presentCount={presentCount}
        onLeaveCount={onLeaveCount}
        absentCount={absentCount}
        activeFilter={filter}
        onFilterChange={(f) => { setFilter(f); setCurrentPage(1); }}
      />

      <PendingApprovalsSection
        approvals={pendingApprovals}
        onLeaveAction={handleLeaveAction}
        onRegularizationAction={handleRegularizationAction}
      />

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground whitespace-nowrap">
            Team Members ({filteredMembers.length})
          </h3>
          <div className="flex-1 max-w-[220px]">
            <SearchInput
              placeholder="Search members..."
              value={searchQuery}
              onChange={(v) => { setSearchQuery(v); setCurrentPage(1); }}
            />
          </div>
        </div>

        {filteredMembers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No team members {filter !== 'all' ? `with status "${filter.replace('_', ' ')}"` : 'found'}
          </p>
        ) : (
          <>
            {paginatedMembers.map((member) => (
              <TeamMemberAttendanceCard
                key={member.profile.id}
                member={member}
                onViewAttendance={setDetailUserId}
              />
            ))}
            <PaginationControls
              currentPage={safePage}
              totalPages={totalPages}
              startIndex={startIndex}
              endIndex={endIndex}
              totalItems={filteredMembers.length}
              hasNextPage={safePage < totalPages}
              hasPrevPage={safePage > 1}
              onNextPage={() => setCurrentPage(p => p + 1)}
              onPrevPage={() => setCurrentPage(p => p - 1)}
              onGoToPage={setCurrentPage}
            />
          </>
        )}
      </div>

      <TeamMemberDetailSheet
        isOpen={!!detailUserId}
        onClose={() => setDetailUserId(null)}
        userId={detailUserId || ''}
        userName={detailMember?.profile.full_name || ''}
      />
    </div>
  );
};
