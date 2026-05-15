## Goal

In the "Apply: Per Unit discount" dialog, let the user enter a **different discount value for each selected product** inline (next to that product row), instead of one shared "Discount per unit" field that applies the same amount to all selected lines.

Each product row in the cart list will have its own small numeric input (capped at the scheme's max) so the user can give, e.g. ₹40 off ADUKU, ₹25 off ADARAK, ₹10 off BLUE — all in one Apply.

## UX changes (`ManualPerUnitApplyDialog.tsx`)

1. Remove the single shared "Discount per unit · max ₹40" input at the bottom.
2. For each eligible cart line:
   - Keep the checkbox + product name + qty/rate.
   - Add a compact inline input on the right (width ~80px, h-7, text-xs) with `₹` / `%` suffix, placeholder `0–40`, capped at `scheme.max_discount_per_unit`.
   - Input is enabled only when the row is checked; disabled + greyed when unchecked.
   - Auto-clamps to `[0, cap]` on change.
3. Preview block recalculates as: `Σ (perUnitForLine × qty)` across selected lines, listing each line's contribution briefly (e.g. "ADUKU 8×₹40 = ₹320").
4. Apply button enabled when at least one selected line has a discount > 0.
5. "Select all / Clear all" preserved. When a line is unchecked, its entered value is kept in local state but ignored in the calculation (re-checking restores it).

## Data shape changes (`schemeEngine.ts`)

Extend `ManualSchemeSelection`:

```ts
export interface ManualSchemeSelection {
  itemId: string;                 // legacy, = first id
  itemIds?: string[];             // selected line ids
  perUnitDiscount: number;        // legacy single value (= max of perItem, for back-compat reads)
  perItemDiscounts?: Record<string, number>; // NEW: line id -> per-unit discount
  valueType: 'amount' | 'percentage';
}
```

In the `manual_per_unit_discount` case:
- For each id in `selectedIds`, read `perItemDiscounts[id]` (fallback to legacy `perUnitDiscount` if absent — keeps already-saved selections working).
- Skip lines where the per-unit value is 0.
- Apply each line's own per-unit value (clamped to cap) × quantity.
- `manualMeta` summary becomes: "3 products, ₹375 total off" (sum across lines).

## Caller (`OrderEntrySchemesModal.tsx`)

No interface break: it already forwards the `ManualSchemeSelection` object. Toast continues to show "Applied to N products". No other changes.

## Files touched

- `src/components/ManualPerUnitApplyDialog.tsx` — UI rework (per-row input, removed shared input, updated preview).
- `src/utils/schemeEngine.ts` — extend `ManualSchemeSelection`, use per-line values in the manual loop.
- `src/components/OrderEntrySchemesModal.tsx` — only if toast/summary text needs updating to reflect per-line totals (minor).

## Untouched

- DB schema, scheme master, other scheme types (percentage/flat/bundle/tiered/BOGO), cap enforcement, eligibility filtering, min-qty rule.
