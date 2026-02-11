import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeamAttendance } from '@/hooks/useTeamAttendance';
import { TeamSummaryCards, TeamFilter } from './TeamSummaryCards';
import { TeamMemberAttendanceCard } from './TeamMemberAttendanceCard';
import { TeamMemberDetailSheet } from './TeamMemberDetailSheet';
import { SearchInput } from '@/components/SearchInput';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { Briefcase, Clock, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 10;

interface TeamAttendanceTabProps {
  subordinateIds: string[];
}

export const TeamAttendanceTab = ({ subordinateIds }: TeamAttendanceTabProps) => {
  const navigate = useNavigate();
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

  // Count leave and regularization requests
  const leaveCount = pendingApprovals.filter(a => a.type === 'leave').length;
  const regCount = pendingApprovals.filter(a => a.type === 'regularization').length;

  return (
    <div className="space-y-4">
      <TeamSummaryCards
        presentCount={presentCount}
        onLeaveCount={onLeaveCount}
        absentCount={absentCount}
        activeFilter={filter}
        onFilterChange={(f) => { setFilter(f); setCurrentPage(1); }}
      />

      {/* Approvals Section */}
      {pendingApprovals.length > 0 && (
        <div className="space-y-2">
          {/* Main Approvals Button */}
          <button
            className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-[hsl(20,70%,94%)] hover:bg-[hsl(20,70%,90%)] transition-colors"
            onClick={() => navigate('/team-approvals')}
          >
            <span className="text-sm font-semibold text-[hsl(160,40%,35%)]">Approvals</span>
            <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-[hsl(15,55%,82%)] text-[hsl(15,60%,35%)] text-xs font-semibold">
              {pendingApprovals.length}
            </span>
            <ChevronRight className="h-4 w-4 text-[hsl(160,40%,35%)]" />
          </button>

          {/* Sub-options */}
          <div className="space-y-2">
            <button
              className="w-full flex items-center gap-3 p-3 bg-background rounded-xl shadow-sm hover:shadow-md transition-shadow"
              onClick={() => navigate('/team-approvals')}
            >
              <div className="h-8 w-8 rounded-full bg-[hsl(150,40%,94%)] flex items-center justify-center">
                <Briefcase className="h-4 w-4 text-[hsl(150,50%,40%)]" />
              </div>
              <span className="flex-1 text-sm font-medium text-foreground text-left">Leave Requests</span>
              {leaveCount > 0 && (
                <span className="text-xs text-muted-foreground">{leaveCount}</span>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <button
              className="w-full flex items-center gap-3 p-3 bg-background rounded-xl shadow-sm hover:shadow-md transition-shadow"
              onClick={() => navigate('/team-approvals')}
            >
              <div className="h-8 w-8 rounded-full bg-[hsl(200,40%,94%)] flex items-center justify-center">
                <Clock className="h-4 w-4 text-[hsl(200,50%,40%)]" />
              </div>
              <span className="flex-1 text-sm font-medium text-foreground text-left">Regularization</span>
              {regCount > 0 && (
                <span className="text-xs text-muted-foreground">{regCount}</span>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}

      {/* Team Members */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground whitespace-nowrap">
            Team Members ({filteredMembers.length})
          </h3>
          <div className="flex-1 max-w-[200px]">
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
