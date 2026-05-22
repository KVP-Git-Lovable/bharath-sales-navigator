# Verification & Fix: Mokshith's Restored Beats Visibility

## Current DB state (Mokshith = `73044cad-2c19-4a47-89f1-6a755adc3362`)

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
