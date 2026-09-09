# Personal Tracker — Android WebView Wrapper

This package converts the supplied **Personal Tracker** web application into an Android APK using a custom native Java WebView wrapper.

## Source-of-truth rule

The existing web application was preserved. No HTML, CSS, JavaScript, Firebase configuration logic, localStorage logic, theme logic, service worker, fonts, icons, or XLSX library was redesigned or replaced.

The APK loads the bundled web application from:

```text
file:///android_asset/web/index.html
```

The browser/PWA deployment remains usable from the original web files.

### Android-only additions

The native wrapper supplies the Android capabilities that the web application already expects through its existing `Bridge` object:

- native notification scheduling
- notification permission handling
- exact-alarm access status
- native date/time pickers
- Android file save to Downloads
- Android file sharing
- JSON backup/import
- journal photo storage
- native speech input
- Android status/navigation bar theme colors
- native state persistence backup
- Android back navigation
- boot/reinstall alarm restoration

No changes to the web application were required for these bridge methods because the supplied application already checks for `Bridge`.

## Project structure

```text
HabitTracker-Android/
├── index.html
├── manifest.json
├── sw.js
├── firebase-app-compat.js
├── firebase-auth-compat.js
├── xlsx.min.js
├── *.ttf
├── icon-192.png
├── icon-512.png
├── android-wrapper/
│   ├── AndroidManifest.xml
│   ├── build-apk.sh
│   ├── version.properties
│   ├── README.md
│   ├── src/
│   │   └── com/actionables/personaltracker/app/
│   │       ├── MainActivity.java
│   │       ├── NativeAlarms.java
│   │       ├── NativeFileProvider.java
│   │       ├── BootReceiver.java
│   │       └── NotifReceiver.java
│   └── res/
│       ├── drawable/
│       ├── mipmap-anydpi-v26/
│       ├── mipmap-*/
│       ├── values/
│       └── values-v31/
└── .github/
    └── workflows/
        ├── build-apk.yml
        └── generate-keystore.yml
```

## Build architecture

```text
Existing Web App
       ↓
Bundled Android assets
       ↓
Native Java WebView
       ↓
Android APK
       ↓
GitHub Actions
```

The local Windows machine does **not** need:

- Android Studio
- Gradle
- Node.js
- npm
- npx
- Capacitor
- Cordova
- Flutter

GitHub Actions supplies Java and the Android command-line SDK tools.

## Signing setup — production key is preserved

The project intentionally keeps the existing production signing key at:

```text
android-wrapper/keystore.b64
android-wrapper/keystore.alias
```

This is the same key used to sign future APK releases. **Do not delete, replace, or regenerate it.** Keeping the same signing certificate allows Android to recognize future APKs as updates to the existing installed app.

The keystore password is supplied through the GitHub Actions secret:

```text
KEYSTORE_PASSWORD
```

The build workflow decodes `keystore.b64` temporarily on the GitHub runner, signs the APK, and does not place the raw keystore into the build output.

> Security note: keeping a production private signing key in the repository is convenient, but it is less secure than keeping the base64 keystore only in GitHub Secrets. Since you specifically want the current key preserved for uninterrupted updates, this project keeps `keystore.b64` and protects it from accidental regeneration.

### Important

The **Generate signing keystore** workflow is only for initial setup. It now refuses to run if `android-wrapper/keystore.b64` already exists. **Never use that workflow to create a replacement key for a normal release.**

## Versioning

Version information is stored in:

```text
android-wrapper/version.properties
```

Current values in this project are:

```text
versionCode=3
versionName=1.1.0
```

GitHub Actions now reads these values directly. It no longer replaces them with the GitHub workflow run number.

For every release, increase `versionCode` and set the desired `versionName`, for example:

```text
versionCode=4
versionName=1.2.0
```

`versionCode` must always increase for an APK update.

## Every future release

After making web-app or Android-wrapper changes:

```powershell
git add .
git commit -m "Update Personal Tracker"
git push origin main
```

The push to `main` automatically starts:

**Actions → Build Android APK**

You can also run the workflow manually:

