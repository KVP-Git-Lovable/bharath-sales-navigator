

## Activity Logging Section for Status Dashboard

### Overview

Add an "Activity Logging" section below the existing database metrics on the `/status` dashboard. This requires new database tables to track user sessions and page navigation, a client-side tracker that logs activity in real-time, and a server-side RPC to aggregate the data for the admin dashboard.

### What Will Be Built

**1. New Database Tables (Migration)**

- **`user_sessions`** -- Tracks login/logout sessions
  - `id` (uuid, PK)
  - `user_id` (uuid, references profiles)
  - `login_at` (timestamptz, default now())
  - `logout_at` (timestamptz, nullable)
  - `duration_seconds` (integer, generated or computed)
  - `is_active` (boolean, default true)

- **`user_page_views`** -- Tracks module/page navigation
  - `id` (uuid, PK)
  - `user_id` (uuid)
  - `session_id` (uuid, references user_sessions)
  - `page_path` (text) -- e.g. `/attendance`, `/my-retailers`
  - `module_name` (text) -- extracted root path e.g. `attendance`, `my-retailers`
  - `visited_at` (timestamptz, default now())
  - `duration_seconds` (integer, nullable) -- time spent on that page

- **`user_data_usage`** -- Tracks upload/download data volume
  - `id` (uuid, PK)
  - `user_id` (uuid)
  - `session_id` (uuid, references user_sessions)
  - `bytes_uploaded` (bigint, default 0)
  - `bytes_downloaded` (bigint, default 0)
  - `recorded_at` (timestamptz, default now())

RLS policies: All tables will allow users to INSERT their own rows and admins to SELECT all rows.

**2. New Database RPC: `get_activity_logging_summary`**

A SECURITY DEFINER function (admin-only) that returns:
- Per-user total usage time (sum of session durations)
- Per-user most used module (highest page view count)
- Per-user least used module (lowest page view count, minimum 1 visit)
- Per-user data usage in MB (sum of bytes uploaded + downloaded)

Returns a JSON array of user activity summaries.

**3. Client-Side Activity Tracker: `src/hooks/useActivityTracker.ts`**

A hook that runs inside the authenticated app (within `AuthProvider`):
- **Session tracking**: On login (user detected), creates a `user_sessions` row. On logout/tab close, updates `logout_at`.
- **Page view tracking**: Listens to route changes (via `useLocation` from react-router), logs each navigation to `user_page_views` with the module name extracted from the path.
- **Data usage tracking**: Wraps or intercepts `fetch`/XHR to estimate bytes transferred, periodically batches and inserts into `user_data_usage`.
- Uses `beforeunload` event to finalize sessions on tab close.

**4. Integration in `App.tsx`**

Add `useActivityTracker()` call inside the authenticated app wrapper so it runs for all logged-in users.

**5. Activity Logging UI in `StatusDashboard.tsx`**

Below the existing database metrics grid, add a new section:
- Section header: "Activity Logging" with a Users icon
- A table/card layout showing per-user rows with columns:
  - **User Name**
  - **Total Usage Time** (formatted as hours/minutes)
  - **Most Used Module** (module name + visit count)
  - **Least Used Module** (module name + visit count)
  - **Data Usage** (formatted in MB)
- Date range filter (today / last 7 days / last 30 days)
- Data fetched via `supabase.rpc('get_activity_logging_summary', { days: 7 })`

### Technical Details

**Migration SQL** (key parts):

```text
CREATE TABLE user_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id),
  login_at timestamptz DEFAULT now(),
  logout_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE user_page_views (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  session_id uuid REFERENCES user_sessions(id),
  page_path text NOT NULL,
  module_name text NOT NULL,
  visited_at timestamptz DEFAULT now(),
  duration_seconds integer
);

CREATE TABLE user_data_usage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  session_id uuid REFERENCES user_sessions(id),
  bytes_uploaded bigint DEFAULT 0,
  bytes_downloaded bigint DEFAULT 0,
  recorded_at timestamptz DEFAULT now()
);
```

**Activity Tracker Hook** (`src/hooks/useActivityTracker.ts`):
- Extracts module from path: `/my-retailers/123` becomes `my-retailers`
- Creates session on mount (when user is authenticated)
- Tracks page changes via `useLocation()`
- Estimates data usage by intercepting network responses via PerformanceObserver API
- Batches data usage updates every 60 seconds
- Finalizes session on unmount/beforeunload

**RPC function** (`get_activity_logging_summary`):
- Accepts `p_days integer` parameter (default 7)
- Joins `user_sessions`, `user_page_views`, `user_data_usage` with `profiles`
- Returns per-user aggregated stats
- Restricted to System Administrators only

### Files to Create/Modify

| File | Action |
|------|--------|
| Migration SQL | Create -- 3 tables + RPC function + RLS policies |
| `src/hooks/useActivityTracker.ts` | Create -- client-side tracking hook |
| `src/App.tsx` | Modify -- add `useActivityTracker()` inside auth wrapper |
| `src/pages/StatusDashboard.tsx` | Modify -- add Activity Logging section below metrics |

### UI Layout (Dashboard View)

```text
+--------------------------------------------------+
|  [Healthy]                                        |
|  QuickApp.ai Status Dashboard        [Refresh]    |
|  AWS ap-south-1 (Mumbai) | PostgreSQL  [Logout]   |
+--------------------------------------------------+
|  [DB Size] [Uptime] [Status] [Reads] [Commits]    |
|  [Storage]                                         |
+--------------------------------------------------+
|                                                    |
|  Activity Logging            [Today|7d|30d]        |
|  +---------+----------+--------+--------+-------+  |
|  | User    | Usage    | Most   | Least  | Data  |  |
|  |         | Time     | Used   | Used   | Usage |  |
|  +---------+----------+--------+--------+-------+  |
|  | John D. | 4h 32m   | attend.| beats  | 12 MB |  |
|  | Jane S. | 2h 15m   | retail.| orders | 8 MB  |  |
|  +---------+----------+--------+--------+-------+  |
+--------------------------------------------------+
```
