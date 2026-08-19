# Personal Tracker (HabitTracker) - auto-build APK with GitHub Actions

Every push to `main` rebuilds the APK from your web files, signs it, and
publishes it. Same flow you already have working for Actionables.

## What this app needs (already configured)
Personal Tracker is a PWA (no native bridge). The wrapper grants:
- Notifications (POST_NOTIFICATIONS) - for habit reminders
- Vibrate - reminder buzz
- Internet + Network state - Firebase sync
- Blob/data download handling - so the Excel (.xlsx) export saves to Downloads
It also enables DOM storage + service worker so offline mode and localStorage work.

## Files
```
.github/workflows/build-apk.yml          builds the APK on every push
.github/workflows/generate-keystore.yml  one-time: makes + commits the signing key
android-wrapper/                          native shell + build-apk.sh
SETUP-CI.md                               this file
```

## One-time signing setup (no base64 to copy)
1. Settings > Secrets and variables > Actions > New repository secret
     Name:  KEYSTORE_PASSWORD
     Value: a password you choose (remember & back up)
2. Actions > "(One-time) Generate signing keystore" > Run workflow.
   It commits android-wrapper/keystore.b64 to main (that commit triggers a build).

Done. No KEYSTORE_BASE64 / KEY_ALIAS / KEY_PASSWORD secrets needed.

## Get the APK
- Push any change, or run "Build Android APK" from the Actions tab.
- Download from the run's Artifacts (PersonalTracker-apk), or:
  https://github.com/<you>/HabitTracker-web/releases/latest/download/PersonalTracker.apk

## Versioning (automatic - nothing to edit)
The build sets versionCode = the GitHub Actions run number (always increasing)
and versionName = 1.0.<run number>. Every build is installable over the last
without touching the manifest. You never edit version numbers by hand.
(If you ever want to jump to a marketing version like 2.0, tell me and I'll
change the name format; the code stays tied to the run number so updates keep
installing cleanly.)

## Security note
keystore.b64 in the repo IS your signing key. Fine in a PRIVATE repo. If public,
anyone could sign apps as you - make the repo private or ask for an encrypted
variant. The password is never committed.
