

## Plan: Reorganize Attendance Management into Overview and Configuration Tabs

### What Changes

Replace the current flat 8-tab navigation with a **two-level tab structure**:

- **Top level**: Two prominent tabs -- "Overview" and "Configuration" -- using the Radix Tabs component already in the project.
- **Second level**: Context-specific sub-tabs rendered as the existing button-style row beneath the active top tab.

### Tab Grouping

**Overview** (default, opens to "Live Attendance"):
- Live Attendance Monitoring
- Leave Management (approve/reject requests)
- Regularization (approve/reject requests)
- Leave Balances

**Configuration**:
- Leave Types
- Holidays
- Working Days
- Attendance Policy

### Visual Layout

```text
+--------------------------------------------+
|  [ Overview ]  [ Configuration ]           |  <-- Radix Tabs (large, prominent)
+--------------------------------------------+
|  [Live] [Leave] [Regularization] [Balances]|  <-- sub-tabs (current button style)
+--------------------------------------------+
|                                            |
|           (content area)                   |
|                                            |
+--------------------------------------------+
```

### Technical Details

**Single file change: `src/pages/AttendanceManagement.tsx`**

1. Import `Tabs, TabsList, TabsTrigger, TabsContent` from `@/components/ui/tabs`.
2. Replace `activeTab` state with two states:
   - `topTab`: `'overview'` (default) or `'configuration'`
   - `subTab`: defaults to `'live'` for Overview, `'leave-types'` for Configuration
3. When switching top tabs, auto-select the first sub-tab of that group.
4. Render the top-level Radix Tabs above the existing sub-tab buttons.
5. Filter sub-tab buttons based on which top tab is active:
   - Overview shows: Live, Leave, Regularization, Leave Balances
   - Configuration shows: Leave Types, Holidays, Working Days, Attendance Policy
6. All existing content rendering stays the same -- just driven by `subTab` instead of `activeTab`.
7. No new components or files needed.

