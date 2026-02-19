

## Firebase Crashlytics Integration

### What Lovable Will Do (Code Changes)

1. **Install dependency**: Add `@capacitor-community/firebase-crashlytics` to `package.json`
2. **Copy `google-services.json`** into the project (for reference -- you'll also need to place it manually in the Android project)
3. **Create a Crashlytics utility** (`src/utils/crashlytics.ts`) that:
   - Initializes Crashlytics on app startup
   - Provides helper functions for logging errors, setting user IDs, and recording custom events
   - Only activates on native platforms (skips in browser)
4. **Initialize Crashlytics in `src/main.tsx`** during the background services setup

### What You Need to Do Manually (Native Setup)

After Lovable makes the code changes, you'll need to do the following in your local Android project:

1. **Export and pull** the latest code from GitHub
2. **Place `google-services.json`** in `android/app/google-services.json`
3. **Edit `android/build.gradle`** (project-level) -- add:
   ```text
   buildscript {
     dependencies {
       classpath 'com.google.gms:google-services:4.4.2'
       classpath 'com.google.firebase:firebase-crashlytics-gradle:3.0.3'
     }
   }
   ```
4. **Edit `android/app/build.gradle`** (app-level) -- add at the top:
   ```text
   apply plugin: 'com.google.gms.google-services'
   apply plugin: 'com.google.firebase.crashlytics'
   ```
   And add dependency:
   ```text
   dependencies {
     implementation platform('com.google.firebase:firebase-bom:33.8.0')
     implementation 'com.google.firebase:firebase-crashlytics'
   }
   ```
5. **Enable Crashlytics in Firebase Console**: Go to Firebase Console > Your Project > Crashlytics > Enable it
6. Run:
   ```text
   npm install
   npx cap sync android
   npx cap run android
   ```
7. **Force a test crash** from the app to verify Crashlytics is working (the utility will include a test crash function)

### Technical Details

**New file**: `src/utils/crashlytics.ts`
- Wraps `@capacitor-community/firebase-crashlytics` with safe initialization
- Exports: `initCrashlytics()`, `logCrashlytics()`, `setCrashlyticsUser()`, `testCrash()`
- No-ops gracefully on web/browser

**Modified file**: `src/main.tsx`
- Adds `initCrashlytics()` call in the background services block

**Modified file**: `package.json`
- Adds `@capacitor-community/firebase-crashlytics` dependency

