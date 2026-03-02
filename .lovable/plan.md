

## Fix: Infinite Re-render Loop Blocking My Visits Page

### Problem
The My Visits page is stuck showing "Loading visits..." and never displays the retailers from the assigned beat. The browser console shows **"Maximum update depth exceeded"** — an infinite re-render loop that blocks the entire page.

### Root Cause
In `useNavCustomization.ts`, the `useEffect` (line 36) has `defaultItems` as a dependency. When there is no stored customization, it calls `setCustomization(...)` which triggers a Navbar re-render. If the `navigationItems` array in Navbar.tsx gets a new reference during that render cycle (because `isNavItemEnabled`, `t`, or other dependencies are still settling during initial load), it re-triggers the effect, creating an infinite loop.

This loop consumes all React update cycles, preventing the MyVisits page (and its data-loading hooks) from ever completing.

### Fix

**File: `src/hooks/useNavCustomization.ts`**

Stabilize the `useEffect` dependency on `defaultItems` by comparing only the IDs (a primitive value) instead of the full array reference:

- Extract `defaultItems.map(item => item.id).join(',')` into a stable string
- Use that string as the effect dependency instead of the `defaultItems` array
- Inside the effect, reference `defaultItems` via a ref to avoid stale closures

This breaks the infinite loop because the dependency only changes when the actual set of nav item IDs changes, not when the array reference changes.

### Expected Result
- The infinite re-render loop stops
- My Visits page loads normally and displays all retailers from the planned beat (Nagasaki with 4 retailers)
- Navigation menu continues to work correctly with customization
