# HabitTracker v9 — Removed recurring and prediction features

## Removed from the user-facing app
- Recurring transaction creation, management, skip/pause/end controls, and automatic posting.
- Money `Upcoming` tab.
- Smart/pattern-based upcoming expense predictions and smart expense reminders.
- 30-day recurring cash-flow forecast.
- Month-end spending projection in Money Insights.
- Recurring-expense prediction inside the offline pattern/insight engine.

## Preserved
- Existing posted transactions remain unchanged.
- Existing backup files remain readable.
- Legacy recurring state is retained only for backward-compatible state parsing; it is not executed, displayed, synced as a record, or editable.
- Core Money tabs remain: Transactions, Budgets, Accounts, Insights.
- Basic expenses, income, transfers, accounts, budgets, credit-card payments, imports, AI, habits, mood, sleep, workout, journal, backup/restore, and media storage remain available.

## Safety
- `runRecur()` is disabled.
- `saveRecur()` is disabled.
- Legacy recurring UI is hidden.
- Smart expense reminders are disabled in normalized settings.
- Service-worker cache was bumped so the new build is not served from the previous cached UI.
