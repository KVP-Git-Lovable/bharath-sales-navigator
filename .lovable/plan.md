

# Plan: Group Duplicate Pincodes by Territory Name

## Problem
When a pincode has multiple territory names, it appears as separate rows, each with its own "View Retailers" button. This is redundant.

## Solution
After fetching pincode data, group rows by pincode on the frontend using a `useMemo`. Each grouped entry will have one pincode and an array of territory names.

### Changes in `src/components/admin/PincodeMasterLookup.tsx`

1. **Add a `useMemo`** to group `pincodes` by pincode value:
```ts
const groupedPincodes = useMemo(() => {
  const map = new Map<string, string[]>();
  pincodes.forEach(item => {
    const territories = map.get(item.pincode) || [];
    if (item.territory_po && !territories.includes(item.territory_po)) {
      territories.push(item.territory_po);
    }
    map.set(item.pincode, territories);
  });
  return Array.from(map.entries()).map(([pincode, territories]) => ({ pincode, territories }));
}, [pincodes]);
```

2. **Update the rendering loop** to iterate over `groupedPincodes` instead of `pincodes`. The territory name column will render all matching territories stacked vertically (one per line) instead of a single value.

3. **Update the result count** to use `groupedPincodes.length`.

No other files or database changes needed.

