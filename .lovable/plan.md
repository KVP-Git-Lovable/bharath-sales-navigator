

# Plan: Hide Test Crash Button

## What
Remove the "Test Crash" button from the Navbar menu while keeping all Crashlytics initialization and reporting logic intact.

## Changes

### `src/components/Navbar.tsx`
- Remove the Test Crash `<button>` block (lines 355-369)
- Update the comment on line 353 to just say "Logout Button"
- Remove the `Bug` icon import and `testCrash` import if no longer used elsewhere in this file

### No changes to:
- `src/utils/crashlytics.ts` — `initCrashlytics()`, `logCrashlytics()`, `recordCrashlyticsError()`, `setCrashlyticsUser()` all remain as-is
- `src/main.tsx` — Crashlytics initialization continues to run on app start
- Native plugins (Android/iOS) — unchanged, crash reports will still be sent

Crashlytics will continue to capture real crashes and non-fatal exceptions automatically via the native SDK. Only the manual test trigger button is removed.

