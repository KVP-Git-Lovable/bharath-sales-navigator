

## Final Development Plan: Self-Healing Policy System with Error Handling & Observability

### Overview

Transform 3 singleton policy hooks and their UI components into a production-grade, self-healing system that works in any environment (fresh, remixed, or existing).

---

### Step 1: Create Utility — `logPolicyError` helper + default configs

**New file: `src/utils/policyDefaults.ts`**

- Export default config objects for all 3 policy tables (reused by hooks and seed migration)
- Export `logPolicyError(context, error)` structured logging helper using `devError` pattern
- Export `PolicyResult<T>` type: `{ data: T | null, error: PostgrestError | null, isFallback: boolean }`

---

### Step 2: Update 3 Hooks — Self-healing with structured responses

**Modify: `src/hooks/useGlobalLeavePolicy.ts`**
**Modify: `src/hooks/useAutoEndDayPolicy.ts`**
**Modify: `src/hooks/useRegularizationPolicy.ts`**

Each hook's `queryFn` changes to:

1. `.maybeSingle()` instead of `.single()`
2. If data exists → return `{ data, error: null, isFallback: false }`
3. If null → auto-seed via `.insert()` with defaults from Step 1
4. If insert fails (RLS) → **retry fetch** (handles race condition where another request already inserted) → return `{ data: retryData, error: insertError, isFallback: true }`
5. If everything fails → return `{ data: null, error, isFallback: true }` — **no throw, no crash**

The hook return type becomes `PolicyResult<T>` so consuming components know whether data came from a fallback path.

Also update `useEffectiveLeavePolicy` to handle the new structured response shape.

---

### Step 3: Update 3 UI Components — 5-state rendering

**Modify: `src/components/attendance/RegularizationPolicyConfig.tsx`**
**Modify: `src/components/attendance/AutoEndDayPolicyConfig.tsx`**
**Modify: `src/components/attendance/LeavePolicyConfig.tsx`**

Each component handles 5 states:

| State | Condition | UI |
|-------|-----------|-----|
| Loading | `isLoading` | Spinner (existing) |
| Critical Error | `error && !data` | Alert card: "Unable to load policy. Please try again or contact admin." |
| Fallback Warning | `isFallback && data` | Yellow banner: "Default config loaded. Check permissions if saving fails." + toast.warning |
| Empty | `!data && !error` | Info card: "No policy configured yet. Click Save to create one." |
| Success | `data` exists | Normal form (existing) |

Add toast notifications:
- `toast.error()` on critical failures
- `toast.warning()` on fallback/permission issues

---

### Step 4: Database Migration — Singleton constraints + seed data

**New migration:**

```sql
-- Singleton constraints (only 1 row ever)
CREATE UNIQUE INDEX IF NOT EXISTS one_row_global_leave 
  ON global_leave_policy ((true));
CREATE UNIQUE INDEX IF NOT EXISTS one_row_auto_end_day 
  ON auto_end_day_policy ((true));
CREATE UNIQUE INDEX IF NOT EXISTS one_row_regularization 
  ON regularization_policy ((true));

-- Seed defaults (safe to re-run)
INSERT INTO global_leave_policy (is_enabled, reset_cycle, ...)
  VALUES (true, 'calendar_year', ...)
  ON CONFLICT DO NOTHING;

INSERT INTO auto_end_day_policy (is_enabled, auto_close_time, timezone, ...)
  VALUES (false, '22:00:00', 'Asia/Kolkata', ...)
  ON CONFLICT DO NOTHING;

INSERT INTO regularization_policy (is_enabled, daily_limit, approval_mode, ...)
  VALUES (true, 1, 'manager', ...)
  ON CONFLICT DO NOTHING;
```

---

### Files Changed Summary

| File | Change |
|------|--------|
| `src/utils/policyDefaults.ts` | **NEW** — defaults, types, logging helper |
| `src/hooks/useGlobalLeavePolicy.ts` | `.maybeSingle()` + auto-seed + structured response |
| `src/hooks/useAutoEndDayPolicy.ts` | `.maybeSingle()` + auto-seed + structured response |
| `src/hooks/useRegularizationPolicy.ts` | `.maybeSingle()` + auto-seed + structured response |
| `src/components/attendance/LeavePolicyConfig.tsx` | 5-state rendering + toasts |
| `src/components/attendance/AutoEndDayPolicyConfig.tsx` | 5-state rendering + toasts |
| `src/components/attendance/RegularizationPolicyConfig.tsx` | 5-state rendering + toasts |
| 1 database migration | Singleton indexes + seed data |

**Total: 1 new file + 6 modified files + 1 migration**

### Result

- Never crashes on empty DB
- Never silently fails
- Self-heals missing config rows
- Race-condition safe (retry after failed insert)
- RLS-failure safe (graceful fallback, no throw)
- Clear UI states for every scenario
- Structured logging for debugging
- Singleton constraints at DB level prevent duplicates
- Works in fresh, remixed, and existing environments

