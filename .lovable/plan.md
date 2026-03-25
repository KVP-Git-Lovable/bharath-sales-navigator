
# Atomic Order Cancellation — IMPLEMENTED

## Status: ✅ Complete

## What was done

### Migration (deployed)
- **`credit_ledger` table** — immutable ledger for credit transactions with incremental trigger
- **`order_cancellation_log` table** — audit trail for all cancellations
- **`visits.completion_source`** — tracks why a visit became productive
- **`cancel_order_atomic` RPC** — single transaction handling all 14 reversal steps
- **`credit_ledger_sync_pending_amount` trigger** — incremental pending_amount sync

### Frontend changes
- **`src/utils/orderCancellation.ts`** — replaced 12-step orchestrator with single RPC call
- **`src/pages/Analytics.tsx`** — added `.eq('status', 'confirmed')` to leaderboard query
- **`src/pages/TerritoryDetail.tsx`** — added `.eq('status', 'confirmed')` to territory orders
- **`src/pages/Attendance.tsx`** — added `.eq('status', 'confirmed')` to visit orders

### Key design decisions
1. Gamification reversal by `order_id` reference (with legacy fallback)
2. Credit ledger uses incremental `+= amount` (not SUM recalc)
3. Visit reversion only when `completion_source = 'order'`
4. No DELETEs on sequences/tracking — decrement with `GREATEST(0, ...)`
