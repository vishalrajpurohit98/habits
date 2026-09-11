# Personal Tracker — Firestore-only sync

This build starts clean and uses **Firebase Authentication + Cloud Firestore**. It does not read from or write to Firebase Realtime Database.

## Firebase configuration

The supplied Firebase Web App configuration for project `habits-644e7` is built into `index.html`. The app does not require manual Firestore collection creation.

## Firestore rules

Deploy the included `firestore.rules`:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Authentication

In Firebase Console → Authentication → Sign-in method, enable **Email/Password**.

## First sync

1. Install/open the new build.
2. Go to Settings → Cloud sync.
3. Create an account or sign in.
4. The app creates `users/{uid}` automatically on the first sync.
5. Create or edit any task/habit. Local state is saved immediately and then pushed to Firestore.

## Realtime Database

Realtime Database is intentionally not used by this build. Keep the old RTDB service enabled only while validating that older app versions are no longer needed. Once verified, it can be disabled/decommissioned separately from Firestore and Authentication.

## Offline

The application remains local-first. `localStorage` is written immediately, while Firestore persistence provides cached cloud state and queues cloud writes when supported. The UI exposes `Synced`, `Offline (cached)`, `Syncing…`, and `Sync error`.
