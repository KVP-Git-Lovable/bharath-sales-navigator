# Android Photo Picker Policy — Compliance Check

## Verdict from the code in this project

This repository does **not** request `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, `READ_EXTERNAL_STORAGE`, or `WRITE_EXTERNAL_STORAGE` anywhere.

What was verified:

- `android/app/src/main/AndroidManifest.xml` declares exactly one permission: `INTERNET`.
- Every Capacitor plugin's own manifest was inspected (camera, filesystem, geolocation, push, local-notifications, network, preferences, device, status-bar, native-settings, firebase crashlytics/performance). None declares a media/storage permission. The Camera plugin contributes only an `IMAGE_CAPTURE` `<queries>` entry.
- No Cordova plugin manifest exists contributing permissions.
- All ~20 media selection points in the app (profile photo, expense bills, competition photos, product images, branding, deliveries, onboarding docs, bulk import) use an HTML `<input type="file" accept="image/*">`. In the Capacitor WebView this opens the **system file/photo chooser**, which needs no runtime permission — exactly the behaviour the policy asks for.
- `src/utils/permissions.ts` only requests `Camera` (live capture) and `Geolocation`. It never requests the Camera plugin's `photos` permission alias, and never uses `CameraSource.Photos` or `Camera.pickImages`.
- `targetSdkVersion = 35` (Android 15), so the policy applies — and the code already complies.

Conclusion: the source in this project satisfies the Google Photo Picker policy as-is. No manifest edits or `PickVisualMedia` migration are needed in this codebase.

## So why did Play flag the app?

The rejection is coming from something outside this source tree. Likely causes, in order:

1. The flagged AAB was built from a different repo/branch (e.g. the preprod repository) or from an older commit that still declared the permissions.
2. An older release is still active on a Play track (production/open/internal). Play evaluates every active release, not just the newest.
3. The permission is injected at build time by a dependency or a manually edited manifest on the build machine.

## Proposed next steps

1. **Confirm the shipped artifact.** On the machine that built the uploaded AAB, run `./gradlew :app:processReleaseManifest` and inspect `android/app/build/intermediates/merged_manifest/release/AndroidManifest.xml` (or open the AAB via Android Studio > Build > Analyze APK). This shows exactly which permissions Play saw and which library injected them.
2. **Add a defensive removal guard** in `android/app/src/main/AndroidManifest.xml` so no dependency can ever re-inject them:
   - `xmlns:tools="http://schemas.android.com/tools"` on the `<manifest>` element
   - `<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" tools:node="remove" />`
   - the same for `READ_MEDIA_VIDEO`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`
   I can apply this now if you want it regardless of what step 1 finds.
3. **Retire old Play releases** that still carry the permission, then upload a fresh build and re-submit the policy declaration.
4. **Keep picking media via the file input.** No migration to `PickVisualMedia` is required — the WebView file chooser already routes to the Android system photo picker on 13+.

## Note worth checking before the next upload

The app manifest here declares only `INTERNET` — no `CAMERA` and no `ACCESS_FINE_LOCATION` (`POST_NOTIFICATIONS` is merged in by the local-notifications plugin). If attendance camera capture and GPS work in the released Android build, that build's manifest differs from this repo, which reinforces cause 1 above.

## Technical scope if you approve the guard

Single file touched: `android/app/src/main/AndroidManifest.xml` — add the `tools` namespace and four `tools:node="remove"` permission entries. No JS/TS, no plugin, no behaviour change. Requires `git pull` + `npx cap sync` before the next native build.