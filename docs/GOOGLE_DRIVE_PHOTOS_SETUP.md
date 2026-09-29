# Journal photos on Google Drive — one-time setup (about 15 minutes)

Momentum stores journal photos in a **hidden, app-private folder in each user's own Google Drive**
(Google's `drive.appdata` scope). The app cannot see or change any other Drive file, and nothing is stored on your
servers, so there is no storage cost for you. Photos count toward the user's own Drive quota (15 GB free).

Google only allows sign-in for an app it knows, so you register the app once. **No keys or IDs go into the code**:
Google recognises the app by its package name + signing certificate.

## 1. Get your signing certificate's SHA-1
Every build now prints it. Open the latest **GitHub Actions → Build APK** run and find, in the "Build APK" step:
```
>> signing certificate (add this SHA-1 to the Android OAuth client ...):
Signer #1 certificate SHA-1 digest: xxxxxxxx...
```
(Or run `keytool -printcert -jarfile Momentum.apk` on any release APK.)
If you later publish on Google Play with Play App Signing, also add the SHA-1 shown in
Play Console → Setup → App signing.

## 2. Google Cloud project
1. Open https://console.cloud.google.com and select your **existing Firebase project** (it is a Google Cloud project),
   or create a new one.
2. **APIs & Services → Library** → search **Google Drive API** → **Enable**.

## 3. OAuth consent screen
1. **APIs & Services → OAuth consent screen** (Google Auth Platform → Branding/Audience/Data access).
2. User type **External**. App name **Momentum**, your support email, developer email.
3. **Data access / Scopes → Add** `https://www.googleapis.com/auth/drive.appdata`.
4. **Audience → Test users**: add the Google accounts that will test (while the app is in *Testing*, only these
   accounts can connect). When ready for everyone, press **Publish app**. `drive.appdata` is a narrow scope; Google
   may still ask for its standard brand verification before showing your app name to all users.

## 4. Android OAuth client
**APIs & Services → Credentials → Create credentials → OAuth client ID**
- Application type: **Android**
- Package name: `com.actionables.personaltracker.app`
- SHA-1: the value from step 1
Create one Android client per signing certificate you use (release, and Play App Signing if applicable).

## 5. Use it
Install the new APK → **Settings → Cloud sync → Journal photos on Google Drive → Connect** → pick the Google
account → allow. From then on photos upload after you save an entry, and missing photos download when the app opens
or returns to the foreground, on every phone connected to the same Google account.

## Troubleshooting
| Message | Cause |
|---|---|
| "Google sign-in isn't configured for this app build" | SHA-1 or package name in step 4 doesn't match the installed APK |
| Consent screen says access blocked / not a test user | Add the account in step 3.4 or publish the app |
| "Google Drive needs your permission again" | Access was revoked: Disconnect, then Connect |
| Users can remove the data | Google Drive → Settings → Manage apps → Momentum → Delete hidden app data |
