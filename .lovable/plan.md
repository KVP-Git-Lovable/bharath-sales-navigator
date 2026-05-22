# Journey Plan still empty on Mokshith's device — recovery plan

## Status

The code patch is already in `src/pages/BeatPlanning.tsx` (verified):
- Cache filter (L102-105) uses `user_id || owner_id`
- Network query (L147-152) uses `.or('user_id.eq.<id>,owner_id.eq.<id>')`

DB still shows 26 beats matching Mokshith by `user_id` / `owner_id`.

So the data + code are correct. The device is showing stale results because either (a) the new JS bundle was never published / fetched, or (b) `effectiveUserId` on the screen isn't Mokshith's id (team-view picker), or (c) the network call is failing silently and only stale cache renders.

## Diagnosis — do these in order

### 1. Confirm the new bundle is actually live

- Open `https://field-sales-navigator.lovable.app/my-visit` in a **desktop browser** (incognito) while logged in as Mokshith.
- Open DevTools → Network → filter `beats?`. Reload Journey Plan.
- The request URL must contain `or=(user_id.eq.73044cad...,owner_id.eq.73044cad...)`.
  - If it still contains `created_by=eq...` → the project was NOT republished. Click **Publish → Update** in Lovable.
  - If the `or=...` query is present and returns 26 rows → bundle is live. Move to step 3.
  - If the `or=...` query returns 0 rows → move to step 2.

### 2. Check which user the screen is querying

`BeatPlanning.tsx` uses `effectiveUserId` which can be overridden by the team/subordinate picker (`selectedUserId`). If Mokshith opened the page while a subordinate was selected, the query runs for that subordinate, not him.

- In DevTools console on the same screen: `console.log(window.__effectiveUserId)` is not exposed, so instead check the `beats?...or=...` request URL — confirm the UUID matches Mokshith (`73044cad-2c19-4a47-89f1-6a755adc3362`).
- If it doesn't, switch the user-picker back to "Self" / "My View" and reload.

### 3. Force the Android device to drop stale caches

Stale state can live in three layers on the phone. Clear them in this order; stop as soon as Journey Plan shows 26 beats.

1. **Service-worker / JS bundle** — fully kill the app from the Android task switcher (swipe away), then reopen. The SW does network-first for `index.html` (per project memory), so cold start refetches the new bundle.
2. **In-app IndexedDB / Capacitor Preferences cache** — open **My Beat** first. Its network sync calls `offlineStorage.save(STORES.BEATS, ...)` for each of the 26 beats, overwriting the old entries. Then open My Visit → All Beats → Journey Plan.
3. **Nuclear option (if 1+2 don't work)** — Android Settings → Apps → field-sales-navigator → Storage → **Clear cache** (not Clear data — that would log him out). Reopen and sign in is preserved; caches rebuild from network.

### 4. If still empty after steps 1-3

Capture from Mokshith's device (Chrome → `chrome://inspect` → remote debug the WebView, or just relay console logs):

- The full `beats?...` request URL and response status/body.
- Console line `[BeatPlanning] 🌐 Updated N beats from network` — what is N?
- Console line `[BeatPlanning] ⚡ Loaded N beats from cache instantly` — what is N?

If network returns 26 but UI shows 0, there's a render-side filter (`filteredBeats` at L370 uses `searchQuery`/`category`) — check the search box and category tabs are not filtering everything out.

## What is NOT the problem

- DB data: 26 beats + 654 retailers verified for Mokshith.
- Source code: patch verified in `BeatPlanning.tsx` L102-105 and L147-152.
- APK: not involved — the APK loads the web bundle remotely from `field-sales-navigator.lovable.app`.

## Most likely cause (90% confidence)

The project was edited but **not republished**, so the live URL still serves the pre-patch bundle. Step 1 above resolves it in one click.

---

## Original restore reference (kept for context)

### Current DB state (Mokshith = `73044cad-2c19-4a47-89f1-6a755adc3362`)

Active beats matched by column:
- `user_id` = Mokshith → **26**
- `owner_id` = Mokshith → **26**
- `created_by` = Mokshith → **9** (only his originally-created ones)
- `user_id IS NULL` → 35 (legacy/unrestored — unrelated)

Retailers:
- `user_id` = Mokshith → **654**
- `created_by` = Mokshith → 634

## Will the restore show correctly?

| Screen | Filter column | Will show | Status |
|---|---|---|---|
| My Beat (`MyBeats.tsx` L283-284, 326) | `user_id` (cache also accepts `created_by`) | **26 beats** | ✓ Correct |
| My Visit → All Beats (`BeatPlanning.tsx` L102, L148) | `created_by` only | **9 beats** | ✗ Misses 17 restored beats |
| Retailers (any screen filtering `retailers.user_id`) | `user_id` | 654 | ✓ Correct |

So the restore data is fine — the bug is purely the `BeatPlanning.tsx` filter mismatch you already identified.

## Fix (single file, frontend-only)

**`src/pages/BeatPlanning.tsx`**

1. **Cache filter (line ~102)** — switch from `created_by` to ownership:
```ts
const userBeats = cachedBeats.filter((b: any) =>
  b.is_active !== false &&
  (b.user_id === effectiveUserId || b.owner_id === effectiveUserId)
);
```

2. **Network query (line ~144-149)** — replace `.eq('created_by', …)` with ownership OR:
```ts
.from('beats').select('*').eq('is_active', true)
  .or(`user_id.eq.${effectiveUserId},owner_id.eq.${effectiveUserId}`)
```

No DB migration, no changes to MyBeats, no changes to BeatTransferDialog.

## Deploying without a new APK

The Android app already loads the web UI remotely from Lovable (`capacitor.config.ts` → `server.url: 'https://field-sales-navigator.lovable.app'`). This matches the project's **Live Update Architecture** memory — JS/TS changes go live via OTA the moment they're published.

**Steps for Mokshith (no APK rebuild needed):**
1. Apply the BeatPlanning.tsx patch above.
2. Publish the project (Lovable → Publish) — this updates `field-sales-navigator.lovable.app`.
3. On Mokshith's device:
   - Pull to refresh, or fully close & reopen the app (service worker fetches new bundle).
   - One-time cache clear may be needed: the BeatPlanning cache-load path filters the *local IndexedDB* (`STORES.BEATS`) which still contains the old beats. Two ways to refresh:
     - **Easiest:** open My Beat first — its network sync (`MyBeats.tsx` L322-336) overwrites `STORES.BEATS` cache with all 26 beats. Then open Journey Plan.
     - Or just be online when opening Journey Plan — the patched network load will repopulate cache.
4. Confirm Journey Plan shows 26 beats matching My Beat.

## Verification checklist

- Mokshith → My Beat: 26 beats, 654 retailers (already working).
- Mokshith → My Visit → All Beats: 26 beats after patch + publish.
- Manvith → My Visit → All Beats: transferred beats no longer appear (expected).
- Offline mode after one online sync: cache holds 26 beats, Journey Plan still shows 26.

## Optional follow-up (not part of this patch)

`BeatTransferDialog.tsx` leaves `created_by` pointing to the original creator. That's historically correct but means any other code still filtering by `created_by` will miss transferred beats. If you want, a future sweep can audit other `created_by` filters across the codebase and align them with ownership.
