
# Target Configuration Stepped Workflow Implementation

## Problem Statement

Currently, after saving the Target Configuration with selected parameters (Quantity/Revenue/Visits + Product/Retailer/Beat etc.), there is no guided workflow to:
1. Set the FY-wide quantity/revenue targets first
2. Then apply those targets to users with all the selected parameter breakdowns

The user expects a stepped experience where configuration flows into target setting.

## Proposed Solution

Transform the Target Config tab into a **multi-step wizard** that guides the admin through:

```text
┌────────────────────────────────────────────────────────────────────────────┐
│                    Target Configuration Wizard                              │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Progress: [ Step 1 ] ──► [ Step 2 ] ──► [ Step 3 ]                        │
│            Configure     Set Targets    Apply to Users                      │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ STEP 1: CONFIGURATION (Current UI)                                    │  │
│  │ - Target Basis: ☑ Quantity ☑ Revenue ☐ Visits                        │  │
│  │ - Parameters: ☑ Product ☑ Retailer ☑ Beat ☑ Distributor              │  │
│  │ - Quantity Unit: Kg                                                   │  │
│  │                                        [ Save & Continue → ]          │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ STEP 2: SET FY TARGETS (NEW)                                          │  │
│  │ Set the company-wide targets for FY 2025-26                           │  │
│  │                                                                        │  │
│  │ Quantity Target: [________] Kg                                         │  │
│  │ Revenue Target:  ₹ [________]                                         │  │
│  │ Visits Target:   [________] (if enabled)                              │  │
│  │                                                                        │  │
│  │                 [ ← Back ]  [ Save & Continue → ]                     │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ STEP 3: APPLY TO USERS (NEW)                                          │  │
│  │ Allocate targets to users with parameter breakdowns                   │  │
│  │                                                                        │  │
│  │ ┌─────────────────────────────────────────────────────────────────┐   │  │
│  │ │ Allocation Method: (•) Individual  ( ) Hierarchy Cascade        │   │  │
│  │ └─────────────────────────────────────────────────────────────────┘   │  │
│  │                                                                        │  │
│  │ Select Users → Set breakdown by enabled parameters                    │  │
│  │ [Product-wise] [Retailer-wise] [Beat-wise] [Month-wise]              │  │
│  │                                                                        │  │
│  │                 [ ← Back ]  [ Apply Targets ]                         │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

## Implementation Details

### 1. Enhanced TargetConfigTab with Wizard Steps

Transform `TargetConfigTab.tsx` from a simple form into a stepped wizard component:

**Step 1 - Configure** (Existing UI Enhanced):
- Target Basis checkboxes (Quantity, Revenue, Visits)
- Parameter checkboxes (Product, Retailer, Beat, Distributor, Territory, Monthly)
- Quantity Unit selector
- "Save & Continue" button to move to Step 2

**Step 2 - Set FY Targets** (New):
- Input for total Quantity Target (uses configured unit)
- Input for total Revenue Target (₹)
- Input for Visits Target (only shown if enabled in Step 1)
- Shows summary of what will be tracked
- "Back" and "Save & Continue" buttons

**Step 3 - Apply to Users** (New):
- User selection interface (Single/Multiple/All Team)
- For each selected user, show parameter breakdown tabs
- Only show tabs for enabled parameters (e.g., if Beat is disabled, don't show Beat tab)
- Reuse existing `UserFYPlanTarget` logic but filtered by config
- "Back" and "Apply Targets" buttons

### 2. Database Changes

Add columns to `fy_target_config` to store FY-wide targets:

```sql
ALTER TABLE fy_target_config 
ADD COLUMN IF NOT EXISTS total_quantity_target NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_revenue_target NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_visits_target INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS setup_completed BOOLEAN DEFAULT false;
```

### 3. Component Structure

```text
TargetConfigTab.tsx (Refactored)
├── WizardProgress (Step indicator)
├── Step 1: ConfigurationStep
│   └── (existing checkboxes + unit selector)
├── Step 2: SetTargetsStep (NEW)
│   └── FY target inputs based on enabled basis
└── Step 3: ApplyToUsersStep (NEW)
    ├── UserSelector (reuse from TopControlBar)
    └── FilteredUserFYPlanTarget (only show enabled parameter tabs)
```

### 4. Key Changes to UserFYPlanTarget

Create a wrapper or pass props to `UserFYPlanTarget` to:
- Only show tabs for parameters enabled in config
- Pre-populate FY targets from config
- Lock certain fields if they come from hierarchy

**Props to add:**
```typescript
interface UserFYPlanTargetProps {
  targetUserId?: string;
  enabledParameters?: {
    product: boolean;
    retailer: boolean;
    beat: boolean;
    distributor: boolean;
    territory: boolean;
    monthly: boolean;
  };
  fyConfig?: {
    quantityTarget: number;
    revenueTarget: number;
    quantityUnit: string;
  };
}
```

### 5. User Flow

1. **Admin opens Target Config tab** → Sees Step 1 (Configuration)
2. **Selects parameters & saves** → Moves to Step 2 (Set Targets)
3. **Enters FY targets & saves** → Moves to Step 3 (Apply to Users)
4. **Selects users & breaks down targets** → Applies targets
5. **"View Dashboard"** button appears to see results

If config already exists and is complete, show a summary view with "Edit Configuration" option.

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/admin/TargetConfigTab.tsx` | Major refactor - add wizard steps, state machine |
| `src/components/profile/UserFYPlanTarget.tsx` | Add enabledParameters prop to filter tabs |
| `supabase/migrations/...` | Add total target columns to fy_target_config |

## New Components

| Component | Purpose |
|-----------|---------|
| `WizardProgress.tsx` | Step indicator showing 1-2-3 progress |
| `SetTargetsStep.tsx` | Step 2 - FY target input form |
| `ApplyToUsersStep.tsx` | Step 3 - User selection + filtered breakdown |

## Visual Flow Summary

```text
Step 1: Configure           Step 2: Set Targets         Step 3: Apply to Users
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│ ☑ Quantity          │     │ Quantity: 50000 Kg  │     │ User: [Girish ▼]    │
│ ☑ Revenue           │ ──► │ Revenue: ₹25,00,000 │ ──► │ [Products][Beats]   │
│ ☐ Visits            │     │                     │     │ [Months]...         │
│ ☑ Product ☑ Beat    │     │ (Visits hidden -    │     │ (Only enabled tabs) │
│ ☑ Retailer ☐ Terr   │     │  not enabled)       │     │                     │
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘
         │                           │                           │
    [ Save & Next ]           [ Save & Next ]            [ Apply Targets ]
```

## Technical Notes

- Use React state to track current step (1, 2, or 3)
- Save partial progress at each step to database
- Show "✓ Configured" badge if config exists
- Allow going back to previous steps
- Validate totals before applying to users
- The existing `AssignTargetsTab` can remain as an alternative advanced interface
- This wizard provides a guided experience for first-time setup

## Phase Approach

This implementation covers the admin-only Phase 1 scope:
- No supervisor/user role checks
- No hierarchy enforcement
- Manual application to selected users
- All functionality under Target Config tab
