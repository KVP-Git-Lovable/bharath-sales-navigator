

# Plan: Target Split, Dual Visibility for Independent Managers, and Editable Targets

## Understanding

You're asking for several related improvements:

1. **Split by Team Size**: Prajwal has 5 direct reports — split equally among 5. Shravya's weight should NOT inflate Prajwal's split just because she has subordinates. Each manager handles their own team's distribution.

2. **Independent Strategy = Dual Target**: When Shravya is set to "Independent", she should see TWO targets:
   - **Personal Target** — her own individual target
   - **Team Target** — what she distributes to her 3 subordinates
   
3. **Hide "not distributed" warning for Independent**: Since Independent means the target is personal, don't show distribution warnings.

4. **Editable by Managers**: After targets are saved, each manager should be able to:
   - Edit their own subordinates' targets
   - See their own target vs actual achievement
   - If they have a personal target (Independent), see that too

## Changes

### Phase 1: Fix Split by Team Size (this sprint)

**File: `AllocationTable.tsx` (line ~366-387)**
- Change `handleEqualSplit` to split equally among L1 direct reports (weight = 1 each), NOT by subordinateCount
- Each manager then handles their own team's internal distribution via their strategy

### Phase 2: Dual Target for Independent Strategy (this sprint)

**File: `StepAssignManagers.tsx`**
- When a sub-manager's strategy is `independent`, show TWO input fields in the mini card:
  - "Personal Target" input (their own individual target)
  - "Team Target" input (what gets distributed to their subordinates)
- Add a new field `personalQuantityTarget` / `personalRevenueTarget` to track the personal portion

**File: `AllocationTable.tsx`**  
- Extend `SubordinateAllocation` interface with `personalQuantityTarget`, `personalRevenueTarget`, `personalVisitsTarget`
- Update `autoDistributeTargets`: for `independent` nodes, keep personal target separate, distribute team target to children

**File: `StepPreview.tsx`**
- For Independent managers, show both personal and team targets in the preview
- Hide "not yet distributed" warning when strategy is `independent`

### Phase 3: Manager Self-Service Target Editing (next sprint)

**File: New — `src/pages/ManagerTargets.tsx`**
- Create a page where logged-in managers can:
  - View their own target (personal + team if applicable)
  - Edit subordinates' targets (if allowed by status)
  - See target vs actual achievement using existing `useTeamTargetProgress` hook
- Reuse `AllocationTable` patterns but scoped to current user's hierarchy

**File: `src/components/targets/KPICard.tsx`** (existing)
- Already shows target/actual/achievement — reuse in manager view

**Database**: 
- Add `personal_quantity_target` and `personal_revenue_target` columns to `user_business_plans` table to store the personal portion separately from team target

## Implementation Order

1. Fix equal split logic (simple change)
2. Add personal target fields to DB + interfaces  
3. Update StepAssignManagers mini card with dual inputs for Independent
4. Update Preview to show dual targets + hide warning for Independent
5. Create Manager Target editing page with target vs actual view

## Files to Modify
- `src/components/admin/AllocationTable.tsx` — split logic, interfaces, auto-distribute
- `src/components/admin/allocation/StepAssignManagers.tsx` — dual input for Independent
- `src/components/admin/allocation/StepPreview.tsx` — hide warning for Independent, show dual targets
- `src/pages/ManagerTargets.tsx` — new page for manager self-service
- Database migration — add personal target columns

