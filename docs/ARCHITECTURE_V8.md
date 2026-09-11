# HabitTracker v8 stability changes

## Core changes
- Firestore sync uses per-record documents under `users/{uid}/records/{recordId}` instead of replacing the whole app state.
- Recurring transactions use `nextDate`, `status`, `last`, and `skipNext`; missed historical occurrences are not silently posted.
- Habit quota due dates count only completions before the candidate date, keeping historical due status stable.
- Credit-card outstanding balance is represented as a liability (`max(0, -ledgerBalance)`) and payments are transfers.
- AI destructive actions use an explicit Confirm/Cancel step.
- Imports and split transactions use rollback snapshots so a failed operation restores the original transaction list.
- Receipt images are stored in IndexedDB (`HabitTrackerMedia`) and only a media key remains in application state.
- Base currency is protected after transactions exist; foreign imports require an explicit FX rate.

## Firestore
Deploy `firestore.rules` after deploying the web app so authenticated users can access their `records` subcollection.
