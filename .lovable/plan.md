

## Add "Test Crash" Button to Navigation Menu

### What This Does
Adds a "Test Crash" button above the Logout button in the navigation menu. When tapped, it calls the existing `testCrash()` function from `src/utils/crashlytics.ts`, which triggers a native Firebase Crashlytics test crash on Android/iOS. On web (where Crashlytics is unavailable), it shows a toast message explaining the feature only works on native devices.

### Changes

**File: `src/components/Navbar.tsx`**

1. Import `testCrash` from `@/utils/crashlytics` and `Capacitor` from `@capacitor/core`, plus the `Bug` icon from `lucide-react`
2. Import `toast` from `sonner` (if not already imported)
3. Add a `handleTestCrash` function that:
   - On native platform: calls `testCrash()` which triggers `FirebaseCrashlytics.crash()` -- this will crash and restart the app
   - On web platform: shows a toast saying "Test Crash only works on native Android/iOS devices"
4. Add the "Test Crash" button in the bottom section (line ~348), just above the Logout button, with a warning/bug icon and amber/orange styling to distinguish it from the destructive logout button

### UI Placement

```text
 ┌──────────────────────────┐
 │  ... nav items ...       │
 │                          │
 │ ─────── border ───────── │
 │  [Bug] Test Crash        │  <-- new button (amber styling)
 │  [LogOut] Logout         │  <-- existing button (red/destructive)
 └──────────────────────────┘
```

### Technical Details

- The `testCrash()` function already exists in `src/utils/crashlytics.ts` and handles the `initialized` guard
- On native, it calls `FirebaseCrashlytics.crash({ message: 'Test crash from app' })` which triggers a real native crash -- the OS will restart the app, and the crash report will appear in the Firebase Crashlytics console
- On web, we short-circuit before calling `testCrash()` and show a user-friendly toast instead
- Only one file needs to be modified: `src/components/Navbar.tsx`

