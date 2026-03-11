
Root cause in current code:
1) Edit is partially loaded: `loadExpenseForEditing` sets `bill_url`, but the form only renders attachment UI when `bill_file` exists (newly selected file). So existing attached bill is not shown in edit mode, making it look like data didn’t load.
2) Edit UX has no loading state: modal first shows default empty row, then async fetch fills values. On slower response, this feels “not displaying properly.”
3) Status text mismatch: `submitted` is still labeled as “Submitted” in `AdditionalExpenses.tsx`, while another view shows “Pending.”

Implementation plan:
1) Update `src/components/AdditionalExpenses.tsx`
- Add `isEditLoading` state.
- When `editExpenseId` is present:
  - force `isFormOpen = true`
  - show loader/skeleton until fetch completes
  - then render populated fields.
- In attachment section:
  - show “Current attachment” from `bill_url` (preview/link) even if no new file chosen.
  - keep existing `bill_url` when user edits other fields.
  - if new file uploaded, replace `bill_url`.
- Normalize status label mapping: `submitted -> Pending`.

2) Small edit-flow hardening
- Ensure edit query is scoped safely (`id` + current user context where applicable) and handle “not found” with clear toast.
- Reset edit-related local state cleanly when dialog closes to avoid stale empty form behavior.

3) Keep table structure as requested
- Preserve `Details` column with Eye icon.
- Keep `Edit` + `Delete` only under `Action`.

Validation checklist:
- Click Edit on submitted row → category, amount, date, description prefilled.
- Existing attachment visible without re-upload.
- Save update works and reflects immediately in table.
- Status shows `Pending` before approval and `Approved` after manager approval.
