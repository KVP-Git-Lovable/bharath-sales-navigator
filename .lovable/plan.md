# Plan: Manual Per-Unit Discount Scheme

A new scheme type where the **admin sets only an upper cap** (e.g. "up to ₹40 off per kg") and the **salesperson decides at order entry** how much to actually give (e.g. ₹15/kg, ₹18/kg, ₹22/kg) and **chooses exactly one line item** in the cart to apply it to. No quantity threshold required (optional). Nothing is auto-applied.

---

## 1. Scheme Master — Create the scheme (admin)

In **Scheme Management → Add Scheme**, add a new type:

- **Manual Per-Unit Discount** (icon: tag with ↕ arrows)

Form fields shown when this type is selected:

```text
┌──────────────────────────────────────────────────────────┐
│ Scheme Name *      [ Festive Per-KG Offer            ]   │
│ Description        [ Up to ₹40/kg off, sales decides ]   │
│ Scheme Type        [ Manual Per-Unit Discount ▼      ]   │
│                                                          │
│ Max Discount per Unit *  [ 40   ]                        │
│ Per Unit                 [ KG ▼ ]  (kg / pc / ltr / g)   │
│                                                          │
│ Applies To                                               │
│   ◉ All products    ○ Selected products                  │
│   (if Selected: existing multi-product picker)           │
│                                                          │
│ Min Quantity (optional)  [    ]  ← leave blank = none    │
│ Min Order Value (opt.)   [    ]                          │
│                                                          │
│ Validity  [Start] → [End]    ☑ Active                    │
│                                                          │
│ ℹ Sales reps can apply this scheme to ONE line item per  │
│   order and enter any per-unit discount from ₹0 up to    │
│   ₹40/kg. The chosen amount × quantity becomes the       │
│   line discount.                                         │
└──────────────────────────────────────────────────────────┘
```

Validation: `max_discount_per_unit > 0`. Other fields optional.

---

## 2. Order Entry — How the salesperson uses it

### 2a. Apply Offers panel (existing modal)

The new scheme appears in the existing offers list with a distinct badge:

```text
┌──────────────────────────────────────────────────────────┐
│ 🏷  Festive Per-KG Offer                  [ Apply ]      │
│     Manual · Up to ₹40 off per kg                        │
│     Salesperson chooses amount and product               │
└──────────────────────────────────────────────────────────┘
```

Clicking **Apply** opens a small picker (replaces the usual auto-apply behaviour):

```text
┌──────────────────────────────────────────────────────────┐
│ Apply: Festive Per-KG Offer                              │
│ Cap: ₹40 / kg                                            │
│                                                          │
│ Pick one product from your cart                          │
│   ○ Tomato 1kg          8 kg   @ ₹320                    │
│   ◉ Onion 1kg           5 kg   @ ₹260                    │
│   ○ Potato 1kg         12 kg   @ ₹180                    │
│                                                          │
│ Discount per kg  [ 18 ]   /  max ₹40                     │
│ ▓▓▓▓▓▓▓▓░░░░░░░░  (slider, optional aid)                 │
│                                                          │
│ Preview                                                  │
│   Onion 1kg · 5 kg × ₹18 off = ₹90 total discount        │
│                                                          │
│              [ Cancel ]            [ Apply Offer ]       │
└──────────────────────────────────────────────────────────┘
```

Rules:
- Only one line item can carry this scheme (prevents double-dipping).
- Entered value clamped `0 ≤ x ≤ max_discount_per_unit`.
- If admin set Min Quantity, products below that quantity are disabled in the list with a hint.
- The scheme can be removed/edited from the cart's "Applied Offers" chip list (existing UI) — clicking it reopens the same picker pre-filled.

### 2b. Cart line item view

The chosen line item shows the manual discount inline:

```text
┌────────────────────────────────────────────────────────────┐
│ Onion 1kg                            Qty: [ 5 ] kg         │
│   Rate: ₹260.00 /kg                                        │
│   🏷 Festive Per-KG Offer  −₹18/kg   [ Edit ] [ Remove ]   │
│   Line: ₹1,300.00 − ₹90.00 = ₹1,210.00                     │
└────────────────────────────────────────────────────────────┘

Order Summary
  Subtotal             ₹  ......
  Manual Scheme Disc. −₹    90.00   (Festive Per-KG Offer · Onion 1kg)
  ─────────────────────────────────
  Total                ₹  ......
```

