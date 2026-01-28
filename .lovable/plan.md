
# Fix for Points Display Issue

## Problem Analysis

The current implementation has a bug where `myPoints.total` is being overwritten to store the "Available to Redeem" balance instead of the actual total earned points. This causes confusion:

| Field | Current Behavior | Expected Behavior |
|-------|------------------|-------------------|
| "My Points" (with filter) | Shows filtered points correctly (15 today) | ✅ Correct |
| "Total" label | Shows 0 (because total was overwritten with available balance) | Should show 1674 (lifetime earned) |
| "Available to Redeem" | Shows 0 (after redemptions exceeded earnings) | Shows 0 ✅ (mathematically correct since 1674 earned - 1800 redeemed = -126 → 0) |

### Root Cause
In `fetchMyPoints()`, line 254-255 modifies `points.total` to subtract redeemed points:
```typescript
points.total = Math.max(0, points.total - totalRedeemedPoints);
```

This overwrites the actual total with the available balance, making the "Total: 0" display misleading.

## Solution

1. **Add a new state variable** `availableToRedeem` to track the redeemable balance separately
2. **Keep `myPoints.total`** as the true total of all points ever earned
3. **Update the UI** to display:
   - "Total: X" → `myPoints.total` (lifetime earned)
   - "Available to Redeem: Y" → `availableToRedeem` (earned - redeemed)
4. **Update redemption validation** to use `availableToRedeem` instead of `myPoints.total`

## File Changes

### src/pages/Leaderboard.tsx

#### 1. Add new state variable (around line 69)
```typescript
const [availableToRedeem, setAvailableToRedeem] = useState(0);
```

#### 2. Update fetchMyPoints function (lines 208-259)
- Calculate `points.total` as the sum of all earned points (do NOT subtract redemptions)
- Calculate `availableBalance = Math.max(0, points.total - totalRedeemedPoints)`
- Call `setAvailableToRedeem(availableBalance)`
- Call `setMyPoints(points)` with the unmodified total

#### 3. Update "Available to Redeem" card display (line 558)
Change from:
```tsx
<p className="text-2xl font-bold">{myPoints.total}</p>
```
To:
```tsx
<p className="text-2xl font-bold">{availableToRedeem}</p>
```

#### 4. Update redemption validation (line 362)
Change from:
```typescript
if (points > myPoints.total) {
```
To:
```typescript
if (points > availableToRedeem) {
```

## Expected Results After Fix

For the current user with:
- Total earned: 1674 points
- Total redeemed: 1800 points

| Field | Value |
|-------|-------|
| "My Points" (Today) | 15 |
| "Total" | 1,674 |
| "Available to Redeem" | 0 |

This makes it clear that the user has earned 1,674 points lifetime, but has 0 available because they've redeemed more than their balance (which was possible due to admin approval of redemptions exceeding the balance).
