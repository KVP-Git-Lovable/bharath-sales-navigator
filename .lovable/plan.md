

## Integrate MonitoringService into Login Flows

### Overview
Add Firebase Performance tracing and user identification to all three login paths in the application.

### Changes

#### 1. `src/hooks/useAuth.tsx` -- Main login (admin + user)

- Import `monitoring` from `@/services/MonitoringService`
- Wrap the entire `signIn` function body in `monitoring.trace('user_login_process', async () => { ... })`
- After the user is confirmed logged in (after status/profile checks pass, around line 395), call `monitoring.identifyUser(data.user.id)`
- On `signOut`, call `monitoring.logout()` to clear the user ID

#### 2. `src/pages/distributor-portal/DistributorLogin.tsx`

- Import `monitoring`
- Wrap `handleLogin` body in `monitoring.trace('distributor_login_process', async () => { ... })`
- After successful distributor auth, call `monitoring.identifyUser(authData.user.id)`

#### 3. `src/pages/StatusDashboard.tsx` -- Status page login

- Import `monitoring`
- Wrap the sign-in logic in `monitoring.trace('status_dashboard_login_process', async () => { ... })`
- After successful auth, call `monitoring.identifyUser(authData.user.id)`

### Technical Details

- The `monitoring.trace()` wrapper automatically attaches the `user_id` attribute via `putAttribute` after `identifyUser` is called, so the trace for login itself will also carry the user ID since `identifyUser` is called before the trace ends (inside the traced block)
- The `signOut` in `useAuth.tsx` will call `monitoring.logout()` to clear state
- All trace names use snake_case per convention
- Import: `import { monitoring } from '@/services/MonitoringService';`

