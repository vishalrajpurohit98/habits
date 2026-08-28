# Tasks module v11

Tasks were added on top of the existing HabitTracker baseline without replacing the existing application structure.

## Core model

Tasks persist in `state.tasks` and participate in the existing local persistence, native state backup, Firestore record sync, JSON backup/restore, and full Excel export.

## Habit integration

Habit occurrences shown in Tasks are virtual views of the existing Habit occurrence for today. They use the existing habit completion record instead of creating a second completion record.

## Reminders

Task reminders use the existing Android `Bridge.setAlarms()` / `NativeAlarms` pipeline. Web notifications use the existing browser notification path.

## Recurrence

Recurring tasks generate the next occurrence only after the current occurrence is completed. Duplicate occurrences are prevented by series ID + due date. Monthly recurrence preserves the original day-of-month anchor and falls back to the last valid day for short months.

## Exports

The Tasks tab supports Today, This week, Next 7 days, This month, and Custom ranges. Excel uses the existing XLSX library. PDF uses a small self-contained PDF generator so Android and web builds can produce a real `.pdf` file without a second library.
