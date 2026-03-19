# Scalable Target Management — Plan

## Status: ✅ Phase 1 & 2 Implemented | Phase 3 Pending

## Summary
Upgraded the target management system from a rigid lock-based model to a flexible plan-status-driven architecture with multi-plan support and a unified `target_breakdowns` table.

## What Was Done

### Phase 1: Database Migration ✅
- Added `plan_status` column (`draft` / `active` / `closed`) to `fy_target_config`
- Migrated existing data: `is_locked=true` → `active`, `is_locked=false` → `draft`
- Dropped unique constraint on `fy_year`, replaced with composite `(fy_year, target_plan_name)` to support multiple plans per FY
- Created `target_breakdowns` table for flexible multi-parameter target storage
- RLS enabled on `target_breakdowns`

### Phase 2: Hooks ✅
- Updated `useFYTargetConfig` to support optional `planId` parameter and `plan_status` field
- Created `useFYTargetPlans` hook to fetch all plans for a given FY year

### Phase 3: TargetConfigTab ✅
- Removed Lock/Unlock buttons and locked read-only view
- Added **Plan Selector** bar showing all plans for current FY with status icons + "New Plan" button
- Added **Status Badge** (Draft/Active/Closed) with color-coded indicators
- Replaced "Lock & Assign" with "Activate & Assign" button
- Active plans show warning: "Changes will affect allocated targets"
- Closed plans show read-only view with "Reopen as Draft" option
- `is_locked` is now auto-derived from `plan_status` for backward compatibility

### Phase 4: HierarchyAllocationTab ✅
- Replaced `is_locked` check with `plan_status` check
- Draft plans show "Please activate" message instead of "Configuration not locked"
- Active and Closed plans allow viewing allocations
- Accepts `selectedPlanId` prop for multi-plan support

### Phase 5: DistributionSummaryHeader + TargetSummaryCard ✅
- Replaced `isLocked` badge with status badge (Draft/Active/Closed)
- Backward compatible: falls back to `is_locked` if `plan_status` not set

### Phase 6: TargetVsActual Page ✅
- Added `selectedPlanId` state management
- Passes `selectedPlanId` and `onPlanChange` to TargetConfigTab
- Passes `selectedPlanId` to HierarchyAllocationTab

## Backward Compatibility
- `is_locked` column remains in DB and is auto-synced from `plan_status`
- Existing `user_business_plan_*` breakdown tables untouched
- All existing data migrated automatically

## Phase: Target Split, Dual Visibility & Manager Self-Service

### Phase 1: Fix Equal Split ✅
- Changed `handleEqualSplit` to split equally among direct reports (weight = 1 each) instead of weighting by `subordinateCount`
- Each manager handles their own team's internal distribution via their strategy

### Phase 2: Dual Target for Independent Strategy ✅
- Added `personal_quantity_target`, `personal_revenue_target`, `personal_visits_target` columns to `user_business_plans` table
- Extended `SubordinateAllocation` and `TeamHierarchyNode` interfaces with personal target fields
- `StepAssignManagers`: Independent strategy sub-managers now show two input sections — "Personal Target" and "Team Target"
- `StepPreview`: Independent managers show personal (blue) + team targets separately; "not yet distributed" warning hidden for Independent
- Save mutation includes personal target fields

### Phase 3: Manager Self-Service Target Editing 🔜 (Next Sprint)
- New `ManagerTargets.tsx` page for managers to edit subordinate targets
- View own target vs actual achievement
- Reuse `useTeamTargetProgress` hook for analytics

## Phase: Feedback Configuration & Policy Engine ✅

### Database Schema ✅
- Created `feedback_questions` table (per-module/customer configurable questions)
- Created `feedback_policies` table (named policies with module, priority)
- Created `feedback_policy_rules` table (condition+action pairs per policy)
- RLS enabled on all 3 tables with authenticated access

### Frontend Components ✅
- `FeedbackQuestionConfig.tsx`: Admin CRUD for feedback questions with module filter, type selection, required/active toggles
- `FeedbackPolicyConfig.tsx`: Admin CRUD for policies with expandable rule management, condition/operator/value/action configuration
- `FeedbackManagement.tsx`: Restructured with top-level Overview | Feedback Configuration tabs

