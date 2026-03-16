

# Plan: Add "No Target" Option for Users/Managers in My Target

## Problem
Some managers and users may not have any target assigned to them. Currently, the system requires creating an FY plan with quantity/revenue targets. There's no way to explicitly mark a user as having "No Target" for a given fiscal year.

## Approach

### 1. Add `has_no_target` flag to `user_business_plans` table
- Add a boolean column `has_no_target` (default `false`) to the `user_business_plans` table via a new migration.
- When this flag is `true`, the plan's quantity and revenue targets are treated as zero, and the breakdown tabs (Products, Retailers, etc.) are hidden.

### 2. Update the Create Plan dialog in `UserFYPlanTarget.tsx`
- Add a "No Target" checkbox/toggle at the top of the create plan form.
- When "No Target" is checked, disable/hide the quantity target, revenue target, and unit fields.
- Save the plan with `has_no_target: true`, `quantity_target: 0`, `revenue_target: 0`.

### 3. Update the Plan Overview display in `UserFYPlanTarget.tsx`
- When a selected plan has `has_no_target === true`, show a distinct "No Target" badge/banner instead of the editable quantity/revenue fields and breakdown tabs.
- Display a card with a message like "No target has been assigned for this FY" with an option to convert it to a regular target (set `has_no_target: false` and open edit).

### 4. Update Edit Plan dialog
- Include the same "No Target" toggle in the edit dialog so admins/managers can switch a plan to/from "No Target" mode.

### 5. Update `MyTargets.tsx` (period-based view)
- When a user has no target for the selected period, show a friendly "No Target Assigned" state instead of the generic "No targets set" message — differentiating between "not configured" vs "explicitly no target."

### 6. Update Hierarchy Allocation (`HierarchyAllocationTab` / `AdminSetTarget`)
- When viewing a user marked as "No Target," show a badge indicating this status so admins know it's intentional.

## Files to Modify
- **New migration**: Add `has_no_target` boolean column to `user_business_plans`
- **`src/components/profile/UserFYPlanTarget.tsx`**: Add toggle in create/edit dialogs, conditional rendering for no-target plans
- **`src/integrations/supabase/types.ts`**: Update the `user_business_plans` type to include `has_no_target`
- **`src/pages/MyTargets.tsx`**: Update empty state messaging

