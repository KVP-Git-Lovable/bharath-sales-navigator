
# Multi-Period Target Plan Implementation

## Overview
This implementation adds Monthly, Quarterly, and Bi-Annual target plans to the existing Annual FY target system. All periods will be interlinked with proper roll-up logic ensuring data consistency across dashboards and reports.

---

## Current State Analysis

### Existing Tables
| Table | Purpose |
|-------|---------|
| `fy_target_config` | FY-level configuration (metrics, parameters, totals) |
| `user_business_plans` | User annual targets with `year` field |
| `user_business_plan_months` | Monthly breakdown (1-12) of annual targets |

### What's Already Working
- Annual target configuration in Target Management
- Monthly breakdown in user's "My Target" page
- Dashboard filters for day/week/month/quarter/year (calculates targets proportionally)

### Gaps to Fill
1. No period type selector at FY configuration level
2. Quarterly and Bi-Annual targets are calculated (not stored)
3. No explicit roll-up validation between periods
4. Hierarchy allocation only works at FY-total level

---

## Implementation Strategy

### Approach: Enhanced Period Configuration
Rather than creating new tables, we'll enhance the existing schema to support explicit period targets while maintaining backward compatibility.

---

## Phase 1: Database Schema Changes

### 1.1 Modify `fy_target_config` Table
Add a new column to specify the target entry granularity:

```sql
ALTER TABLE fy_target_config 
ADD COLUMN target_period_type TEXT DEFAULT 'annual' 
CHECK (target_period_type IN ('annual', 'biannual', 'quarterly', 'monthly'));
```

### 1.2 Create `fy_period_targets` Table
Store period-specific targets for non-annual configurations:

```sql
CREATE TABLE fy_period_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fy_config_id UUID REFERENCES fy_target_config(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('biannual', 'quarterly', 'monthly')),
  period_number INTEGER NOT NULL,
  period_name TEXT NOT NULL,
  quantity_target NUMERIC DEFAULT 0,
  revenue_target NUMERIC DEFAULT 0,
  visits_target INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(fy_config_id, period_type, period_number)
);
```

**Period Mapping:**
| Period Type | period_number | period_name |
|-------------|---------------|-------------|
| biannual    | 1             | H1 (Apr-Sep) |
| biannual    | 2             | H2 (Oct-Mar) |
| quarterly   | 1             | Q1 (Apr-Jun) |
| quarterly   | 2             | Q2 (Jul-Sep) |
| quarterly   | 3             | Q3 (Oct-Dec) |
| quarterly   | 4             | Q4 (Jan-Mar) |
| monthly     | 1-12          | April-March |

### 1.3 Create `user_period_allocations` Table
Store period-specific allocations for hierarchy cascade:

```sql
CREATE TABLE user_period_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_plan_id UUID REFERENCES user_business_plans(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL,
  period_number INTEGER NOT NULL,
  quantity_target NUMERIC DEFAULT 0,
  revenue_target NUMERIC DEFAULT 0,
  visits_target INTEGER DEFAULT 0,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'rollup', 'hierarchy')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_plan_id, period_type, period_number)
);
```

---

## Phase 2: Roll-up Logic

### Period Hierarchy

```text
Annual (FY Total)
    |
    +-- H1 (Apr-Sep)                    H2 (Oct-Mar)
        |                               |
        +-- Q1 (Apr-Jun)  Q2 (Jul-Sep) Q3 (Oct-Dec)  Q4 (Jan-Mar)
            |             |            |              |
            Apr May Jun   Jul Aug Sep  Oct Nov Dec    Jan Feb Mar
```

### Roll-up Rules (Database Trigger)
Create a trigger function that auto-calculates parent periods when child periods change:

