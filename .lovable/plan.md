## Status Metrics Dashboard (`/status`)

### Overview

Create a standalone `/status` page with its own admin login form (independent of the main app auth). This page will display key database metrics after successful administrator authentication.

### What Will Be Built

**1. New Page: `src/pages/StatusDashboard.tsx**`

A self-contained page with two states:

- **Login State**: A branded login form matching the QuickApp.ai theme (blue gradient background, logo, card layout) with heading "QuickApp.ai Status Dashboard", email and password fields
- **Dashboard State**: After successful admin login, displays database metrics in a grid of cards

The login will use `supabase.auth.signInWithPassword()` directly, then verify the user is a System Administrator by checking `user_profiles` + `security_profiles`. If not an admin, it shows an error and signs the user out. This keeps the `/status` page completely independent from the main app session.

**2. Route Registration in `App.tsx**`

Add the `/status` route as a public route (no `ProtectedRoute` wrapper) since the page handles its own authentication internally.

**3. Database Metrics Displayed**

The dashboard will query and display these key metrics using direct Supabase queries:  
  
database read-write, database uptime, and other key metrics

Each metric shown in a styled card with icon, label, and count.

### Technical Details

**File: `src/pages/StatusDashboard.tsx**`

- Local state: `isAuthenticated`, `adminUser`, `isLoading`, `metrics`
- Login flow:
  1. Call `supabase.auth.signInWithPassword({ email, password })`
  2. Query `user_profiles` joined with `security_profiles` to verify `name = 'System Administrator'`
  3. If not admin: call `supabase.auth.signOut()`, show error toast
  4. If admin: set `isAuthenticated = true`, fetch metrics
- Metrics fetch: parallel `supabase.from('table').select('id', { count: 'exact', head: true })` calls
- Logout button in dashboard header signs out and resets state
- Uses existing QuickApp.ai logo, same gradient background, Card components, and styling from `RoleBasedAuthPage.tsx`

**File: `src/App.tsx**`

- Import `StatusDashboard`
- Add route: `<Route path="/status" element={<StatusDashboard />} />`
- Placed alongside other public routes (no ProtectedRoute wrapper)

### UI Design

**Login View:**

- Blue gradient background matching the existing auth page
- Centered card with QuickApp.ai logo
- Heading: "QuickApp.ai Status Dashboard"
- Subtitle: "Administrator Access Only"
- Email field labeled "Admin Email Address"
- Password field with show/hide toggle
- "Sign In" button

**Dashboard View:**

- Same gradient background
- Top bar: "QuickApp.ai Status Dashboard" title + Logout button
- Grid of metric cards (2 columns on mobile, 4 on desktop)
- Each card: icon, metric name, count value
- Auto-refresh button to reload metrics