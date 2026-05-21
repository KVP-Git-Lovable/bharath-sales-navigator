## Goal
Audit the May 20–21 orders shown in the screenshots, identify which records belong to Sardar but are now missing/mislinked in the database, and restore only those order-to-retailer/user links without touching other users’ data.

## What I found so far
- The current `orders` table does **not** contain May 20–21 rows with `user_id` or `retailer_id` set to `NULL`.
- The DB currently shows:
  - **May 20:** 66 orders total, **0** currently owned by Sardar
  - **May 21:** 54 orders total, **2** currently owned by Sardar
- The screenshots clearly show more Sardar retailers on both days than the DB now reflects, so this looks like a **mis-assignment/disconnection issue**, not simply a `NULL` field issue.
- The visits screen can also read from cached snapshot/offline sources, so I need to separate **historical UI evidence** from **current DB truth** before restoring.

## Plan
### 1) Build a forensic audit for May 20–21
Create a read-only audit that compares:
- `orders` on May 20–21
- Sardar’s current retailers and beat mappings
- retailer names visible in the screenshots
- ownership signals such as `user_id`, `owner_id_snapshot`, `retailer.user_id`, `retailer.created_by`, `beat_id`, `visit_id`, and timestamp proximity

Output:
- a candidate list of all orders on May 20–21 that could belong to Sardar
- a confidence classification for each row: exact match / strong match / ambiguous / exclude

### 2) Produce a dry-run restore report before changing data
Generate a report listing for each candidate:
- current order id
- current user/retailer linkage
- proposed Sardar retailer id
- evidence used for the match
- whether the change is safe or ambiguous

This will let us verify the exact rows to remap before any write happens.

### 3) Implement a narrowly scoped remap path
Add a backend-safe restore/remap path that only updates rows from the approved candidate set and only for May 20–21.

Safety rules:
- only orders positively matched to Sardar are touched
- no inserts for unrelated users
- no broad updates by name alone
- every update logged with before/after values
- support dry-run mode first, apply mode second

### 4) Remap ownership and retailer linkage
For approved rows, update only the minimum fields needed so the orders belong to the correct Sardar retailer again, prioritizing:
- `user_id`
- `owner_id_snapshot`
- `retailer_id`
- `retailer_name` only if it needs normalization to match the linked retailer
- `visit_id` only if a valid same-day Sardar visit match exists

### 5) Verify the fix against both DB and app logic
After remapping, verify:
- Sardar’s May 20 and May 21 counts/value totals
- retailer-level linkage correctness
- no other users’ May 20–21 totals changed unexpectedly
- summary/visits calculations now include the restored orders correctly

## Technical details
- I’ll reuse the existing Supabase restore pattern already present in the project, but convert this into a **targeted audit + remap workflow** rather than another bulk blind restore.
- I’ll query and classify candidates using normalized retailer-name matching plus live retailer/beat ownership checks.
- If needed, I’ll implement this as a small Edge Function with:
  - `dryRun=true` for the audit report
  - `apply=true` for the actual remap
- Any DB write will be restricted to:
  - date range `2026-05-20` to `2026-05-21`
  - candidate order ids only
  - Sardar’s verified retailer mappings only

## Expected deliverables
- full audit of May 20–21 candidate orders
- dry-run report of which orders belong to Sardar
- safe remap implementation
- final verification summary of restored order linkage