---

## 3. Invoice — How it reflects

The chosen line shows the per-unit discount in the discount column; scheme name appears once in the applied-schemes footer.

```text
INVOICE #INV-2025-0142

Item            HSN    Qty     Rate       Disc          Amount
──────────────────────────────────────────────────────────────────
Tomato 1kg      0702   8 kg    ₹320.00    —             ₹2,560.00
Onion 1kg       0703   5 kg    ₹260.00    ₹90.00        ₹1,210.00
                                          (₹18/kg)
Potato 1kg      0701  12 kg    ₹180.00    —             ₹2,160.00
──────────────────────────────────────────────────────────────────
                                Subtotal:              ₹5,930.00
                                Scheme Discount: −     ₹   90.00
                                Taxable:               ₹5,840.00
                                GST:                   ₹  ......
                                ────────────────────────────────
                                Grand Total:           ₹  ......

Applied Schemes:
  • Festive Per-KG Offer — Manual ₹18/kg on Onion 1kg (saved ₹90)
```

---

## Technical Section

### Data model
Reuse `product_schemes` with `scheme_type = 'manual_per_unit_discount'`. Add columns:
- `max_discount_per_unit NUMERIC` — admin cap.
- `discount_unit TEXT` — display label (kg/pc/ltr/g).

Per-order selection (which line + entered amount) is **not** stored on the scheme — it's stored on the order:
- Persist on `order_items.discount_amount` (already exists) for the chosen line.
- Persist scheme reference + entered per-unit value in the existing `order_items` scheme metadata column (reuse the same JSON path the engine already writes for `itemSchemeDetails`). If a dedicated column is needed, add `applied_unit_discount NUMERIC` to `order_items`.

One migration, no new tables.

### Engine changes
- `src/utils/schemeEngine.ts`: add `case 'manual_per_unit_discount'`. Unlike auto-applied schemes, the engine reads a **user-supplied** value from a new optional input on `SchemeCalculationInput`:

  ```ts
  manualSelections?: Record<string /*schemeId*/, {
    itemId: string;        // cart line id
    perUnitDiscount: number;
  }>;
  ```

  Compute `discount = clamp(perUnit, 0, scheme.max_discount_per_unit) * item.quantity`, write into `itemDiscounts[itemId]` and `itemSchemeDetails[itemId]` with `{ schemeType, discountAmount, perUnitDiscount, unit }`. Skip if `manualSelections[scheme.id]` is missing (scheme stays "available but not applied").
- `src/utils/schemeCalculator.ts`: mirror the same case (legacy path).

### UI changes
- `src/components/SchemeFormFields.tsx` — new SelectItem + conditional block (cap, unit, min qty, applies-to).
- `src/components/SchemeMaster.tsx` — include `max_discount_per_unit` / `discount_unit` in create/update payloads + reset on type change + display badge "Up to ₹X/unit".
- `src/components/SchemeDetailsDisplay.tsx` — render benefit "Up to ₹X/unit, manual".
- `src/components/OrderEntrySchemesModal.tsx` — when scheme type is `manual_per_unit_discount`, the Apply button opens the **picker dialog** (new small component `ManualPerUnitApplyDialog.tsx`) instead of toggling. Saves selection into local order state and calls the engine.
- `src/hooks/useAppliedSchemes.ts` — store `manualSelections` alongside `appliedSchemeIds`; clearing a scheme also clears its selection.
- Cart line component — show the inline "−₹18/kg · Edit · Remove" row when the line carries a manual selection.
- `src/utils/invoiceGenerator.ts` — when `itemSchemeDetails[item.id]` contains `perUnitDiscount`, render `(₹{x}/{unit})` under the disc column; in the footer "Applied Schemes" list, append `Manual ₹X/{unit} on {productName}`.

### Constraints kept
- Only one line item per order can hold the manual scheme (enforced in the picker; engine also guards).
- Cap is a hard ceiling — entered value is clamped both client-side and engine-side.
- No quantity threshold unless admin sets one.
- Existing schemes / engine math are untouched.

### Out of scope
- Multiple line items per single manual scheme (one-line-only by design — keeps audit clean).
- Tax recalculation logic (uses existing post-discount taxable path).
- Approval workflow for large discounts (can be added later via a separate policy hook).
