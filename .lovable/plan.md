

# AI Bill Scanner for Additional Expenses

## What We're Building
A "Scan Bill" feature at the top of the Additional Expenses form that lets users upload or photograph a bill, sends it to AI for OCR, and auto-fills the expense category, amount, and description.

## Changes

### 1. New Edge Function: `scan-bill`
Based on the existing `scan-board` pattern. Uses Lovable AI (Gemini 2.5 Flash) with vision to extract:
- **category** — matched against the configured expense categories
- **amount** — total/final amount from the bill
- **description** — vendor name, items summary
- **date** — bill date if visible

The prompt will include the list of available expense categories so AI picks the best match.

### 2. Update `supabase/config.toml`
Add `[functions.scan-bill]` with `verify_jwt = false`.

### 3. Update `AdditionalExpenses.tsx`
- Add a prominent "Scan Bill" section at the **top** of the form (before expense rows), with Upload and Camera buttons
- On image capture/upload:
  1. Compress the image (reuse existing `compressImageFile`)
  2. Convert to base64 and send to `scan-bill` edge function
  3. Auto-fill the first expense row's category, amount, description, and date
  4. Attach the compressed image as `bill_file` on that row
- Show a loading state ("Scanning bill...") during AI processing
- Show extracted results with option to edit before saving

### Files
1. **Create** `supabase/functions/scan-bill/index.ts` — AI vision OCR for bills
2. **Edit** `supabase/config.toml` — add function entry
3. **Edit** `src/components/AdditionalExpenses.tsx` — add scan UI at top + auto-fill logic

