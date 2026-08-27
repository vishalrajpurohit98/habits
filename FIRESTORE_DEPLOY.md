# Firestore rules deployment

The app uses Firebase project `habits-644e7` and the included `firestore.rules`.

Run once from the project root:

```bash
firebase login
firebase use habits-644e7
firebase deploy --only firestore:rules
```

Then reload the app, sign in again if required, and tap **Sync now**.

The rule allows a signed-in user to read/write only `users/{their-auth-uid}`.