**Actions → Build Android APK → Run workflow**

## Windows workflow

The intended local process is only:

```text
Edit web application
      ↓
Replace/update files in GitHub repository
      ↓
git add .
      ↓
git commit
      ↓
git push
      ↓
GitHub Actions builds APK
      ↓
Download APK artifact
```

No local Android build environment is required.

## Where the APK is produced

After a successful workflow:

**GitHub → Actions → Build Android APK → successful run → Artifacts**

Download the artifact named approximately:

```text
PersonalTracker-1.0
```

It contains:

```text
PersonalTracker.apk
```

The APK is also created by the build script at:

```text
dist/PersonalTracker.apk
```

inside the GitHub Actions runner.

## Android permissions

Only permissions used by the wrapper are declared:

| Permission | Purpose |
|---|---|
| `INTERNET` | Firebase/API/network access |
| `POST_NOTIFICATIONS` | Android 13+ reminder notifications |
| `SCHEDULE_EXACT_ALARM` | Exact habit reminder timing where Android allows it |
| `RECORD_AUDIO` | Native speech input |
| `VIBRATE` | Reminder notification vibration |

The APK targets Android API 34 and uses a minimum Android API level of 24.

## Notifications

The supplied web application already sends its reminder schedule to:

```javascript
Bridge.setAlarms(...)
```

The wrapper converts those alarm entries into Android `AlarmManager` alarms.

It also provides:

- notification channel
- Android 13+ notification permission
- exact alarm status
- boot/reinstall alarm restoration
- notification tap navigation back into the relevant habit

If exact-alarm access is unavailable, Android may use an inexact alarm instead. The existing app already exposes this state in its settings.

## Themes

The web application already calls:

```javascript
Bridge.setBars(backgroundColor, isLight)
```

The native wrapper uses this to update the Android status/navigation bars.

The supplied web application already contains:

- Dark
- AMOLED
- Light
- Auto

AMOLED uses true-black web surfaces, and the native status/navigation bars are also set to `#000000`.

## Offline behavior

The web application is bundled inside the APK.

The service worker is intentionally not used for the `file://` Android load because the supplied service worker only registers for HTTP(S) pages. This does not remove the application's offline data functionality: the HTML, JavaScript, fonts, Firebase compatibility scripts, XLSX library, manifest, and icons are packaged directly into the APK.

Firebase cloud sync uses Cloud Firestore + Firebase Authentication. The app remains usable offline; Firestore sync resumes when connectivity returns.

## Security notes

- SSL certificate verification is not disabled.
- Cleartext HTTP is disabled.
- The JavaScript bridge exposes only the methods required by the existing application.
- The signing keystore is never committed to the repository.
- Signing passwords are supplied only through GitHub Secrets.
- Do not put API keys or Firebase credentials into the Android wrapper unless the web application itself already requires them.
- Treat the production signing key as a permanent secret.

## Validation performed on the source package

The supplied ZIP was inspected before creating the wrapper.

The application contains:

- `index.html` as the main entry point
- inline application CSS/JavaScript
- localStorage state
- Firebase compatibility scripts
- service-worker configuration
- PWA manifest
- XLSX export library
- native bridge hooks already present in the JavaScript
- Dark/Light/AMOLED theme handling
- web and native reminder paths
- Android-specific export, import, photo, speech and picker hooks

The supplied application files were copied into the final project without redesigning the UI or replacing the application logic.

## Cloud sync

The current app uses **Firebase Authentication + Cloud Firestore**. Data is stored in `users/{uid}` and protected by `firestore.rules` so a signed-in user can only access their own document.

The web app remains local-first: `localStorage` is written immediately, while Firestore synchronizes the complete application state. Firestore persistence uses multi-tab synchronization where supported.

## Cloud sync configuration

This build uses **Firebase Authentication + Cloud Firestore only**. Realtime Database is not used by the application. The Firebase Web App configuration is preconfigured in `index.html`. The Firestore security rules are provided in `firestore.rules`.

No Firestore collections or documents need to be created manually. After a user signs in and the first sync occurs, the app creates `users/{uid}` automatically.
