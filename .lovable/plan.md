

## Remove the "Storage Size" Card from Status Dashboard

### What Changes

**File: `src/pages/StatusDashboard.tsx`**

Remove the 6th metric card (Storage Size) from the `setMetrics` array inside `fetchMetrics`. This card is a duplicate of the first "Database Size" card — both use `m.db_size_bytes` and show the same value.

The metrics grid will go from 6 cards to 5. The grid layout (`grid-cols-2 md:grid-cols-3 lg:grid-cols-6`) will be updated to `lg:grid-cols-5` so the 5 cards display evenly on large screens.

### Lines Affected

- Remove the last object in the `setMetrics([...])` array (the one with `label: 'Storage Size'` and `icon: <Server>`)
- Update the grid class from `lg:grid-cols-6` to `lg:grid-cols-5`
- Remove the unused `Server` icon import from lucide-react

