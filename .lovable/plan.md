

# Fix: Module List Not Scrollable in Selective Deletion Dialog

## Problem

The selective deletion module list only shows 4-5 modules out of 19. The Radix `ScrollArea` component is not scrolling properly inside the dialog's constrained flex layout (`max-h-[85vh] overflow-hidden flex flex-col`). The Radix ScrollArea viewport doesn't calculate its height correctly in this context, so the remaining modules are simply clipped.

## Solution

Replace the Radix `ScrollArea` with a plain `div` using native CSS overflow scrolling, which works reliably inside flex-constrained dialogs.

## Changes

**File: `src/components/admin/UserDeleteDataDialog.tsx`**

1. Replace the `<ScrollArea>` wrapper (line 281) with a simple `<div>` that has `max-h-[300px] overflow-y-auto` styling
2. Remove the `ScrollArea` import if no longer used elsewhere in the file

This is a minimal, targeted fix -- just swapping the scroll container type while keeping all the module checkboxes and layout intact.

