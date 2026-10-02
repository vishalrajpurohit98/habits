# Google setup — "Continue with Google" + journal photos on Google Drive (phone and web)

One Google account now does both jobs:
- **Cloud sync sign-in** (Firebase Authentication with Google) — habits, tasks, money, journal text…
- **Journal photos** in a hidden, app-private folder of the same account's Google Drive (`drive.appdata` scope:
  the app can't see any other Drive file; photos use the user's own Drive storage; nothing on your servers).

Existing email/password accounts keep their data: signing in with password and tapping **Link Google** attaches
Google to the *same* account.

Your Firebase project: **habits-644e7**. Example site address below: `https://vishalrajpurohit98.github.io` —
use your real one.

## 1. Turn on Google sign-in in Firebase
Firebase console → **Authentication → Sign-in method → Add new provider → Google → Enable** → set the support email
→ **Save**. Open the Google provider again and copy the **Web client ID** under *Web SDK configuration*
(looks like `34132591511-xxxxxxxx.apps.googleusercontent.com`).

## 2. Put the Web client ID in the app (once, for every device)
In `index.html` find this line and paste the ID between the quotes, then commit and push:
```
var GOOGLE_WEB_CLIENT_ID = '';
```
(Alternative for testing on one device: Settings → Cloud sync → Reconfigure → add `"googleClientId": "…"` to the JSON.)

## 3. Web: allow your website
1. Host the web app at a fixed **https** address (GitHub repo → Settings → Pages → Deploy from branch `main` / root
   gives `https://vishalrajpurohit98.github.io/habits/`).
2. Firebase → **Authentication → Settings → Authorized domains → Add domain** → `vishalrajpurohit98.github.io`
3. Google Cloud console (same project) → **APIs & Services → Credentials → "Web client (auto created by Google
   Service)" → Authorized JavaScript origins → Add** `https://vishalrajpurohit98.github.io` → Save.
   (Origins are just scheme + domain, no `/habits/` path.)

Google sign-in does not work from a downloaded HTML file (`file://`); open the app from the website.

## 4. Android: register the app
1. **APIs & Services → Library → Google Drive API → Enable** (if not done yet).
2. **Credentials → Create credentials → OAuth client ID → Android**: package `com.actionables.personaltracker.app`
   + the **SHA-1** printed in every GitHub Actions build log ("signing certificate … SHA-1 digest").
   This one client serves both Continue with Google and Drive photos. No ID goes into the Android code.

## 5. OAuth consent screen
**Google Auth Platform → Data access → Add scopes**: `openid`, `email`, `profile`, and
`https://www.googleapis.com/auth/drive.appdata`. While the app is in *Testing*, add every Google account that will use
it under **Audience → Test users** (e.g. lusifer.jack.1255@gmail.com). **Publish** when ready for everyone.

## 6. Use it
- **New device**: Settings → Cloud sync → **Continue with Google** → choose the account. Drive photo sync connects
  automatically with the same account.
- **Already signed in with email + password**: Settings → Cloud sync → **Google account → Link Google**.
  Same account, same data; from then on either sign-in works.

## Troubleshooting
| Message | Fix |
|---|---|
| "needs one setup step: add your Google Web client ID" | Step 2 |
| "Add this website to … Authorized domains" | Step 3.2 |
| Google window says `origin_mismatch` / `redirect_uri_mismatch` | Step 3.3 |
| "isn't configured for this app build (check the OAuth clients and SHA-1)" (Android) | Step 4.2 — SHA-1 of the installed APK |
| "This email already has a password sign-in…" | Sign in with email + password, then **Link Google** |
| "This Google account is already linked to a different Momentum account" | That Google account already has its own sync account; sign out and use Continue with Google to open it |
| Access blocked / not a test user | Step 5 |
