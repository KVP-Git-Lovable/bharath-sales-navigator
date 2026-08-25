# Tax Master flipping — code diagnosis (no changes made)

## Verdict

The flipping is **manual**, not automatic. The bulk writes match, statement for statement, the "Move to bracket" button on the Tax Master screen. I found **no** code path anywhere that writes to `tax_masters`, `products.tax_master_id`, `products.gst_percentage`, `product_variants.*` or `tax_product_map` on render, mount, focus or refetch. Your auto-sync hypothesis is ruled out by the code.

## 1. Every write path (confirmed by reading the files)

Writes to `tax_masters`
- `src/pages/admin/TaxMaster.tsx:292` — `toggleActive()`, the Switch on each bracket card (`:630`). One click flips `is_active`.
- `src/pages/admin/TaxMaster.tsx:348` — `handleSave()` edit: name, `is_active`, applicability, `effective_from/to`.
- `src/pages/admin/TaxMaster.tsx:367` — create; `:307` — clone (always `is_active: false`).
- `tax_components` rewritten wholesale on every edit: delete `:355`, insert `:356`.

Writes to `products.tax_master_id` / `product_variants.tax_master_id`
- `src/pages/admin/TaxMaster.tsx:248` — `products.update({tax_master_id}).in('id', productIds)`
- `src/pages/admin/TaxMaster.tsx:249` — `product_variants.update({tax_master_id}).in('id', variantIds)`
  Both inside `handleBulkMove()` (`:238`), fired only by the `Move` button (`:426`).
- `src/components/ProductManagement.tsx:688` / `:730` — single product create/edit form.
- `src/components/ProductManagement.tsx:1804`, `:1924` — single variant form.
- `src/utils/productImportRunner.ts:317`, `:473`, `:829` — CSV/Excel product import upsert (`:578`, `:687`, `:853`). Explicit user-triggered import only.

`gst_percentage` is almost never written directly. It is derived in the DB: trigger `sync_product_tax_link` / `sync_variant_tax_link` does `SELECT total_rate INTO NEW.gst_percentage FROM tax_masters WHERE id = NEW.tax_master_id`. So writing `tax_master_id` alone rewrites the percentage — which is exactly what you observed.

`tax_product_map` — **zero write paths in the codebase**. Nothing reads it either. It is dead legacy data; its 34 orphan rows are inert and not part of this incident.

## 2. The bulk writes at 11:42:42 and 11:46:49

`handleBulkMove` matches the fingerprint precisely:
- `PAGE_SIZE = 50` (`:59`) and the header "select all" checkbox (`:438`) select every row on the page in one click — with 12 products that is the whole catalogue.
- Products and variants go out as **two separate `.in(...)` statements fired in parallel** (`:248`/`:249`), which produces exactly what you saw: 12 product rows sharing one microsecond timestamp, and at 11:46:49 12 products + 32 variants written as two statements microseconds apart.
- The 11:27/11:29 `tax_masters` edits immediately before are the `toggleActive`/`handleSave` clicks that made the 18% bracket selectable in the "Move to bracket" dropdown, which filters on `t.is_active` (`:420`).

Reading: someone with admin access opened Tax Master, activated/edited the brackets, expanded a bracket card, hit select-all, and moved the catalogue — twice, four minutes apart (the second move being the correction back to 5%). **Confirmed as the only code capable of that write shape; the attribution to a human is inferred**, since `updated_by` is NULL and there is no audit row.

## 3. Auto-sync on render — ruled out

The only `useEffect` in `TaxMaster.tsx` is `:104`, which calls `loadTaxes()`. `loadTaxes` (`:108`) issues `select`/`count head` queries only — no `update`, no `upsert`. `loadPanelProducts` (`:165`) is read-only. `ProductManagement.tsx` has no `update`/`upsert` inside any effect. No edge function and **no cron job** touches tax tables (I listed all 13 `cron.job` entries: leave accrual, auto-end-day, orphan orders, RLS drift, health checks, visits, delegations, delete-guard, report dispatcher, snapshots, gamification). No trigger on `tax_masters` propagates to products.

## 4. The Inactive badge

`TaxMaster.tsx:601-603` renders the badge from `tax.is_active` **only** — the effective date window is never evaluated anywhere in the app. It is written (`:352`) and read back into the form (`:281`) and otherwise ignored. So the expired 5% window is cosmetic and cannot cause a fallthrough to 18%.

That means "the UI lists all three as Inactive while the DB has 5% GST active" is a **staleness or ordering artefact, not a computed state**: the page loads once on mount and only refreshes after a write, so a screen left open across the 11:27–11:46 toggles will show whatever the flags were at load time. Worth re-checking with a hard refresh; if it still shows Inactive against `is_active = true`, that is a separate bug and I would need the exact row state at that moment.

## 5. `is_active` at pricing time — never checked

`Cart.tsx:764` fetches `gst_percentage` straight off `products`; `Cart.tsx:1256` and `:2156` snapshot `tax_rate_snapshot` from that value; `taxCalc.ts:109` uses `tax_rate_snapshot ?? gst_percentage`. Nothing joins `tax_masters`, so neither `is_active` nor the effective window gates order pricing. An inactive bracket assigned to a product is applied to live orders exactly as if it were active. This is why the 09:31 and 10:01 orders took 18%.

## 6. Root cause, stated plainly

Two facts combine:
1. `products.gst_percentage` is the single source of truth at order time, and it is a DB-derived mirror of whichever bracket was last assigned — with no activity or date validation.
2. The Tax Master screen exposes a one-click select-all bulk reassignment of the entire catalogue, with no confirmation dialog, no preview of affected count, no audit trail, and no `updated_by` capture.

So any admin exploring that screen can repoint all 12 products in a single click, and nothing in the system records that it happened. "Several times a day with nobody knowingly doing it" is consistent with repeated exploratory clicking on that screen, not with automation.

## Suggested follow-ups (not implemented — awaiting your agreement)

1. Add a confirmation step to `handleBulkMove` showing "N products + M variants → bracket X".
2. Populate `created_by` / `updated_by` and write a `tax_change_audit` row on every bracket edit and bulk move, so the next occurrence is attributable.
3. Guard `sync_product_tax_from_hsn` with `IF FOUND` so the empty `hsn_master` cannot null a bracket.
4. Decide whether `is_active` / effective window should gate order pricing, and enforce it in one place if so.
5. Fix the 5% bracket's one-day effective window, and drop the orphaned `tax_product_map` rows.
