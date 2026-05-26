
## Goal

Restructure `/pricing` so customers immediately see three groups:
1. **Core Products** — Field Sales (existing 4 tiers) + **Retailer Portal** (new)
2. **Add-Ons** — Existing capacity packs + **WhatsApp Pack** + **Marketing Pack** (new)
3. **Support / Professional Services** — existing section

Only `src/pages/website/PricingPage.tsx` is edited.

---

## 1. Core Products section

Wrap the existing 4 tier cards under a new heading **"Core Products"** with two sub-groups (tabs or stacked blocks with sub-headings):

### A. Field Sales Platform (existing)
Free / Starter / Professional / Enterprise — unchanged.

### B. Retailer Portal (new) — single-tier card + matching add-on pack
A 2-card row, mirroring the screenshot layout:

**Retailer Portal — ₹10,000 / month**
- For brands enabling customers/retailers to self-order
- Unlimited retailer logins (iOS + Android apps)
- 2,000 orders / month (resets monthly, no rollover)
- WhatsApp AI conversational order-taking
- Order placement, shipment tracking, schemes, returns, issue raising
- Standard support
- CTA: Start Free Trial

**Additional Retailer Portal Pack — ₹5,000 / pack**
- 1,000 additional orders per pack
- Stackable, **unused orders roll over** (pack-based, not monthly)
- CTA: Add Pack

Note line under the card explaining the monthly-reset vs pack-rollover distinction.

---

## 2. Add-Ons section

Rename the existing "Add-On Packs" section to **"Add-Ons"** and split into two visual sub-groups:

### A. Capacity Packs (existing 3 cards — Starter / Growth / Scale) — unchanged
Sub-heading: "For Field Sales plans"

### B. Channel & Marketing Add-Ons (new) — 2 cards
Sub-heading: "Engagement & Marketing"

**WhatsApp Pack — ₹5,000 / month**
- For dedicated, high-volume WhatsApp communication
- Unlimited campaigns
- 2,500 messages / month
- Additional Pack: ₹5,000 per 1,000 messages (shown as small footer in card)
- CTA: Activate Pack

**Marketing Pack — ₹5,000 / month**
- A unified social media marketing suite
- Unlimited campaigns
- Unified Analytics
- Journey Builder
- Ad Campaign Management (Facebook / Instagram)
- CTA: Activate Pack

Keep the existing "Unused Quota Rolls Over / Stack Multiple Packs / Instant Activation" benefits row beneath all add-ons.

---

## 3. Support section (existing Professional Services)
Keep as-is but add a top section divider/heading "Support & Services" so it's clearly the third pillar.

---

## Page structure after change

```text
Hero
└─ "Core Products"
   ├─ Field Sales Platform (4 tiers)
   └─ Retailer Portal (1 tier + 1 pack)
└─ Enterprise Plus (unchanged)
└─ "Add-Ons"
   ├─ Capacity Packs (3 cards)
   └─ Channel & Marketing (WhatsApp + Marketing)
└─ "Support & Services" (existing Professional Services)
└─ FAQ
```

Section anchors (`#core`, `#addons`, `#support`) so the existing/future nav can jump to them.

---

## Technical details

- Single file edit: `src/pages/website/PricingPage.tsx`.
- Add new data arrays: `retailerPortalTiers`, `channelAddOns`. Reuse the existing `Card`, `Button`, `Check` rendering pattern for visual consistency.
- New lucide icons: `Store` (Retailer Portal), `MessageCircle` (WhatsApp), `Megaphone` (Marketing).
- Use existing semantic tokens (`bg-primary/5`, `border-primary`, etc.) — no new colors.
- Add a small reusable `SectionHeader` inline component (title + chip + subtitle) to make the three pillars visually distinct.
- FAQ: add 1 entry — "Do Retailer Portal orders roll over?" → monthly resets, only add-on packs roll over.

No backend, routing, or other page changes.
