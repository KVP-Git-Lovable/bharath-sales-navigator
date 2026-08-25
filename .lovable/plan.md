# Correct the two 18% GST invoices back to 5%

Two orders were placed on 25 Aug 2026 while the product GST rate was wrongly set to 18%. Everything else has already been reset to 5%; only these two documents still carry 18%.

## Affected records

| Invoice | Retailer | Lines | Sub-total | Tax | Total |
|---|---|---|---|---|---|
| INV2026-25431 | Anand Bandasale | 2 | 192.19 | 34.60 | 227.00 |
| INV2026-25433 | Sri Ram store acharpalke | 4 | 494.29 | 88.98 | 583.00 |

Both are `status = generated`, not cancelled, not edited.

## Which figure stays fixed

These orders were priced from a tax-inclusive amount (192.19 x 1.18 = 227). So correcting the rate can only preserve one of two things:

- **Option A (recommended, default): keep the amount collected from the retailer.** Totals stay 227.00 and 583.00. The taxable value is re-derived at 5% (227 / 1.05 = 216.19, tax 10.81) and line rates move up accordingly. Nothing changes for the retailer or for collections; only the GST split is corrected.
- **Option B: keep the taxable value.** Line rates and sub-totals stay as they are; tax drops to 5% and the invoice total falls to about 201.80 and 519.00. This changes what the retailer owes and would need a collection/ledger adjustment.

The plan below assumes Option A. Say the word and I will switch it to B.

## What gets changed

A single data-correction migration, applied only to the six line IDs already identified:

1. `order_items` (6 rows) — set `tax_rate_snapshot = 5`, `cgst_rate = 2.5`, `sgst_rate = 2.5`, recompute `rate`, `total`, `cgst_amount`, `sgst_amount` so each line's tax-inclusive value is unchanged.
2. `invoice_items` (6 rows) — set `gst_rate = 5`, recompute `taxable_amount`, `price_per_unit`, `cgst_amount`, `sgst_amount`; `total_amount` unchanged.
3. `invoices` (2 rows) — recompute `sub_total` and `total_tax`; `total_amount` unchanged.
4. `orders` (2 rows) — recompute any stored tax/sub-total columns; `total_amount` unchanged.

Rounding follows the app's existing half-up-to-2-decimals rule, with the residual absorbed into the line taxable value so line totals still sum exactly to the invoice total.

## Verification after the change

- Re-query the six lines and both invoices to confirm no 18% value remains anywhere and both totals still read 227.00 and 583.00.
- Confirm `select count(*) from order_items where tax_rate_snapshot = 18` returns 0.
- Open both invoices in the app to confirm the PDF preview shows CGST 2.5% / SGST 2.5%.

## Not included

No schema changes, no audit-trail work, no code changes — this is a scoped data correction to six lines and two invoices.
