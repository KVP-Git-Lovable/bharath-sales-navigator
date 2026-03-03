

## SOC 2 Type 1 Preface Document -- Plan

This is a **documentation-only** task. No code changes are needed. The deliverable is a new Markdown file (`docs/SOC2_Type1_Preface.md`) that mirrors the format of the uploaded Microsoft 365 SOC example -- adapted to describe the security posture of **this** application (Bharat Sales Spark / KVP Field Force).

### Source Data Summary (from codebase audit)

The document will be derived entirely from the current codebase and database. Here is what exists:

| Area | Evidence Found |
|------|---------------|
| **Authentication** | Supabase Auth with email/password, JWT tokens, auto-refresh, session persistence, forced password change (`must_change_password`), account lockout (`is_account_locked`), password reset rate limiting (`password_reset_attempts`), inactive user blocking |
| **Row-Level Security** | **284 of 284** public tables have RLS enabled (100% coverage) |
| **Access Control** | 4-layer hierarchical permission model: Module > Field > Action > Widget via `profile_object_permissions` and `security_profiles` tables; `SECURITY DEFINER` helper functions to prevent RLS recursion |
| **Data Classification** | Sensitive fields protected by `prevent_admin_sensitive_access` trigger; `sensitive_data_access_log` for audit trail; private storage buckets with signed URLs for photos |
| **Role Management** | `user_roles` table with `app_role` enum; `has_role()` SECURITY DEFINER function; System Administrator profile in `security_profiles` |
| **Manager Hierarchy** | Recursive `get_all_subordinates()`, `get_reporting_chain()` functions enforcing data visibility by reporting structure |
| **Approval Workflows** | Multi-level approval engine (`approval_requests`, `approval_steps`, `approval_audit_log`) with first-action-wins parallel model |
| **Edge Functions** | 48 server-side functions handling sensitive operations (user creation, face verification, AI processing) with secrets stored as Supabase Edge Function environment variables |
| **Offline Security** | Cached auth with integrity signatures (`cachedAuthIntegrity.ts`), full cache/preference wipe on sign-out to prevent cross-user data leakage |
| **Multi-Tenancy** | Explicitly single-tenant; tenant columns removed from schema |
| **Storage** | Private-by-default model; signed URLs for employee/attendance/visit photos; public buckets only for company branding assets |
| **Monitoring** | Firebase Crashlytics + Performance monitoring; `sensitive_data_access_log`; `feature_flag_audit`; `approval_audit_log` |

### Document Structure (following the SOC 2 sample format)

The Markdown file will contain these sections:

1. **System Overview** -- Application name, purpose (field force automation), technology stack (React, Supabase, Capacitor), deployment model
2. **Data** -- Classification table (Access Control Data, Customer Content / Retailer Data, EUII, System Metadata, Account Data) mapped to actual database tables
3. **Control Monitoring** -- Internal security scan tooling, RLS linter, edge function secret management, audit log tables
4. **Access Management** -- Overview of the hierarchical permission system (security profiles, profile_object_permissions, module/field/action/widget layers)
5. **Identity & Access Management** -- Supabase Auth, JWT tokens, session management, `onAuthStateChange` listener pattern
6. **New User / Modification of User Access** -- Admin user creation via edge function (`admin-create-user`), invitation flow (`send-user-invitation`, `validate-invitation`), profile assignment, forced password change
7. **Authentication** -- Email/password with Supabase Auth, account lockout, password reset with rate limiting and SMS token, offline cached auth with integrity validation
8. **Authorization & Row-Level Security** -- 100% RLS coverage, SECURITY DEFINER functions, manager hierarchy visibility, approval workflows
9. **Data Security** -- Private storage buckets, signed URLs, `prevent_admin_sensitive_access` trigger, sensitive data access logging, full cache wipe on logout
10. **Multi-Tenancy Statement** -- Single-tenant architecture declaration, no tenant isolation required
11. **Edge Function Security** -- Server-side secret management, no client-side exposure of sensitive keys, face verification for attendance
12. **Audit & Logging** -- `sensitive_data_access_log`, `approval_audit_log`, `feature_flag_audit`, `beat_audit_log`, GPS tracking logs

### Implementation

- **Create**: `docs/SOC2_Type1_Preface.md` -- the full preface document (~1500-2000 words)
- **No database changes**
- **No code changes**

All content will reference actual table names, function names, and architectural patterns from the codebase as evidence.

