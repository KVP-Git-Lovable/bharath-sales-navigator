

# Add Notification Bell Button to Navbar

## Overview
Add a notification bell icon button next to the hamburger menu in the navbar, as shown in the reference screenshot. Clicking it will open a notification dropdown/panel showing the user's notifications.

## Current State
- The navbar already has a hamburger menu button on the right side
- A `notifications` database table exists with fields: `id`, `user_id`, `title`, `message`, `type`, `is_read`, `created_at`, `related_table`, `related_id`
- Notifications are being inserted (e.g., from retailer verification) but there's no UI to display them

## Implementation Plan

### Step 1: Create Notifications Hook
Create a new hook `src/hooks/useNotifications.ts` that:
- Fetches notifications for the current user from the `notifications` table
- Sorts by `created_at` (newest first)
- Provides functions to mark notifications as read
- Returns unread count for the badge

### Step 2: Create NotificationBell Component
Create `src/components/NotificationBell.tsx` with:
- A bell icon (using Lucide's `Bell` icon)
- A badge showing unread notification count (red dot/number)
- A Popover dropdown that opens on click showing:
  - List of recent notifications
  - Each notification shows title, message, and timestamp
  - Visual distinction for read vs unread notifications
  - "Mark all as read" action
  - Empty state when no notifications

### Step 3: Update Navbar
Modify `src/components/Navbar.tsx` to:
- Import the new `NotificationBell` component
- Place it between the company info section and the hamburger menu button
- Maintain consistent styling with the existing navbar design

## UI Design

```text
+---------------------------------------------------------------+
|  ← [Logo] QuickApp.ai     [🔔]  [≡]                          |
|                             ^     ^                           |
|                             |     |                           |
|                     Bell button   Menu button                 |
+---------------------------------------------------------------+
```

The notification bell will:
- Be white colored to match the navbar theme
- Have a subtle hover effect (`hover:bg-white/10`)
- Show a small red badge with unread count (if any)
- Open a popover/dropdown with notifications list

## Files to Create
1. **`src/hooks/useNotifications.ts`** - Hook for fetching and managing notifications

2. **`src/components/NotificationBell.tsx`** - Bell icon component with popover

## Files to Modify
1. **`src/components/Navbar.tsx`** - Add the notification bell beside the menu button

## Technical Details

### useNotifications Hook Structure
```typescript
interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string | null;
  is_read: boolean;
  created_at: string;
  related_table: string | null;
  related_id: string | null;
}

function useNotifications() {
  // Returns:
  // - notifications: Notification[]
  // - unreadCount: number
  // - isLoading: boolean
  // - markAsRead: (id: string) => void
  // - markAllAsRead: () => void
  // - refetch: () => void
}
```

### NotificationBell Component Features
- Uses Radix Popover for the dropdown
- Bell icon with optional badge showing unread count
- Scrollable list of notifications (max 5-10 visible)
- Relative timestamps (e.g., "2 hours ago")
- Click notification to mark as read
- Navigate to related item if `related_table` and `related_id` are set

