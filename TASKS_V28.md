# V1.3.5 — Conversational Required-Field Follow-ups

## Goal
Prevent the voice assistant from silently creating partially specified habits, tasks, moods, sleep records, workouts, or expenses.

## Changes
- Added deterministic client-side required-field validation before any AI action mutates state.
- Habit creation now requires an explicit schedule/frequency.
- Task creation now asks for a due/scheduling choice; “no due date” is an explicit valid answer. Recurrence is preserved when requested.
- Mood logging now requires an explicit mood and never silently defaults to Neutral.
- Sleep logging now requires both bedtime and wake time and no longer silently defaults to 23:00/06:00.
- Workout logging requires an exercise and at least one workout value/set.
- Expense creation requires amount and category; category is not silently defaulted to Other when omitted.
- Strengthened the AI conversation prompt to collect one smallest missing detail at a time and carry previous details forward.
- Voice confirmations now speak only the concise human confirmation message rather than implementation/detail strings.
- Existing conversation context, safe record matching, interruptible voice, fast local TTS, and non-Live architecture remain intact.

## Expected examples
- “Add a habit for drinking water” → “How often should I schedule drinking water?”
- “Add a task to call John” → “When should I schedule it? You can give a date/time or say no due date.”
- “Log my mood” → “How are you feeling?”
- “Log my sleep” → “What time did you go to bed?” then “What time did you wake up?”
- “Log a workout” → “Which exercise did you do?” then workout values/sets.
