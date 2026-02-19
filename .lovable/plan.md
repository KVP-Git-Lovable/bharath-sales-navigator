

## Fix: Android Build Configuration Errors

The `android/app/build.gradle` file needs to be rewritten properly with Firebase Crashlytics support while fixing the issues. The current file is also incomplete (missing dependencies block, broken `repositories` declaration).

### Changes to `android/app/build.gradle`

**Fix 1: Namespace and applicationId** -- Keep as `"com.kvp.salesnavigator"` to match `google-services.json`

**Fix 2: `compilationOptions` to `compileOptions`** -- Fix the Gradle DSL keyword

**Fix 3: Restore complete file** -- The file currently appears truncated/broken (ends at line 29 with just `repositories`). It needs the full dependencies block, Firebase BoM, Crashlytics SDK, and the Capacitor build gradle apply.

The corrected file will include:
- `apply plugin: 'com.google.gms.google-services'` and `'com.google.firebase.crashlytics'` at the top
- `namespace` and `applicationId` set to `"com.kvp.salesnavigator"`
- `compileOptions` (not `compilationOptions`) with Java 21
- Complete `dependencies` block with Firebase BoM, Crashlytics, and Analytics SDKs
- Capacitor build gradle apply
- Google Services plugin conditional apply at the bottom

### No other files need changes

The `android/build.gradle` (root) already has the correct classpath dependencies, and `google-services.json` already uses `com.kvp.salesnavigator`.

