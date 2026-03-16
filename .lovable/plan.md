

# Plan: Feedback Configuration & Policy Engine for Feedback Management

## Overview

Restructure the Feedback Management page into two top-level sections: **Overview** (existing data tables) and **Feedback Configuration** (new). The Configuration section contains two sub-areas: **Question Configuration** (per-customer, per-module feedback questions) and **Policy Configuration** (rule-based enforcement of mandatory feedback).

---

## Database Schema (3 new tables via migrations)

### 1. `feedback_questions`
Configurable feedback questions per module/customer.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| module | text | e.g. 'visit', 'order', 'retailer_feedback' |
| question_text | text | The question to display |
| question_type | text | 'rating', 'text', 'yes_no', 'multi_choice' |
| options | jsonb | For multi_choice type |
| is_required | boolean | Default true |
| applies_to | text | 'all' or 'specific' |
| retailer_ids | uuid[] | If applies_to = 'specific' |
| sort_order | int | Display ordering |
| is_active | boolean | Default true |
| created_by | uuid FK | |
| created_at / updated_at | timestamptz | |

### 2. `feedback_policies`
Rule definitions for when feedback becomes mandatory.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | text | e.g. "Every 5 visits mandatory feedback" |
| description | text | |
| module | text | 'visit', 'order', etc. |
| is_active | boolean | |
| priority | int | Higher = checked first |
| created_by | uuid FK | |
| created_at / updated_at | timestamptz | |

### 3. `feedback_policy_rules`
Individual condition+action pairs within a policy.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| policy_id | uuid FK → feedback_policies | |
| condition_type | text | 'visit_count', 'no_order', 'order_placed', 'visit_completed', 'days_since_feedback' |
| condition_operator | text | 'every_n', 'equals', 'greater_than', 'is_true' |
| condition_value | text | e.g. '5' for every 5 visits |
| action_type | text | 'block_order', 'block_checkout', 'show_prompt', 'mandatory_feedback' |
| question_set_module | text | Which module's questions to enforce |
| is_active | boolean | |
| sort_order | int | |

---

## Frontend Components

### 1. Restructure `FeedbackManagement.tsx`
- Add top-level Tabs: **Overview** | **Feedback Configuration**
- **Overview** tab contains the existing 4 sub-tabs (Retailer, Competition, Branding, Joint Sales) — no changes to existing logic
- **Feedback Configuration** tab contains two cards/sub-tabs: **Question Config** and **Policy Config**

### 2. New: `src/components/admin/FeedbackQuestionConfig.tsx`
- Table listing configured questions with module filter
- Add/Edit dialog with fields: module, question text, type, options (for multi-choice), required flag, applies-to (all/specific retailers), sort order
- Toggle active/inactive
- Retailer multi-select when applies_to = 'specific'

### 3. New: `src/components/admin/FeedbackPolicyConfig.tsx`
- List of policies with name, module, status, rule count
- Add/Edit policy dialog
- Within each policy, manage rules:
  - Condition type dropdown (visit_count, no_order, order_placed, visit_completed, days_since_feedback)
  - Operator dropdown (context-dependent)
  - Value input
  - Action type dropdown (block_order, block_checkout, show_prompt, mandatory_feedback)
- Toggle policy active/inactive

### 4. New: `src/hooks/useFeedbackPolicyCheck.ts`
- Hook that takes `retailerId` and `userId`
- Queries active policies and their rules
- For `visit_count` condition: counts visits from `retailer_visit_logs` since last feedback in `retailer_feedback`
- For `no_order` / `order_placed`: checks latest visit's order status
- For `days_since_feedback`: compares last feedback date
- Returns `{ isFeedbackRequired: boolean, matchedPolicy: Policy | null, requiredAction: string }`

### 5. Integrate enforcement in `VisitCard.tsx`
- Call `useFeedbackPolicyCheck` for each retailer
- When `isFeedbackRequired` is true and action is `block_order`:
  - Show a badge/indicator on the visit card ("Feedback Required")
  - Intercept order button click → show modal explaining feedback is required first
  - Redirect to feedback modal instead
- When action is `mandatory_feedback`:
  - Block checkout/visit completion until feedback is submitted

---

## Technical Notes

- All new tables get RLS enabled with authenticated access
- Question and policy management restricted via existing `profile_object_permissions` pattern
- The policy check hook uses efficient queries — counts since last feedback date rather than loading all records
- Policies are evaluated client-side after fetching active rules (small dataset, cached via react-query)
- The existing `RetailerFeedbackModal` will be extended to render dynamic questions from `feedback_questions` alongside existing fixed fields

---

## Files to Create
- `src/components/admin/FeedbackQuestionConfig.tsx`
- `src/components/admin/FeedbackPolicyConfig.tsx`
- `src/hooks/useFeedbackPolicyCheck.ts`

## Files to Modify
- `src/pages/FeedbackManagement.tsx` — add Overview/Configuration top-level tabs
- `src/components/VisitCard.tsx` — integrate policy enforcement
- Migration for 3 new tables

