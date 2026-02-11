

## Revamped Attendance Page: My Attendance + My Team Tabs

### Overview
Restructure the Attendance page with a top-level segmented control (`My Attendance` / `My Team`). The existing attendance UI moves under "My Attendance" with spacing/consistency polish. A new "My Team" tab provides a manager dashboard with summary cards, pending approvals, and team member attendance cards.

### Page Structure

```text
+----------------------------------+
| Attendance          [...]        |
| [My Attendance] [My Team]        |
+----------------------------------+
|  (content based on active tab)   |
+----------------------------------+
```

- "My Team" tab only renders if `isManager === true` (from existing `useSubordinates` hook)
- Default tab: "My Attendance"
- Tabs are sticky at top, mobile-friendly

---

### 1. My Attendance Tab (Existing UI, polished)

Keep all existing content exactly as-is under this tab:
- Monthly summary (% attendance, Present days count)
- Start My Day / End My Day buttons
- Processing overlay
- GPS tracking info
- Present/Absent cards
- Market Hours card
- Sub-tabs: My Attendance / Leaves / Holidays
- Recent attendance list (card-based)
- Camera capture, regularization modal

Only changes: wrap in the tab content area. Minor spacing adjustments for consistency with the compact mobile preference (h-7, text-xs where appropriate).

---

### 2. My Team Tab (New)

#### 2.1 Team Summary Cards (horizontal scroll)
Three small cards in a horizontal row:
- **Present Today** (green) -- count of subordinates with attendance `status = 'present'` today
- **On Leave** (yellow/amber) -- count with approved leave today
- **Absent** (red) -- remaining subordinates

Each card is tappable to filter the team list below.

Data source:
- Fetch today's attendance for all `subordinateIds` in one query
- Fetch today's approved leaves for all `subordinateIds` in one query
- Absent = total subordinates - present - on leave

#### 2.2 Pending Approvals Section
Only shown if there are pending leave applications or regularization requests from subordinates.

Query:
- `leave_applications` where `user_id IN subordinateIds` and `status = 'pending'`
- `regularization_requests` where `user_id IN subordinateIds` and `status = 'pending'`

Each approval card shows:
- Employee avatar/initials + name + designation
- Type badge (Leave / Regularization)
- Date + reason (truncated)
- Approve (green) + Reject (red) buttons -- large, thumb-friendly

Approve/Reject reuses the same logic from `AttendanceManagement.tsx`:
- `handleLeaveStatusUpdate` for leaves
- `handleRegularizationStatusUpdate` for regularization (including attendance upsert on approval)

Cards disappear after action. Section hides when empty.

#### 2.3 Team Member Attendance List
Vertical stack of cards, one per subordinate.

Each card:
- Profile photo (from `profiles.profile_picture_url`) or initials fallback
- Name + designation
- Today's status badge (Present / Absent / On Leave / Late)
- Check-in time + hours worked (or `--` if on leave/absent)
- Monthly summary (e.g., `18 / 22`)
- "View Attendance" button -- navigates to a detail view

Data source:
- Profiles + today's attendance + monthly attendance counts for each subordinate
- All fetched in bulk queries (not per-user)

Filterable by the summary card taps (Present / On Leave / Absent).

#### 2.4 Team Member Detail View
When tapping "View Attendance" on a team member card:
- Navigate to a new route `/attendance/team/:userId` OR open a full-screen bottom sheet
- Reuses the same UI structure as "My Attendance" but filtered to that employee
- Sub-tabs: Attendance / Leaves / Regularization
- Read-only (no Start/End Day buttons)
- Shows their monthly summary, attendance records list, leave applications, regularization history

---

### New Files

1. **`src/components/attendance/TeamAttendanceTab.tsx`** -- Main "My Team" tab content
   - Team summary cards (Present/Leave/Absent)
   - Pending approvals section
   - Team member list with filter state

2. **`src/components/attendance/TeamSummaryCards.tsx`** -- Horizontal scrolling summary cards

3. **`src/components/attendance/PendingApprovalsSection.tsx`** -- Pending leave + regularization approvals with approve/reject

4. **`src/components/attendance/TeamMemberCard.tsx`** -- Individual team member card

5. **`src/components/attendance/TeamMemberDetailSheet.tsx`** -- Bottom sheet / dialog showing a team member's full attendance detail (reuses existing attendance list UI pattern)

6. **`src/hooks/useTeamAttendance.ts`** -- Hook to fetch team attendance data:
   - Today's attendance for all subordinates
   - Today's approved leaves for subordinates
   - Monthly attendance counts
   - Pending approvals (leaves + regularization)

### Modified Files

1. **`src/pages/Attendance.tsx`** -- Add top-level segmented control
   - Import `useSubordinates` (already imported)
   - Add segmented tab state (`my-attendance` / `my-team`)
   - Wrap existing content under "My Attendance" tab
   - Render `TeamAttendanceTab` under "My Team" tab
   - Only show "My Team" tab if `isManager === true`

---

### Data Queries (in `useTeamAttendance.ts`)

```text
1. Today's attendance:
   SELECT * FROM attendance WHERE user_id IN (subordinateIds) AND date = today

2. Today's approved leaves:
   SELECT * FROM leave_applications WHERE user_id IN (subordinateIds) 
   AND status = 'approved' AND start_date <= today AND end_date >= today

3. Monthly attendance counts (for summary on each card):
   SELECT user_id, COUNT(*) FROM attendance 
   WHERE user_id IN (subordinateIds) AND date >= monthStart AND date <= monthEnd 
   AND status IN ('present','regularized') GROUP BY user_id

4. Pending leave approvals:
   SELECT la.*, p.full_name, p.profile_picture_url, p.designation 
   FROM leave_applications la JOIN profiles p ON la.user_id = p.id
   WHERE la.user_id IN (subordinateIds) AND la.status = 'pending'

5. Pending regularization approvals:
   SELECT rr.*, p.full_name, p.profile_picture_url, p.designation
   FROM regularization_requests rr JOIN profiles p ON rr.user_id = p.id
   WHERE rr.user_id IN (subordinateIds) AND rr.status = 'pending'

6. Subordinate profiles:
   SELECT id, full_name, profile_picture_url, designation 
   FROM profiles WHERE id IN (subordinateIds)
```

### Mobile Design Details
- No tables anywhere -- all cards
- Summary cards: horizontal flex with `overflow-x-auto`, `gap-3`, `snap-x`
- Status chips: colored badges (green/red/yellow/blue)
- Approval buttons: `h-9` minimum for thumb targets
- Soft shadows (`shadow-sm`), rounded corners (`rounded-xl`)
- Team member cards: `p-3`, compact layout matching user preference for compact mobile UI
- Sticky segmented control at top of page content

### Role-based Behavior
- Individual contributors: Only "My Attendance" tab shown, no toggle visible
- Managers: Both tabs visible, "My Attendance" default
- Admins: Same as managers here; separate Admin Panel has the full admin attendance management

