

## Fix: Credit Note Generation Failing — Missing Tables in Dev Database

### Problem
The error "Failed to generate credit note: undefined" occurs because the `credit_notes` and `credit_note_items` tables do not exist in the Dev Supabase database (`etabpbfokzhhfuybeieu`). The migration that creates these tables was never applied to this branch.

### Root Cause
When you switched to the Dev Supabase project, the database doesn't have all the same tables as production. The `credit_notes`, `credit_note_items` tables, and the `credit_note_number_seq` sequence are missing.

### Fix
Run a database migration on the Dev database to create the missing tables. The SQL is already defined in the existing migration file and includes:

1. **`credit_notes` table** — stores credit note header (number, date, retailer, totals, status)
2. **`credit_note_items` table** — stores line items linked to credit notes
3. **RLS policies** — allowing authenticated users to select, insert, and update
4. **Sequence** — `credit_note_number_seq` for auto-numbering

This is a single migration with the exact same schema as production. No code changes needed — only the database migration.

