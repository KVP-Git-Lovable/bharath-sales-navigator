
## Why Gamification, Packing List, and Deliveries Are Missing

The permissions are correctly seeded in the database. The issue is that these 3 modules have **additional conditional gates** in the Navbar code that run BEFORE the permission check:

### Root Causes

**1. Gamification / Leaderboard**
- In `Navbar.tsx` (line 99): Only added to the nav list if `isGamificationActive` is `true`
- `isGamificationActive` comes from `useActivePerformanceModule` hook, which reads the `performance_module_config` table
- That table is **empty** (0 rows), so `active_module` defaults to `'none'`, making `isGamificationActive = false`
- The item never gets added to the list, so the permission check never runs

**2. Packing List**
- In `Navbar.tsx` (line 104): Only added if `isPackingListEnabled` is `true`
- `isPackingListEnabled` comes from `useD1Delivery` hook, which checks `feature_flags` for `packing_list_module`
- No row exists in `feature_flags` for `packing_list_module`, so it defaults to disabled

**3. Deliveries**
- In `Navbar.tsx` (line 109): Only added if `isDeliveryAgentEnabled || isPackingListEnabled`
- No row exists in `feature_flags` for `delivery_agent_app` either

### Fix: Insert Missing Configuration Rows

**Database migration** to insert:

1. A row in `performance_module_config` with `active_module = 'gamification'` (or `'both'` if you also want Target vs Actual)
2. A row in `feature_flags` for `packing_list_module` with `is_enabled = true`
3. A row in `feature_flags` for `delivery_agent_app` with `is_enabled = true`

### Technical Details

**File**: 1 new database migration

```text
-- Enable gamification module
INSERT INTO performance_module_config (active_module)
VALUES ('both')
ON CONFLICT (id) DO UPDATE SET active_module = 'both';

-- Enable packing list module
INSERT INTO feature_flags (feature_key, is_enabled)
VALUES ('packing_list_module', true)
ON CONFLICT (feature_key) DO UPDATE SET is_enabled = true;

-- Enable delivery agent app
INSERT INTO feature_flags (feature_key, is_enabled)
VALUES ('delivery_agent_app', true)
ON CONFLICT (feature_key) DO UPDATE SET is_enabled = true;
```

No frontend code changes are needed. The hooks already read from these tables correctly -- they just need the data to exist.