### Policy Engine ✅
- `useFeedbackPolicyCheck.ts`: Hook evaluates active rules against visit count, order status, days since feedback
- Supports conditions: visit_count, no_order, order_placed, visit_completed, days_since_feedback
- Supports actions: block_order, block_checkout, show_prompt, mandatory_feedback

### Workflow Enforcement ✅
- `VisitCard.tsx`: Integrated policy check hook
- "Feedback Required" badge shown when policy triggers
- Order button intercepted when block_order/mandatory_feedback action triggered
- Opens feedback modal automatically when blocked

## Phase: No Target Strategy & Mid-Year Flexibility ✅

### Strategy Explanation Panel ✅
- Panel now open by default (`useState(true)`)
- Added 4th "No Target" card with explanation

### No Target Strategy ✅
- Added `'no_target'` to `TargetStrategy` type union
- Added Ban icon, gray color scheme, labels across all strategy components
- `StrategyBadge`, `InlineStrategySelector`, `TargetStrategySelector` all support `no_target`

### Allocation Logic ✅
- `getContributorCountForNode` returns 0 for `no_target` users
- `autoDistributeTargets` skips `no_target` children, zeros their targets
- `splitByWeights` filters out `no_target` entries
- `handleEqualSplit` excludes `no_target` from weight calculation
- `handleStrategyChange` zeros all targets when switching to `no_target`
- Save mutation includes `has_no_target: true` flag

### Wizard Steps UI ✅
- `StepAssignManagers`: No Target users show strikethrough name + badge, hidden inputs
- `StepPreview`: No Target nodes grayed out with "No target assigned" text, excluded from distribution warnings
- `StepReviewSave`: No Target rows read-only with grayed appearance

### Manager Self-Service ✅
- `TeamTargetDashboard`: Ban icon toggle button for managers to set subordinates to No Target
- Mutation updates `has_no_target` and `target_strategy` on `user_business_plans`

## Phase: Credit Note Generation System ✅

### Database Schema ✅
- Created `credit_notes` table (CN number, retailer, reason, GST totals, status)
- Created `credit_note_items` table (links to original order/invoice, product details, barcode)
- RLS enabled with authenticated access
- Auto-incrementing CN number sequence

### Credit Note Creation Page ✅ (`/credit-note/create`)
- Retailer selector → shows all invoices for selected retailer
- Multi-invoice item selection with checkboxes and return quantity input
- Barcode/SKU/product code scanner to filter & highlight matching items across invoices
- Return reason selector (unsold_stock, damaged, expired, quality_issue, other)
- Review step with grouped items by invoice, GST totals
- Saves to DB and auto-generates PDF on confirmation

### Credit Note PDF Generator ✅ (`src/utils/creditNoteGenerator.ts`)
- Matches invoice style: dark header, company logo, BILL TO section
- Title: "CREDIT NOTE" with red accent (vs green for invoices)
- Header: CN#, Credit Date, Reference Invoice(s), Reason
- Items table with red header and light red alternating rows
- Totals: Sub Total, SGST, CGST, Total (red bar)
- Amount in words, Reason for Credit section, Authorized Signature

### Credit Notes List ✅ (Invoice Management → "Credit Notes" tab)
- Lists all credit notes with status badges (draft/issued/cancelled)
- Download PDF button per credit note
- "New Credit Note" button linking to creation page

### Files Created
- `src/utils/creditNoteGenerator.ts` — PDF generation + CN numbering
- `src/pages/CreditNoteCreate.tsx` — Multi-step creation flow
- `src/components/credit-note/RetailerInvoiceList.tsx` — Invoice items with barcode filter
- `src/components/credit-note/BarcodeScanInput.tsx` — Barcode/SKU scanner
- `src/components/credit-note/CreditNoteReview.tsx` — Review summary
- `src/components/credit-note/CreditNoteList.tsx` — List with PDF download
- Modified `src/pages/InvoiceManagement.tsx` — Added 4th "Credit Notes" tab
- Modified `src/App.tsx` — Added `/credit-note/create` route
- Mutation updates `has_no_target` and `target_strategy` on `user_business_plans`
