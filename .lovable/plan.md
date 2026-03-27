

# Fix: Add RLS Policies to ~180 Tables with RLS Enabled but No Policies

## What Happened

The policies were **not deleted**. These ~180 tables were created with `ENABLE ROW LEVEL SECURITY` but **no policies were ever added**. When RLS is on with zero policies, Supabase blocks all access — making these tables appear empty to users. This is the same bug we just fixed for `order_items` and `products`.

## Approach

Categorize all ~180 tables by access pattern and apply policies in **5 batch migrations**:

### Batch 1: Config/Reference Tables (~40 tables)
Tables like `accrual_config`, `badges`, `coach_badges`, `coach_competencies`, `coach_learning_content`, `coach_quiz_questions`, `coach_scenarios`, `companies`, `competencies`, `competency_templates`, `credit_management_config`, `expense_categories`, `expense_master_config`, `feature_flags`, `gamification_actions`, `gamification_games`, `holidays`, `license_config`, `performance_module_config`, `product_categories`, `product_variants`, `product_schemes`, `scheme_applicability`, `scheme_policy_config`, `sms_config`, `tax_components`, `tax_masters`, `tax_product_map`, `target_types`, `target_kpi_definitions`, `target_metric_definitions`, `target_parameter_definitions`, `territories`, `week_off_config`, `whatsapp_config`, `working_days_config`, `regularization_policy`, `pincode_master`, `notification_event_types`, `notification_rules`, `onboarding_tasks`, `role_definitions`, etc.

**Policy**: All authenticated users can SELECT; only admins (`is_system_admin(auth.uid())`) can INSERT/UPDATE/DELETE.

### Batch 2: User-Owned / Created-By Tables (~30 tables)
Tables with `user_id` or `created_by` columns: `credit_ledger`, `credit_notes`, `custom_invoice_templates`, `feedback_policies`, `feedback_questions`, `fy_target_config`, `hierarchy_targets`, `inst_invoices`, `inst_leads`, `inst_opportunities`, `inst_order_commitments`, `invoices`, `packing_lists`, `primary_orders`, `van_stock_adjustments`, `user_business_plan_*`, etc.

**Policy**: Users can SELECT/INSERT/UPDATE/DELETE own data (via `user_id = auth.uid()` or `created_by = auth.uid()`); admins can do all.

### Batch 3: Distributor Tables (~30 tables)
Tables with `distributor_id`: `distributor_attachments`, `distributor_beat_mappings`, `distributor_business_plans`, `distributor_claims`, `distributor_contacts`, `distributor_credit_limits`, `distributor_inventory`, `distributor_inventory_transactions`, `distributor_locations`, `distributor_payments`, `distributor_price_books`, `distributor_retailer_*`, `distributor_returns`, `distributor_secondary_*`, `distributor_support_requests`, `distributor_users`, `distributors`, etc.

**Policy**: Authenticated users can SELECT all (needed for field sales); admins can manage. Where `created_by` exists, users can also INSERT/UPDATE own records.

### Batch 4: Child/Join Tables (~40 tables)
Tables linked through parent FKs: `branding_request_items`, `chat_messages`, `credit_note_items`, `distributor_company_return_items`, `distributor_return_items`, `distributor_secondary_invoice_items`, `employee_connections`, `expense_groups`, `feedback_policy_rules`, `inst_*` child tables, `invoice_items`, `primary_order_items`, `primary_order_schemes`, `primary_return_items`, `primary_return_notes`, `primary_shipments`, `van_*` tables, `packing_list_items`, `packing_list_assignments`, etc.

**Policy**: Authenticated users can SELECT (broad read needed for app functionality); admins can manage. For tables with `created_by`, users can INSERT/UPDATE own.

### Batch 5: Remaining / Special Tables (~30 tables)
Tables like `customers`, `feature_flag_audit`, `expense_approval_rules`, `joint_sales_*`, `leave_holidays_bridge`, `notification_event_log`, `order_cancellation_log`, `password_reset_attempts`, `permanent_deletion_log`, `pm_*` project management tables, `price_books`, `price_book_entries`, `push_content_templates`, `recycle_bin*`, `retailer_loyalty_*`, `retailer_*`, `social_post_attachments`, `stockist_*`, `target_plans`, `target_policies`, `target_setup_master`, `territory_assignment_history`, `user_invitations`, `vendors`, etc.

**Policy**: Authenticated users can SELECT; admins can manage. Where `user_id`/`created_by` exists, users can also write own data.

## Technical Details

- Each batch is a separate SQL migration
- All policies use `public.is_system_admin(auth.uid())` for admin checks (per project convention)
- Uses `DROP POLICY IF EXISTS` before each `CREATE POLICY` to be idempotent
- No frontend changes needed — these are purely database-level fixes
- Total: ~180 tables × ~2-4 policies each = ~500+ policy statements across 5 migrations

## Impact

| Area | Before | After |
|---|---|---|
| ~180 tables | Completely locked (RLS on, 0 policies) | Proper access control |
| Config data (products, categories, etc.) | Invisible to users | Readable by all authenticated users |
| User-owned data | Invisible | Users see own data, admins see all |
| Distributor module | Broken | Functional |
| Invoice/credit/van modules | Broken | Functional |

