
# Beat Deletion Options Implementation

## Overview
Add two options when deleting a beat:
1. **Delete all retailers** - Permanently delete all retailers assigned to this beat
2. **Transfer to another beat** - Move all retailers to a different beat before deletion

## Technical Design

### 1. Create New Dialog Component: `BeatDeleteDialog.tsx`

Create a new dialog component at `src/components/BeatDeleteDialog.tsx` that follows the pattern established by `UserDeleteDialog.tsx`:

```text
┌─────────────────────────────────────────────┐
│  🗑️ Delete Beat                            │
│                                              │
│  Delete "Bellendur Beat"?                    │
│                                              │
│  ℹ️ 3 retailers are assigned to this beat   │
│                                              │
│  What would you like to do with the          │
│  retailers?                                  │
│                                              │
│  ○ Delete all retailers                      │
│    Permanently remove all 3 retailers        │
│    assigned to this beat                     │
│                                              │
│  ○ Transfer to another beat                  │
│    Move retailers to a different beat        │
│                                              │
│    [Select destination beat ▼]               │
│                                              │
│  ┌─────────┐  ┌──────────────────┐          │
│  │ Cancel  │  │ Confirm Delete   │          │
│  └─────────┘  └──────────────────┘          │
└─────────────────────────────────────────────┘
```

**Props Interface:**
```typescript
interface BeatDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  beatId: string | null;
  beatName: string | null;
  userId: string;
  affectedRetailerCount: number;
  availableBeats: Beat[];
  onSuccess: () => void;
}
```

**State:**
- `deleteOption`: `'delete' | 'transfer' | 'unassign'` (default: `'unassign'` for backward compatibility)
- `targetBeatId`: string for selected destination beat
- `isProcessing`: boolean loading state

### 2. Update `MyBeats.tsx`

**Changes needed:**
- Replace `DeleteConfirmDialog` with new `BeatDeleteDialog`
- Pass available beats (excluding the one being deleted)
- Update `handleConfirmDeleteBeat` to accept `deleteOption` and `targetBeatId` parameters

**New deletion logic in `handleConfirmDeleteBeat`:**

```typescript
// Option 1: Delete all retailers
if (deleteOption === 'delete') {
  // Move retailers to recycle bin
  for (const retailer of affectedRetailers) {
    await moveToRecycleBin({...});
  }
  // Hard delete from retailers table
  await supabase.from('retailers').delete().eq('beat_id', beatId);
}

// Option 2: Transfer to another beat  
else if (deleteOption === 'transfer' && targetBeatId) {
  const targetBeat = beats.find(b => b.id === targetBeatId);
  await supabase
    .from('retailers')
    .update({ 
      beat_id: targetBeatId,
      beat_name: targetBeat?.name 
    })
    .eq('beat_id', beatId);
}

// Option 3 (default): Unassign (existing behavior)
else {
  await supabase
    .from('retailers')
    .update({ beat_id: 'unassigned', beat_name: null })
    .eq('beat_id', beatId);
}
```

### 3. Update `BeatDetail.tsx`

The BeatDetail page also has a delete function. Update it to use the same `BeatDeleteDialog` for consistency.

### 4. Files to Modify

| File | Changes |
|------|---------|
| `src/components/BeatDeleteDialog.tsx` | **NEW** - Dialog with delete/transfer options |
| `src/pages/MyBeats.tsx` | Replace DeleteConfirmDialog, add transfer logic |
| `src/pages/BeatDetail.tsx` | Use new dialog instead of window.confirm |
| `src/hooks/useOfflineBeats.ts` | Add delete option support to `deleteBeat` function |

### 5. Key Considerations

- **Recycle bin integration:** When deleting retailers, archive them first using `moveToRecycleBin()` utility
- **Offline support:** Queue retailer deletions/transfers in offline sync queue
- **Cache updates:** Update IndexedDB cache for affected retailers
- **Event dispatch:** Notify other components via `beatDeleted` and `visitDataChanged` events
- **Beat count update:** Refresh beat statistics after transfer (new beat's retailer count increases)

### 6. Implementation Order

1. Create `BeatDeleteDialog.tsx` component
2. Update `MyBeats.tsx` to use new dialog
3. Add retailer deletion logic (with recycle bin)
4. Add retailer transfer logic
5. Update `BeatDetail.tsx` for consistency
6. Update offline sync handlers
7. Test all three options end-to-end
