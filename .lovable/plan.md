

## Pricing Page Updates

**File:** `src/pages/website/PricingPage.tsx` (lines 33-88)

### Starter Plan (lines 33-43)
- Remove: `"500 retailers/month"` and `"10,000 visits/month"`
- Add: `"Storage space — 5 GB"`
- Rename: `"AI-powered insights — 2,500 AI requests/month"` to `"AI-powered insights — 2,500 AI credits/month"`

### Professional Plan (lines 52-64)
- Change: `"15,000 orders/month"` to `"10,000 orders/month"`
- Remove: `"1,500 retailers/month"` and `"30,000 visits/month"`
- Add: `"Storage space — 10 GB"`
- Rename: `"AI-powered insights — 5,000 AI requests/month"` to `"AI-powered insights — 5,000 AI credits/month"`

### Enterprise Plan (lines 74-86)
- Change: `"40,000 orders/month"` to `"20,000 orders/month"`
- Remove: `"4,000 retailers/month"` and `"80,000 visits/month"`
- Add: `"Storage space — 15 GB"`
- Rename: `"AI-powered insights — 10,000 AI requests/month"` to `"AI-powered insights — 10,000 AI credits/month"`

All changes are in a single file, updating the `plans` array data only.

