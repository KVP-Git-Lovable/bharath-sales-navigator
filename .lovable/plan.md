
# Fix Flickering and Hierarchy Issues in Team Attendance

## Problem

The Team Attendance section flickers because data objects are recreated on every render, causing the entire list (including avatar images) to unmount and remount repeatedly.

## Root Causes

**1. Unstable `subordinateIds` / `directReportIds` array references (useSubordinates.ts)**
- These arrays are computed via `.map()` and `.filter()` on every render without `useMemo`
- Since they're passed as props and used in query keys and `useEffect` dependencies, every parent re-render triggers cascading re-fetches and state resets

**2. Unmemoized `teamMembers` array in useTeamAttendance.ts**
- The `teamMembers` array and `pendingApprovals` array are rebuilt on every render (lines 195-245) without `useMemo`
- Each of the 6 independent queries resolving at different times causes a re-render, rebuilding the entire members list with new object references
- This causes the hierarchy tree to be rebuilt, all rows to re-render, and avatar images to flicker

**3. Raw `useEffect` for manager map fetch (TeamAttendanceTab.tsx)**
- The `useEffect` on line 86 re-runs whenever `subordinateIds` reference changes (which is every render due to issue #1)
- This resets `managerMapLoaded` state indirectly and causes layout shifts

## Solution

### Step 1: Stabilize array references in `useSubordinates.ts`
Wrap `subordinateIds`, `directReportIds`, and `actualSubordinates` in `useMemo` so they only change when the underlying `subordinates` data actually changes.

### Step 2: Memoize computed data in `useTeamAttendance.ts`
Wrap `teamMembers` and `pendingApprovals` arrays in `useMemo` with proper dependency arrays, so they only rebuild when their source data (profiles, todayAttendance, todayLeaves, monthlyCounts) actually changes.

### Step 3: Replace raw `useEffect` with `useQuery` for manager map (TeamAttendanceTab.tsx)
Convert the manager relationship fetch from `useEffect` + `useState` to `useQuery`. This:
- Eliminates the dependency on unstable `subordinateIds` reference (react-query compares array values)
- Provides built-in caching and loading state
- Removes the manual `managerMapLoaded` state management
- Prevents redundant fetches

### Step 4: Memoize hierarchy tree inputs
Ensure `filteredMembers` and `hierarchyTree` only recompute when their actual data changes (already using `useMemo`, but the fix to upstream references makes them effective).

## Technical Details

**useSubordinates.ts** - Add `useMemo`:
```typescript
const actualSubordinates = useMemo(
  () => subordinates.filter((s) => s.level > 0),
  [subordinates]
);
const subordinateIds = useMemo(
  () => actualSubordinates.map((s) => s.subordinate_user_id),
  [actualSubordinates]
);
const directReportIds = useMemo(
  () => subordinates.filter((s) => s.level === 1).map((s) => s.subordinate_user_id),
  [subordinates]
);
```

**useTeamAttendance.ts** - Wrap computed arrays in `useMemo`:
```typescript
const teamMembers = useMemo(() => {
  // existing computation logic
}, [subordinateIds, profiles, todayAttendance, todayLeaves, monthlyCountsRaw, totalWorkingDaysInMonth]);

const pendingApprovals = useMemo(() => {
  // existing computation logic  
}, [pendingLeaves, pendingRegularizations, profiles]);
```

**TeamAttendanceTab.tsx** - Replace useEffect with useQuery:
```typescript
const { data: managerMap = new Map(), isLoading: managerMapLoading } = useQuery({
  queryKey: ['team-manager-map', subordinateIds],
  queryFn: async () => {
    const { data } = await supabase
      .from('employees')
      .select('user_id, manager_id')
      .in('user_id', subordinateIds);
    const map = new Map();
    data?.forEach(e => map.set(e.user_id, e.manager_id));
    return map;
  },
  enabled: subordinateIds.length > 0,
  staleTime: 5 * 60 * 1000,
});
```

These changes eliminate all unnecessary re-renders and ensure stable object identity throughout the render cycle.
