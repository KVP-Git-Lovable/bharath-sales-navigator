
# Fix Leave Type Deletion - Implement Soft-Delete Strategy

## Problem Statement
When attempting to delete a leave type from the admin panel, the system shows an error "Cannot delete: This leave type is in use". This occurs because leave types are referenced by foreign keys in multiple related tables:

- `leave_applications` - Contains leave requests submitted by employees
- `leave_balance` - Contains balance records per user/leave type
- `leave_policy` - Contains policy settings per leave type
- `leave_approval_workflow` - Contains workflow configuration
- `leave_accrual_log` - Contains accrual transaction history
- `user_leave_policy` - Contains user-specific policy overrides

## Solution Approach
Implement a **soft-delete (archive) strategy** as documented in the project's memory. Instead of hard-deleting leave types with associated data, offer the admin an option to **archive** the leave type by setting `is_active = false`.

## Implementation Steps

### 1. Enhance Delete Handler Logic
Modify the `handleDelete` function in `LeaveTypesManager.tsx` to:
- First attempt a hard delete
- If foreign key error (23503) is encountered, prompt the user with an option to archive instead
- Archive sets `is_active = false` to preserve historical data integrity

### 2. Add Archive Confirmation Dialog
Create a two-stage confirmation flow:
- **Initial delete click**: Show delete confirmation with Confirm/Cancel
- **If FK error occurs**: Show a new dialog explaining the leave type is in use and offering "Archive Instead" option

### 3. Implement Archive Function
Add a new `handleArchive` function that:
- Updates the leave type to set `is_active = false`
- Shows success message "Leave type archived successfully"
- Refreshes the list

### 4. Update UI State Management
Add new state variables:
- `archivePromptId` - Track which leave type triggered archive prompt
- `archiveInProgress` - Loading state for archive action

## Technical Details

### Modified Component: `src/components/attendance/LeaveTypesManager.tsx`

```text
┌─────────────────────────────────────────────────────────────┐
│                    Delete Flow Diagram                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  User clicks Delete → Show Confirm/Cancel                   │
│                              │                               │
│                              ▼                               │
│                    Attempt hard delete                       │
│                              │                               │
│              ┌───────────────┴───────────────┐               │
│              │                               │               │
│              ▼                               ▼               │
│         Success                    FK Error (23503)          │
│              │                               │               │
│              ▼                               ▼               │
│      Show success toast          Show Archive Prompt         │
│                                              │               │
│                              ┌───────────────┴───────────────┐
│                              │                               │
│                              ▼                               ▼
│                    User clicks Archive           User Cancels
│                              │                               │
│                              ▼                               │
│                    Set is_active=false                       │
│                              │                               │
│                              ▼                               │
│                    Show archive success                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### New AlertDialog Component
Add an AlertDialog that appears when delete fails due to FK constraint:

```tsx
// Archive prompt dialog structure
<AlertDialog open={!!archivePromptId} onOpenChange={() => setArchivePromptId(null)}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Cannot Delete Leave Type</AlertDialogTitle>
      <AlertDialogDescription>
        This leave type has associated applications, balances, or policies 
        and cannot be deleted. Would you like to archive it instead? 
        Archived leave types are hidden from new applications but 
        historical data is preserved.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={() => handleArchive(archivePromptId)}>
        Archive Instead
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Updated handleDelete Function
```tsx
const handleDelete = async (id: string) => {
  try {
    const { error } = await supabase
      .from('leave_types')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === '23503') {
        // FK constraint - prompt to archive instead
        setDeleteConfirmId(null);
        setArchivePromptId(id);
        return;
      }
      throw error;
    }

    toast.success('Leave type deleted successfully');
    setDeleteConfirmId(null);
    fetchLeaveTypes();
  } catch (error) {
    console.error('Error deleting leave type:', error);
    toast.error('Failed to delete leave type');
  }
};
```

### New handleArchive Function
```tsx
const handleArchive = async (id: string) => {
  try {
    const { error } = await supabase
      .from('leave_types')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;

    toast.success('Leave type archived successfully. It will no longer appear for new applications.');
    setArchivePromptId(null);
    fetchLeaveTypes();
  } catch (error) {
    console.error('Error archiving leave type:', error);
    toast.error('Failed to archive leave type');
  }
};
```

## Files to Modify
1. **`src/components/attendance/LeaveTypesManager.tsx`**
   - Import AlertDialog components from `@/components/ui/alert-dialog`
   - Add `archivePromptId` state
   - Update `handleDelete` to prompt archive on FK error
   - Add `handleArchive` function
   - Add AlertDialog for archive confirmation

## User Experience
- **Before**: Delete fails with cryptic error "Cannot delete: This leave type is in use"
- **After**: Delete gracefully offers archive option with clear explanation that historical data will be preserved
