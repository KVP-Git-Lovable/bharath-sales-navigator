# Plan

## What I found
- The Sardar order for **Virdvinyak stores** on **May 15, 12:18 PM** is present in `orders`.
- Order ID: `80f0b50c-ba57-4641-b878-4c98d0c44abc`
- It currently has **0 linked `order_items`**.
- There are **2 orphan `order_items`** created **2 seconds later** with totals:
  - `DAKSHIN 250G` → ₹628.56
  - `ELACHI 250G` → ₹628.58
- Their combined total is **₹1,257.14**, which matches the order `subtotal` exactly.
- So this is a **backfill/linking issue**, not a frontend analytics bug.

## Proposed implementation
1. Add a **targeted migration** that links only these 2 orphan `order_items` to order `80f0b50c-ba57-4641-b878-4c98d0c44abc`.
2. Keep the update safe by touching only rows where:
   - `order_id IS NULL`
   - `created_at = 2026-05-15 06:48:13.341327+00`
   - item total matches the known orphan bucket for this order
3. Re-check the database after migration to confirm:
   - the order now has **2 linked items**
   - item total still matches the order subtotal
   - this order should then stop showing `0 items` in Analytics / VisitCard.

## Technical details
- The UI path already reads `orders` with nested `order_items(*)` in `VisitCard.tsx`, so no frontend code change is needed.
- This is the same class of issue as the earlier orphan-row cases, but this one is even cleaner because the orphan bucket is only 2 seconds away and subtotal matches exactly.
- I will use a migration instead of ad-hoc editing so the change is tracked and repeatable.

## Expected result
- Sardar’s Virdvinyak order should show **2 items** instead of **0 items**.
- Invoice linkage based on order items should also behave normally for this order.