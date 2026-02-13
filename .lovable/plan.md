

# Ensure Top Bezel (Status Bar) Area is Never Covered on Mobile

## Problem
On mobile devices (especially iPhones with notches), the system status bar area can overlap with app content. Currently, pages wrapped in `<Layout>` are protected (it renders a fixed overlay covering the safe area inset), but **standalone pages** that don't use Layout have no consistent protection.

## Affected Pages

### Category 1: Already Protected (no changes needed)
- ~90 pages wrapped in `<Layout>` component -- Layout.tsx already renders a fixed `z-[9999]` safe area spacer at top and bottom
- Distributor portal standalone pages -- use `standalone-page` CSS class with `::before` pseudo-element

### Category 2: Standalone Pages Needing Safe Area Protection
These pages render full-screen without Layout and have NO safe area handling:

| Page | Route |
|------|-------|
| Auth (RoleBasedAuthPage) | `/auth` |
| Reset Password | `/reset-password` |
| Change Password | `/change-password` |
| Complete Profile | `/auth/complete-profile` |
| Not Found (404) | `*` |
| Map Redirect | `/map-redirect` |
| Landing Page | `/` |

### Category 3: DMSLayout (Distributor Management System)
- Mobile header uses `safe-area-top` class for padding but lacks the colored overlay spacer that Layout.tsx uses

## Solution

### 1. Global Safe Area Protection via CSS (single fix for all pages)
Add a global `::before` pseudo-element on the `#root` or `body` to create a persistent safe area cover. This ensures ALL pages, including standalone ones, are protected without modifying each file individually.

In `src/index.css`, update the `body` styles or add a new rule:

```css
/* Global safe area top cover - protects ALL pages */
body::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: env(safe-area-inset-top, 0px);
  background-color: hsl(var(--primary));
  z-index: 99999;
  pointer-events: none;
}

/* Global safe area bottom cover */
body::after {
  content: '';
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: env(safe-area-inset-bottom, 0px);
  background-color: hsl(var(--background));
  z-index: 99999;
  pointer-events: none;
}
```

### 2. Add top padding to standalone pages
Each standalone page needs `padding-top: env(safe-area-inset-top)` so content doesn't hide behind the overlay. Update these 7 pages to add the `pt-[env(safe-area-inset-top)]` or use the existing `standalone-page` class.

Pages to update:
- `src/components/auth/RoleBasedAuthPage.tsx` -- add `standalone-page` class to root div
- `src/pages/ResetPassword.tsx` -- add `standalone-page` class to all 3 return branches
- `src/pages/ChangePassword.tsx` -- add `standalone-page` class to root div
- `src/pages/CompleteProfile.tsx` -- already uses `standalone-page` on main return, add to loading/error returns
- `src/pages/NotFound.tsx` -- add `standalone-page` class to root div
- `src/pages/MapRedirect.tsx` -- add `standalone-page` class to root div
- `src/pages/LandingPage.tsx` -- add `standalone-page` class to root div

### 3. Remove duplicate safe area spacers from Layout.tsx
Since the global `body::before/::after` now handles it, the inline fixed divs in Layout.tsx become redundant. We can keep them for safety (they'll just overlap harmlessly) or remove them to clean up.

### 4. Update `standalone-page` CSS class
Change the `::before` background from `hsl(var(--card))` to `hsl(var(--primary))` to match the navbar color consistently.

## Technical Details

### Files to modify:
1. **`src/index.css`** -- Add global `body::before` and `body::after` safe area overlays; update `standalone-page::before` background color
2. **`src/components/auth/RoleBasedAuthPage.tsx`** -- Add `standalone-page` class
3. **`src/pages/ResetPassword.tsx`** -- Add `standalone-page` class to all return branches
4. **`src/pages/ChangePassword.tsx`** -- Add `standalone-page` class
5. **`src/pages/CompleteProfile.tsx`** -- Add `standalone-page` class to loading/error returns
6. **`src/pages/NotFound.tsx`** -- Add `standalone-page` class
7. **`src/pages/MapRedirect.tsx`** -- Add `standalone-page` class
8. **`src/pages/LandingPage.tsx`** -- Add `standalone-page` class

This approach ensures every single page in the app respects the device's safe area, preventing any UI from appearing under the status bar/notch.

