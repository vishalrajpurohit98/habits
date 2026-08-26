# Task Management v12

## Changes
- Task PDF export redesigned as a multi-page A4 task report with summary, priority/status, due date/time, descriptions, subtasks, progress, comments, page numbers, and clean wrapping/page breaks.
- Added multiple comments per task.
- Comments support add, edit, delete, timestamps, and immediate persistence for existing tasks.
- Added AI Rephrase per comment using the existing AI provider/key infrastructure.
- AI rephrase always shows a preview; the original comment is not replaced until the user selects `Use this`.
- Task Excel exports now include a Comments column as well.
- Existing Task data model remains backward compatible; old tasks receive an empty comments array during normalization.
- No new database, Firebase initialization, or notification system introduced.

## Limitation
- Comments can be added after the task is first saved. This avoids creating orphan comment records for an unsaved task.
- Browser/Android AI rephrase uses the existing AI configuration; no second AI input or provider was introduced.
