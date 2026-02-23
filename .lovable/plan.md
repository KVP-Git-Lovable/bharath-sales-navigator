

## Add "License Details" Section to Status Dashboard

### What
A new card section titled **License Details** placed between the metrics grid / auto-refresh text and the Activity Logging section. It shows counts of **Retailers**, **Orders**, and **Visits** created in the selected period, with a dropdown to switch between "This Month" and "Last Month".

### Layout

```text
+------------------------------------------------------------------+
| License Details                                                    |
|                                                                    |
| Current license plan:                    [ This Month v ]          |
|                                                                    |
|   +-----------+   +-----------+   +-----------+                    |
|   | Retailers |   |  Orders   |   |  Visits   |                    |
|   |    142    |   |    87     |   |   310     |                    |
|   +-----------+   +-----------+   +-----------+                    |
+------------------------------------------------------------------+
```

### New Component

**File: `src/components/status/LicenseDetailsSection.tsx`**

- State: `period` ("this_month" | "last_month"), `loading`, `counts` ({ retailers, orders, visits })
- On mount and period change, queries Supabase:
  - `retailers` table: `COUNT(*)` where `created_at` is within the date range
  - `orders` table: `COUNT(*)` where `created_at` is within the date range
  - `visits` table: `COUNT(*)` where `created_at` is within the date range
- Date range calculation:
  - **This Month**: 1st of current month at midnight to now
  - **Last Month**: 1st of previous month to last day of previous month (end of day)
- Uses `Select` from `@radix-ui/react-select` (already in the project) for the dropdown
- Card style matches existing cards: `bg-white/95 backdrop-blur-sm border-white/20 shadow-lg`
- Three stat boxes in a 3-column grid, each showing the label and bold count

### StatusDashboard.tsx Change

Insert the new `<LicenseDetailsSection />` between the auto-refresh text (line 297) and the Activity Logging section (line 299):

```text
<p className="text-xs text-white/40 ...">Auto-refreshes every 15 minutes</p>

<!-- NEW: License Details -->
<div className="mt-6">
  <LicenseDetailsSection />
</div>

<!-- Existing: Activity Logging -->
<div className="mt-6">
  <ActivityLoggingSection />
</div>
```

### Technical Details

- Queries use `.select('id', { count: 'exact', head: true })` for efficient counting without fetching rows
- Date math uses local timezone helpers from `src/utils/dateUtils.ts`
- The dropdown has a solid white background (`bg-white`) with high z-index to avoid transparency issues
- No database migrations needed -- reads existing `retailers`, `orders`, and `visits` tables
- The component is self-contained with its own data fetching, keeping StatusDashboard clean

