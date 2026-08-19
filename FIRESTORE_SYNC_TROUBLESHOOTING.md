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