```sql
CREATE OR REPLACE FUNCTION calculate_period_rollups()
RETURNS TRIGGER AS $$
BEGIN
  -- Monthly -> Quarterly
  IF NEW.period_type = 'monthly' THEN
    -- Update Q1 if months 1,2,3 changed
    -- Update Q2 if months 4,5,6 changed
    -- etc.
  END IF;
  
  -- Quarterly -> Bi-Annual
  IF NEW.period_type = 'quarterly' THEN
    -- Update H1 if Q1,Q2 changed
    -- Update H2 if Q3,Q4 changed
  END IF;
  
  -- Bi-Annual -> Annual
  IF NEW.period_type = 'biannual' THEN
    -- Update FY total in fy_target_config
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Phase 3: UI Components

### 3.1 Period Type Selector (New Component)
**File:** `src/components/admin/target-config/PeriodTypeSelector.tsx`

```text
+------------------------------------------------------------------+
|  Target Entry Level                                               |
|  ---------------------------------------------------------------- |
|  [ Annual ]  [ Bi-Annual ]  [ Quarterly ]  [ Monthly ]           |
|     ●                                                             |
|  ---------------------------------------------------------------- |
|  Select how granularly you want to define targets.               |
|  Finer granularity (Monthly) rolls up to coarser levels.         |
+------------------------------------------------------------------+
```

**Behavior:**
- **Annual**: Single FY total (current behavior)
- **Bi-Annual**: H1/H2 entry, auto-sum to Annual
- **Quarterly**: Q1-Q4 entry, auto-sum to H1/H2 and Annual
- **Monthly**: 12 months entry, auto-sum to Q, H, and Annual

### 3.2 Period Breakdown Grid (New Component)
**File:** `src/components/admin/target-config/PeriodBreakdownGrid.tsx`

**Bi-Annual View:**
```text
+----------------+---------------+---------------+---------------+
|                | Quantity (Kg) | Revenue (Rs)  | Visits        |
+----------------+---------------+---------------+---------------+
| H1 (Apr-Sep)   | [________]    | [________]    | [________]    |
| H2 (Oct-Mar)   | [________]    | [________]    | [________]    |
+----------------+---------------+---------------+---------------+
| FY Total       | 1,200         | 24,00,000     | 1,200         |
+----------------+---------------+---------------+---------------+
```

**Quarterly View:**
```text
+----------------+---------------+---------------+---------------+
|                | Quantity (Kg) | Revenue (Rs)  | Visits        |
+----------------+---------------+---------------+---------------+
| Q1 (Apr-Jun)   | [________]    | [________]    | [________]    |
| Q2 (Jul-Sep)   | [________]    | [________]    | [________]    |
+----------------+---------------+---------------+---------------+
| H1 Total       | 600           | 12,00,000     | 600           |
+----------------+---------------+---------------+---------------+
| Q3 (Oct-Dec)   | [________]    | [________]    | [________]    |
| Q4 (Jan-Mar)   | [________]    | [________]    | [________]    |
+----------------+---------------+---------------+---------------+
| H2 Total       | 600           | 12,00,000     | 600           |
+----------------+---------------+---------------+---------------+
| FY Total       | 1,200         | 24,00,000     | 1,200         |
+----------------+---------------+---------------+---------------+
```

**Monthly View:**
```text
+----------------+---------------+---------------+---------------+
|                | Quantity (Kg) | Revenue (Rs)  | Visits        |
+================+===============+===============+===============+
| April          | [________]    | [________]    | [________]    |
| May            | [________]    | [________]    | [________]    |
| June           | [________]    | [________]    | [________]    |
+----------------+---------------+---------------+---------------+
| Q1 Total       | 300           | 6,00,000      | 300           |
+----------------+---------------+---------------+---------------+
| July           | [________]    | [________]    | [________]    |
| ... (continues for all 12 months)
+----------------+---------------+---------------+---------------+
```

### 3.3 Modify TargetConfigTab.tsx
Add period type selector before FY Total Targets section:

```text
[Plan Name Input]
[Metrics Selection: Quantity | Revenue | Visits]
[Parameters Selection: Product | Retailer | Beat | etc.]
---NEW SECTION---
[Period Type Selector]
[Period Breakdown Grid] (shown only if not Annual)
[Equal Divide Checkbox] (divides FY total equally into selected periods)
-----------------
[FY Total Targets] (read-only when period type is not Annual)
```

### 3.4 Modify HierarchyAllocationTab.tsx
Add period filter for allocation:

```text
+------------------------------------------------------------------+
| Allocate Targets For:                                             |
| [Period: FY Total ▼] or [H1 ▼] or [Q1 ▼] or [April ▼]           |
+------------------------------------------------------------------+
| (AllocationTable shows targets for selected period only)         |
+------------------------------------------------------------------+
```

---

## Phase 4: Hooks and Data Layer

### 4.1 New Hook: `useTargetPeriods`
**File:** `src/hooks/useTargetPeriods.ts`

```typescript
interface TargetPeriod {
  id: string;
  periodType: 'annual' | 'biannual' | 'quarterly' | 'monthly';
  periodNumber: number;
  periodName: string;
  quantityTarget: number;
  revenueTarget: number;
  visitsTarget: number;
}

