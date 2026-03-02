

## Beat Module Enterprise Enhancement -- Implementation Plan

### Summary
Implement the full gap analysis across 4 phases: Enhanced Delete Dialog with impact warnings and new options, Beat Transfer system with three-dot menu, Audit Log with beat history tracking, and dashboard stats enhancements.

---

### Phase 1: Enhanced Delete Dialog + Impact Warnings

**1a. Database Migration -- `beat_audit_log` table**

Create a new table to track all beat mutations:

```text
Table: beat_audit_log
- id: uuid PK (gen_random_uuid)
- beat_id: text (not null)
- action: text (create / transfer / deactivate / delete / merge / reassign / unassign)
- old_user_id: uuid (nullable)
- new_user_id: uuid (nullable)
- metadata: jsonb (default '{}')
- performed_by: uuid (references auth.users, not null)
- created_at: timestamptz (default now())
```

RLS: Authenticated users can INSERT; admin can SELECT all; regular users can SELECT their own (performed_by = auth.uid()).

**1b. Enhance `BeatDeleteDialog.tsx`**

Add three new props: `upcomingVisitsCount`, `pendingOrdersCount`, and `availableUsers`.

Expand the delete options from 2 to 4:
1. **Delete all retailers** (existing) -- move to recycle bin
2. **Transfer to another beat** (existing) -- select target beat
3. **Reassign to another sales user** (NEW) -- user selector dropdown + optional "Create new beat" checkbox. If checkbox is on, auto-creates a beat named "[BeatName] - [UserName]" owned by the target user and transfers retailers there
4. **Mark as Unassigned** (NEW) -- sets `beat_id = null` on all retailers, making them visible in the "Unmapped Retailers" pool

Add an **impact warning summary** section above the options showing:
- X Retailers assigned
- Y Upcoming planned visits
- Z Pending orders

**1c. Update `handleDeleteBeatClick` in `MyBeats.tsx`**

Before opening the dialog, fetch:
- Retailer count (existing)
- Upcoming visits: `SELECT count(*) FROM beat_plans WHERE beat_id = X AND plan_date >= today`
- Pending orders: `SELECT count(*) FROM orders WHERE beat_id = X AND status = 'pending'`

Pass these counts to the enhanced dialog.

**1d. Update `handleConfirmDeleteBeat` in `MyBeats.tsx`**

Add handling for the two new options:
- **reassign**: Update `retailers` SET `user_id = targetUserId, beat_id = newBeatId` (if auto-create) or `beat_id = null` temporarily. If "Create new beat" is checked, insert a new beat owned by the target user first.
- **unassign**: Update `retailers` SET `beat_id = null, beat_name = null` WHERE `beat_id = deletingBeatId`.

After each action, insert a row into `beat_audit_log` with the action type and metadata.

**1e. Mirror changes in `BeatDetail.tsx`**

The BeatDetail page also has delete functionality. Update its delete handler to match the enhanced dialog and audit logging.

---

### Phase 2: Beat Transfer + Three-Dot Menu

**2a. Create `BeatTransferDialog.tsx`**

A standalone dialog component for transferring beat ownership:
- User selector dropdown (using existing `get_profiles_for_selector` RPC or subordinate list)
- Confirmation summary: "Transfer beat '[name]' and all [N] retailers to [User]?"
- On confirm:
  - Update `beats` SET `created_by = newUserId`
  - Update `retailers` SET `user_id = newUserId` WHERE `beat_id = X`
  - Insert audit log entry (action: 'transfer', old_user_id, new_user_id)
  - Preserve all visit/order/collection history (no changes needed -- they reference retailer_id/beat_id, not user_id)

**2b. Replace Beat Card Actions with Three-Dot Menu**

Modify `BeatCard.tsx`:
- Remove the inline Edit / Analytics / Delete buttons
- Add a three-dot (`MoreVertical`) dropdown menu in the card header with:
  1. Edit Beat
  2. Transfer Beat (opens BeatTransferDialog)
  3. View Analytics
  4. AI Insights
  5. Deactivate Beat (soft delete with `is_active = false`, no recycle bin)
  6. Delete Beat (red, last item -- opens enhanced BeatDeleteDialog)

**2c. Add "Deactivate" action**

Deactivate = set `is_active = false` without moving to recycle bin. The beat disappears from daily planning but remains in reports. This is separate from "Delete" which moves to recycle bin.

Add a simple confirmation dialog: "Deactivate [beat name]? It will be hidden from daily planning but remain in reports."

---

### Phase 3: Audit Log Display

**3a. Create `BeatAuditTimeline.tsx`**

A timeline component that queries `beat_audit_log` for a given beat_id and displays entries chronologically:
- Icon per action type (create, transfer, delete, etc.)
- "Transferred from [User A] to [User B]" format
- Timestamp display
- Performed by user name

**3b. Add Audit Timeline to `BeatDetail.tsx`**

Add a new collapsible section "Activity History" on the BeatDetail page that renders the `BeatAuditTimeline` component.

**3c. Log existing actions**

Update the beat creation flow in `MyBeats.tsx` to also insert an audit log entry (action: 'create') when a new beat is created.

---

### Phase 4: Future (Not Implemented Now)

These are documented for future sprints:
- Beat Merge (select 2 beats, combine retailers, deactivate old)
- Beat Locking (is_locked column, admin-only unlock)
- Permission gating per role (Admin/Manager/Sales User access levels)

---

### Files Summary

| Action | File | Changes |
|--------|------|---------|
| Database | Migration | Create `beat_audit_log` table with RLS |
| Modify | `src/components/BeatDeleteDialog.tsx` | Add 2 new options, impact summary, user selector |
| Modify | `src/pages/MyBeats.tsx` | Fetch impact counts, handle new delete options, audit logging |
| Modify | `src/pages/BeatDetail.tsx` | Mirror delete enhancements, add audit timeline section |
| Modify | `src/components/BeatCard.tsx` | Replace buttons with three-dot dropdown menu |
| Create | `src/components/BeatTransferDialog.tsx` | Standalone transfer ownership dialog |
| Create | `src/components/BeatAuditTimeline.tsx` | Timeline display for beat history |

### Estimated Scope
- Phase 1 (Delete enhancements + audit table): Primary deliverable
- Phase 2 (Transfer + three-dot menu): Secondary deliverable
- Phase 3 (Audit display): Tertiary deliverable
- All three phases implemented in this iteration

