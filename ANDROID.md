# Seen Android app (APK)

The Android app is a Capacitor shell that opens the live store at
https://seen-online.lovable.app. Publish the website and the app shows the
update. You only need to rebuild the APK to change the app's name, icon or ID.

## Build the APK on your computer
1. Install Android Studio (it includes the Android SDK and Java).
2. Download this project (GitHub export) and run `npm install` in its folder.
3. Run `npx cap sync android`.
4. Run `npx cap open android`. Android Studio opens the project.
5. In Android Studio choose **Build → Build App Bundle(s) / APK(s) → Build APK(s)**.
   The file appears in `android/app/build/outputs/apk/debug/app-debug.apk`.
6. For Google Play use **Build → Generate Signed App Bundle / APK** and keep
   your signing key safe.

App ID: `app.seen.online` (change in `capacitor.config.ts` before the first Play upload).
