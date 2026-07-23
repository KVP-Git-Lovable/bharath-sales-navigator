
# Notification Rules Redesign + Web Push Fixes + Inbox Polish

Four independent scopes bundled into one release. All DB functions (`notif_pick_users`, `notif_preview_recipients`, `notify_send_test`) already exist — no migrations.

---

## 1. Plain-language rule builder (admin)

**File:** `src/pages/admin/NotificationRulesAdmin.tsx` (or whichever component currently renders the rules form — I'll locate it in build mode; likely `src/components/admin/NotificationRuleForm.tsx`).

Replace the current form with a **sentence-style builder**:

> When **[event ▾]** happens on **[module ▾]**, notify **[whom ▾]**, via **[channel ▾]**.

- **whom ▾** dropdown maps to `receiver_type` with a muted sub-label under each option:
  - The person themselves → `employee`
  - Their manager → `manager`
  - Whole hierarchy up → `hierarchy`
  - A role → `role` (reveals role picker)
  - Specific people → `specific_user` (reveals user picker below)
  - All admins → `admin`

- **Message field** with clickable token chips inserted at caret: `{user_name}` `{date}` `{time}` `{beat}` `{record_name}`.

- **User picker** (only when whom = Specific people): options from `supabase.rpc('notif_pick_users')` → `{id, name, role}`. Selected `id` → `receiver_user_id`. Debounced search over name.

- **"Who will receive this" live preview card**:
  - Fires on any change (debounced 300 ms).
  - Calls `supabase.rpc('notif_preview_recipients', { p_receiver_type, p_receiver_role, p_receiver_user_id, p_sample_actor })`.
  - Renders returned names as chips + total count ("Will notify 4 people").
  - For actor-relative types (`employee`, `manager`, `hierarchy`), show a small **"Preview as [rep ▾]"** picker sourced from `notif_pick_users`, defaulting to the current user; its selection is passed as `p_sample_actor`.

- **"Send test to me" button**: calls `supabase.rpc('notify_send_test', { p_event_code, p_source_table })` using the current form's event/module. Toast the returned recipient names on success.

- **No DB changes.** Existing save/update handlers keep writing the same columns.

## 2. Web push fixes — SW scope + foreground display

**Files:** `src/lib/firebaseMessaging.ts`, `public/firebase-messaging-sw.js`.

- Register `firebase-messaging-sw.js` at **root scope** (`/`) instead of the query-param URL path currently used. That path currently causes `getToken` to hang on some browsers because the scope defaults to `/firebase-messaging-sw.js?...` rather than `/`.
  - Register as: `navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' })`.
  - Move Firebase config out of URL params: read `VITE_FIREBASE_*` env in `public/firebase-messaging-sw.js` via a build-time replacement or import them inside a small `public/firebase-messaging-sw-config.js` — simplest: hardcode `self.firebaseConfig` at the top of the SW using values sourced from env at build via a tiny generated file, or read from `self.location` if project keeps that pattern. **I'll use the standard pattern: bake the config into a generated `public/firebase-messaging-sw.js` via Vite's `define` or a build script.** Confirm approach in build.
- Replace the empty `onMessage(messaging, () => {})` with a real handler:
  - Show `toast(payload.notification.title, { description: payload.notification.body })` via `sonner`.
  - Still call the optional `onNotification?.()` callback so the bell refetch fires.
- All `VITE_FIREBASE_*` + `VITE_FIREBASE_VAPID_KEY` read from `import.meta.env` (already there — just verify none are missing).
- **`push_device_tokens` upsert stays untouched.**

## 3. Reliable push enable on Profile

**File:** `src/components/PushNotificationSettings.tsx`.

- Add a `useEffect` that runs on mount (and when `enabled` becomes `true`):
  - If `Notification.permission === 'granted'` **and** `enabled === true` **and** not native, call `initWebPush(user.id)` to (re)register the FCM token.
  - Guarded by a ref so it only fires once per session.
- Keep the existing OFF→ON toggle behaviour (that path still works for first-time permission grant).
- Toggle stays as the opt-out control — nothing removed.

## 4. Notification center polish

**Files:** `src/components/NotificationBell.tsx`, and inbox list rendering (already uses `useNotifications`).

- **Unread dot** already exists per item; add a distinct blue dot vs read state (currently every item shows a dot because the query only fetches unread). Since fetch is unread-only, keep dot but visually differentiate the newest unread from older with the existing bg tint — no behaviour change needed; add clearer styling.
- **"Mark all read"** action — already present in the header of the popover. Verify it's visible and wire tightens if broken.
- **Relative timestamps** — already used via `formatDistanceToNow`. Keep.
- **"Test" tag** — add a small pill (`<Badge variant="secondary">Test</Badge>`) when `notification.metadata?.is_test === true`. Requires reading `metadata` field (already in the `Notification` type on `useNotifications`, need to ensure the `select('id, title, message, ...')` on `NotificationBell` fetches it — it uses `useNotifications` which does `select('*')`, so it's included).

The core need in #4 is really the **Test badge** — the other items are already implemented but I'll audit them in build mode and tighten any gaps.

---

## Out of scope (explicit)

- No DB migrations. No RLS changes. No edits to `notif_pick_users` / `notif_preview_recipients` / `notify_send_test`.
- No changes to native push (`pushRegistration.ts`) beyond leaving it alone.
- No changes to `push_device_tokens` schema or upsert payload.

## Verification plan

- **Rule builder**: open the admin page, build a rule with each `whom` option, confirm preview count updates and matches expected names; click "Send test to me" and confirm a toast + a row lands in `notifications` for the current user.
- **Web push**: on a published build (not the preview iframe — SW registration is disabled there per skill/pwa), enable push on Profile, confirm FCM token upserts to `push_device_tokens`, send a test push and confirm a foreground toast appears when the tab is open.
- **Profile re-register**: revoke and re-grant browser permission, reload the app — token should re-register without needing to toggle off/on.
- **Inbox**: force a row with `metadata: { is_test: true }` and confirm the "Test" pill renders.

Approve and I'll build all four in one pass.
