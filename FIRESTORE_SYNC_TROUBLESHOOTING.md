# Firestore Sync Troubleshooting

If Settings shows `Sync error`, first check Firebase Console:

1. Authentication → Sign-in method → Email/Password is enabled.
2. Firestore → Rules → publish the included `firestore.rules`.
3. The rules must allow an authenticated user to read/write only `users/{their UID}`.
4. The app does not use Realtime Database.
5. Press Sync now after publishing the rules.

The build now exposes the Firebase/Firestore error in the Settings sync message instead of showing only a generic error.

Expected rule:

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```


## Compatibility mode

If an older Firebase project still has rules that allow access to `/users/{uid}` but not `/users/{uid}/records/{recordId}`, the app automatically falls back to a compatibility sync using the existing user document. This keeps sync working while the included record-level rules are being published.

After publishing the included `firestore.rules`, sign out/in or press **Sync now**; the app will use record-level sync when the `records` collection is permitted.
