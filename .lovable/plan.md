## Production DB Protection — Plan

Three coordinated changes to stop the recurring column-drop / data-overwrite cycle. All changes are additive and idempotent; no existing data is destroyed.

### Item 1 — Anchor migration (runs last on every deploy)

New file: `supabase/migrations/<latest-timestamp>_anchor_schema_guard.sql`

Contents = exactly the SQL you provided:

- **Part A — Column existence guards** (`ADD COLUMN IF NOT EXISTS`):
  - `order_items`: `rate` (numeric, default 0, not null), `product_name` (text), `original_rate` (numeric)
  - `product_variants`: `price` (numeric, default 0, not null), `product_id` (uuid), `variant_name` (text), `sku` (text)
- **Part B — Pattern-based data guards** (only touch broken rows, never correct ones):
  - Guard 1: backfill `order_items.rate` from `original_rate` when rate=0 and original_rate>0
  - Guard 2: backfill `order_items.rate` from `total/quantity` when both rate and original_rate are 0
  - Guard 3: null out `product_variants.variant_name` only when it equals `sku` (Lovable overwrite pattern)
  - Guard 4: re-link `product_variants.product_id` only when NULL, using sku→product map
  - Guard 5: re-create `"Auth can read product_variants"` SELECT policy if missing
  - Guard 6: re-create `"Admins can insert order items"` + `"Order owners can insert order items"` INSERT policies if no INSERT policy exists

Because the file is the highest-versioned migration, it always runs last and reverses any column drops introduced earlier in the deploy.

### Item 2 — Harden `sync_order_with_items` RPC

`CREATE OR REPLACE FUNCTION public.sync_order_with_items` in the same migration, identical to the live definition except every column in both `INSERT INTO public.order_items (...)` blocks (existing-order branch + new-order branch) gets a defensive `COALESCE(..., default)` wrapper:

- `rate` → `COALESCE(NULLIF(item->>'rate','')::numeric, NULLIF(item->>'price','')::numeric, NULLIF(item->>'original_rate','')::numeric, 0)`
- `product_name` → `COALESCE(item->>'product_name', item->>'name', 'Unknown Item')`
- `original_rate` → `COALESCE(NULLIF(item->>'original_rate','')::numeric, NULLIF(item->>'rate','')::numeric, 0)`
- `product_id` (added to column list) → `COALESCE(public._safe_uuid(item->>'product_id'), NULL)`
- `variant_id` → existing fallback chain kept, wrapped so a null result never aborts the insert

Result: even if a column is briefly missing or an item field is null, the RPC inserts a safe row instead of throwing — offline sync queue stops retrying forever.

### Item 3 — Idempotency rule for all future migrations

Save a project memory rule (`mem://constraints/migration-idempotency`) and add to `mem://index.md` Core so every future migration I write obeys:

1. `CREATE TABLE` → `CREATE TABLE IF NOT EXISTS`
2. `ADD COLUMN` → `ADD COLUMN IF NOT EXISTS`
3. `CREATE POLICY "X" ...` → preceded by `DROP POLICY IF EXISTS "X" ON <table>`
4. `CREATE FUNCTION` → `CREATE OR REPLACE FUNCTION`
5. No `UPDATE ... SET col = value` without a `WHERE` guard proving the existing value is wrong (e.g. `WHERE col IS NULL` or `WHERE col = sku`)

### Not changing (per your instruction)

`offlineStorage`, `useStartupCleanup`, `forceRefresh`, `useMasterDataCache`, any IndexedDB logic — untouched.

### Files touched

- **Add:** `supabase/migrations/<new-timestamp>_anchor_schema_guard.sql` (Items 1 + 2)
- **Add:** `mem://constraints/migration-idempotency` + update `mem://index.md` (Item 3)
- **No code/TS changes.**

### Approval needed

The migration is destructive-safe (only `ADD COLUMN IF NOT EXISTS`, pattern-guarded UPDATEs, `CREATE OR REPLACE FUNCTION`, idempotent policy creates). It will be submitted via the migration tool which requires your explicit approval before it runs.  
  
**Approve with 3 corrections:**

1. Guard 3: add `AND sku NOT IN ('Vayu Spec')` to the WHERE clause so it doesn't null out intentional name=sku variants
2. Guard 4: add a direct fallback `UPDATE product_variants SET product_id = '2f5fc10b-8ef2-4511-a532-eb90aeefbf1c' WHERE sku = 'Vayu Spec' AND product_id IS NULL`
3. Item 2: the RPC is already hardened — only add `product_id` to the INSERT column list in both branches, do not rewrite the function  
  
-- Vayu Spec belongs to VAYU product (same as vay250, BLEND V)
  UPDATE public.product_variants
  SET product_id = '2f5fc10b-8ef2-4511-a532-eb90aeefbf1c'
  WHERE sku = 'Vayu Spec' AND product_id IS NULL;

Reply **approve** to apply.