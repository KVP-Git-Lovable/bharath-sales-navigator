
# Restore Product Variants & Pricing (from Book 1.xlsx)

## Current DB state (verified just now)
`product_variants` is missing BOTH `price` AND `product_id` columns. Every variant row is orphaned — no link to its parent product, no price. That's why Order Entry shows `₹undefined` and product grouping is broken.

`products` table still has 11 base products with correct `rate`. `product_variants` has 32 rows (24 real + 8 SAMPLE/FS rows). The Excel you uploaded has clean per-variant pricing that matches 23 of those variant names.

## Step 1 — Restore the two missing columns
Single migration:
```sql
ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);
```

## Step 2 — Reattach every variant to its parent product
Name-based mapping (verified against current DB rows):

| Parent product (`products.name`) | Variants to link |
|---|---|
| ADUKU 20G | ADUKU 100G, ADUKU 250G, ADUKU 500G, SAMPLE ADUKU (FS) |
| BLUE 20G | BLUE 100G, BLUE 250G, BLUE 500G, SAMPLE BLUE (FS) |
| GOLD 40G | Gold 250G, GOLD 500G, GOLD 1KG, KADAK GOLD BLEND, SAMPLE GOLD (FS) |
| YELLOW 20G | YELLOW 100G, YELLOW 250G, YELLOW 500G, Yellow 40G, Yellow 1Kg |
| RL JAR 250 | RL JAR 500G, RL JAR 1KG |
| RL POUCH 250G | (no variants in Excel — leave) |
| ELAICHI 40G | ELACHI 250G, SAMPLE ELAICHI (FS) |
| ADRAK 40G | ADARAK 250G, SAMPLE ADRAK (FS) |
| VAYU 30G | VAYU 250, Vayu SPL 250g, VAYU BLEND, SAMPLE VAYU (FS) |
| DAKSHIN 30G | DAKSHIN 250G, DAKSHIN SPL 250, DAKSHIN BLEND, SAMPLE DAKSHIN (FS) |
| DAKSHIN GOLD (HORECA) | (base only) |

Executed as one UPDATE block (matching by exact variant_name).

## Step 3 — Apply prices from Book 1.xlsx
Round Excel values to 2 dp, write to `product_variants.price` and refresh parent `products.rate` for the 20G/30G/40G/250G bases.

Highlights from the sheet:
- ADUKU: 20G ₹361.90, 100G ₹400, 250G/500G ₹342.86
- BLUE: 20G ₹342.86, 100G ₹333.33, 250G/500G ₹323.81
- GOLD: 40G ₹361.90, 250G/500G ₹342.86, 1KG ₹0 (Excel blank — keep 0, flag for you)
- YELLOW: 20G ₹342.86, 250G/500G ₹323.81, 40G ₹0, 1KG ₹0 (flag)
- RL JAR: 250G ₹333.33, 500G ₹323.81, 1KG ₹320
- RL POUCH 250G ₹295.24
- ELAICHI: 40G ₹333.33, 250G ₹314.29
- ADRAK: 40G ₹333.33, 250G ₹304.76
- VAYU: 30G ₹228.57, 250G ₹209.52
- DAKSHIN: 30G ₹228.57, 250G ₹209.52, GOLD (HORECA) ₹209.52
- SAMPLE/FS rows: price stays 0 (free samples)

Excel has no entry for: DAKSHIN SPL 250, DAKSHIN BLEND, KADAK GOLD BLEND, VAYU BLEND, Vayu SPL 250g — those will keep ₹0 unless you give me a number.

## Step 4 — Validate "ready to place order"
Run a verification query and surface any variant where `price IS NULL OR price = 0` (excluding SAMPLE rows). Also confirm every variant has `product_id`, `sku`, `is_active=true`, and that the parent product has a `category_id`. I'll list any gaps so you can fill them before sales start ordering.

## Step 5 — Disable the destructive seeder permanently
- Delete `src/utils/productMigration.ts`.
- Remove the import and the trigger button from `src/components/ProductManagement.tsx` (line 22 and the surrounding UI).
- This is the script that wiped variants in the first place; an env guard is not enough — the file should not exist.

## Step 6 — Frontend cleanup (no behavior change needed)
`useOfflineOrderEntry` and `useOfflineOrderComplete` already read `variant.price` and `variant.product_id`. Once the columns are back and IndexedDB resyncs (auto on next online load), the order screen will show real prices again. No code change required there.

## Open items for your confirmation
1. **GOLD 1KG, Yellow 40G, Yellow 1Kg** show ₹0 in the Excel — should I leave them at 0 (effectively hidden from ordering) or do you have prices?
2. **Blend / SPL variants** (KADAK GOLD BLEND, VAYU BLEND, DAKSHIN BLEND, DAKSHIN SPL 250, Vayu SPL 250g) — not in Excel. Keep at 0, or provide prices?
3. Should I also re-add `retailer_price` (separate selling price for retailers)? It's not in the Excel and not referenced anywhere in the codebase — confirm before I add it.
4. OK to fully delete `productMigration.ts` and its button?

Reply with answers (or just "go with defaults: leave 0, skip retailer_price, delete seeder") and I'll switch to build mode and execute steps 1-5.
