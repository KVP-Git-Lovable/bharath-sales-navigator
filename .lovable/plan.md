

# Additional Expenses Module Improvements

## Changes Overview

### 1. Auto-submit on save (no separate submit step)
When user saves expenses, status goes directly to `submitted` instead of `draft`. This sends it to the manager automatically. User can still edit (we'll allow editing `submitted` expenses by the owner).

### 2. Direct expense creation (remove extra click)
Currently clicking "Additional Expenses" opens a dialog, which then shows the form. Instead, start with one empty expense row pre-loaded so the user can fill immediately without clicking "Add More Expense".

### 3. Mobile UI optimization
- Reduce font sizes in the AdditionalExpenses form
- Make the dialog full-screen on mobile (`max-w-full h-full` on small screens)
- Stack Category/Amount vertically on mobile
- Smaller padding and spacing throughout

### 4. Camera + File upload for bills
Replace the plain file input with two buttons: "Upload File" and "Take Photo" (using `capture="environment"` on a hidden input for camera). Both feed into the same bill attachment flow.

### 5. Image compression before upload
Use the existing `compressImageFile` utility to compress image bills before uploading to Supabase storage. Target max 1024px dimension and 40% quality to keep files in KB range.

---

## Technical Details

### Files to modify:

**`src/components/AdditionalExpenses.tsx`**
- Initialize `expenses` state with one empty row (removes need for extra "Add" click)
- On save: set `status: 'submitted'` and `submitted_at` instead of `'draft'`
- Allow edit/delete for both `draft` and `submitted` status (user's own expenses)
- Replace file input with two buttons: "Upload" (file picker) and "Camera" (file input with `capture="environment"`)
- Compress image files using `compressImageFile` before upload (skip compression for PDFs)
- Reduce all font sizes: title to `text-base`, labels to `text-xs`, inputs smaller
- Tighter padding (`p-3` instead of `p-4`, `gap-3` instead of `gap-4`)

**`src/components/BeatAllowanceManagement.tsx`**
- Update dialog to be mobile-friendly: `max-w-full sm:max-w-[90vw]` and full height on mobile
- Remove the separate "Submit Expenses" button/flow since expenses auto-submit on save
- Update RLS consideration: manager approval page already queries `status = 'submitted'`

**Database**: No migration needed. The existing columns support this flow. We just change the default status on insert from `'draft'` to `'submitted'`.

