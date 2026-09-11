# V1.3.7 — Conversational Voice Follow-up Hardening

- Added deterministic evidence gate so AI cannot silently invent missing habit frequency or task priority/due date.
- Added follow-up gates for mood, sleep, workout, journal, and expense category.
- Sleep now requires two explicit time values before save.
- Task priority must be explicitly supplied (high/medium/low).
- Habit frequency must be explicitly supplied.
- Clears the live transcript after a turn is finalized so the last spoken phrase is not shown as if it is still being processed.
- Android speech finalization remains ~2.8 seconds; UI shows “Finishing…” rather than “Thinking…” during that window.
