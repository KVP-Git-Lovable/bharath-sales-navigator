

# Fix: "Add Team (Manager)" Selector Should Only Show Managers

## Problem
Both `+ Add User` and `+ Add Team (Manager)` use the same `ProfileSelector` component, which fetches all profiles via `get_profiles_for_selector`. There is no filtering for managers — so both dropdowns show identical lists.

## The Difference (Intent)
- **Add User**: Sets a custom TA/DA for one specific person. Saved to `user_expense_config`.
- **Add Team (Manager)**: Sets a custom TA/DA for an entire team by selecting their manager. All subordinates under that manager inherit the value. Saved to `team_expense_config`.

## Fix

### 1. Create a new RPC or query to fetch only managers
Query the `employees` table to find users who appear as `manager_id` for at least one other employee. This gives us the list of actual managers.

Option: Add a `ManagerSelector` variant of `ProfileSelector` that fetches profiles filtered to only those whose `id` exists in `employees.manager_id`.

### 2. Update `ProfileSelector` to accept a `managersOnly` prop
- When `managersOnly` is true, fetch profiles joined/filtered against the `employees` table where the profile's `id` matches at least one `manager_id` entry.
- Query: select profiles where `id IN (SELECT DISTINCT manager_id FROM employees WHERE manager_id IS NOT NULL)`.

### 3. Update the OverrideTable in `ExpensePolicyConfig.tsx`
Pass `managersOnly={true}` to the second `ProfileSelector` (the "Add Team" one). The first one stays as-is.

## Files Changed
- `src/components/expenses/ExpensePolicyConfig.tsx` — add `managersOnly` prop to `ProfileSelector`, update the query logic, pass it for the Team selector.

