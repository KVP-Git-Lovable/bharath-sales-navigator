
## Remove Duplicate Week-Off Configuration from Attendance Policy

### Problem
The Attendance Policy page has two sub-tabs: "Leave Entitlements" and "Week-Off Configuration". The Week-Off Configuration is redundant because it already exists under the **Working Days** configuration tab (which uses it for calculating working days). Having it in two places is confusing.

### Changes

**File: `src/components/attendance/AttendancePolicyConfig.tsx`**

1. Remove the `WeekOffConfig` interface, `dayNames`, `alternatePatterns` constants, and `weekOffConfig` state.
2. Remove the `week_off_config` fetch from `fetchData()` and related `setWeekOffConfig` calls.
3. Remove the `handleWeekOffChange` function entirely.
4. Remove the Tabs wrapper (since only "Leave Entitlements" remains, no need for tabs at all) -- render the Leave Entitlements card directly.
5. Remove the "Week-Off Configuration" `TabsContent` block (lines 319-370).
6. Clean up unused imports (`Calendar`, `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger`, `Select`-related imports if only used by week-off, and `activeSubTab` state).

The result: Attendance Policy page shows only the Leave Entitlements configuration, with no tabs needed. Week-off configuration remains accessible solely under the **Working Days** tab where it belongs.