const { 
  periods, 
  isLoading, 
  updatePeriod, 
  applyEqualDistribution,
  recalculateRollups 
} = useTargetPeriods(fyConfigId);
```

### 4.2 Update `useTeamTargetProgress.ts`
Modify to fetch period-specific targets from `user_period_allocations` when available:

```typescript
// Current: Calculates quarterly as yearlyTarget / 4
// Updated: Fetches actual Q1-Q4 targets from user_period_allocations
```

---

## Phase 5: Integration Points

### 5.1 My Target Page (`UserFYPlanTarget.tsx`)
- Show period breakdown based on FY config's `target_period_type`
- Display read-only rollup totals for higher periods
- Monthly tab already exists - integrate with new data source

### 5.2 Dashboard (`TeamTargetDashboard.tsx`)
- Period selector already exists (day/week/month/quarter/year)
- Update data fetching to use `user_period_allocations` for accurate targets
- Show period-specific targets instead of calculated values

### 5.3 Hierarchy Allocation (`AllocationTable.tsx`)
- Add period filter dropdown
- Load/save allocations for selected period
- Validate that period allocations sum to parent period

---

## Files to Create

| File | Description |
|------|-------------|
| `src/components/admin/target-config/PeriodTypeSelector.tsx` | Period type toggle buttons |
| `src/components/admin/target-config/PeriodBreakdownGrid.tsx` | Period-wise target entry grid |
| `src/hooks/useTargetPeriods.ts` | Fetch and manage period targets |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/admin/TargetConfigTab.tsx` | Add period selector and breakdown grid |
| `src/components/admin/HierarchyAllocationTab.tsx` | Add period filter for allocation |
| `src/components/admin/AllocationTable.tsx` | Support period-specific allocation data |
| `src/hooks/useTeamTargetProgress.ts` | Fetch from `user_period_allocations` |
| `src/components/profile/UserFYPlanTarget.tsx` | Show period breakdown from hierarchy |

## Database Migration

```sql
-- 1. Add period type to FY config
ALTER TABLE fy_target_config 
ADD COLUMN target_period_type TEXT DEFAULT 'annual';

-- 2. Create period targets table
CREATE TABLE fy_period_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fy_config_id UUID REFERENCES fy_target_config(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL,
  period_number INTEGER NOT NULL,
  period_name TEXT NOT NULL,
  quantity_target NUMERIC DEFAULT 0,
  revenue_target NUMERIC DEFAULT 0,
  visits_target INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(fy_config_id, period_type, period_number)
);

-- 3. Create user period allocations table
CREATE TABLE user_period_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_plan_id UUID REFERENCES user_business_plans(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL,
  period_number INTEGER NOT NULL,
  quantity_target NUMERIC DEFAULT 0,
  revenue_target NUMERIC DEFAULT 0,
  visits_target INTEGER DEFAULT 0,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_plan_id, period_type, period_number)
);

-- 4. RLS Policies
ALTER TABLE fy_period_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_period_allocations ENABLE ROW LEVEL SECURITY;

-- Allow admins and system administrators full access
CREATE POLICY "Admins can manage period targets"
ON fy_period_targets FOR ALL
USING (public.is_system_admin(auth.uid()));

CREATE POLICY "Users can view their period allocations"
ON user_period_allocations FOR SELECT
USING (
  business_plan_id IN (
    SELECT id FROM user_business_plans WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage period allocations"
ON user_period_allocations FOR ALL
USING (public.is_system_admin(auth.uid()));
```

---

## Validation Checklist
- Monthly targets sum exactly to Quarterly totals
- Quarterly targets (Q1+Q2) sum to H1, (Q3+Q4) sum to H2
- H1 + H2 = Annual FY total
- Dashboard filters show correct stored targets for each period
- Hierarchy allocation supports period-specific assignment
- Existing `user_business_plan_months` data continues to work
- My Target page reflects hierarchy-assigned period targets
