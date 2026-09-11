# V1.4.2 — Stable V1.4.0 Baseline + Journal

- Rebuilt from the known-working V1.4.0 AI Chat Intelligence + TTS baseline.
- Preserved AI Chat modes, contextual intelligence, deterministic analytics, action validation, compound actions, pending-action continuity, speech input and per-response text-to-speech.
- Added/retained Journal as a dedicated first-class tab without changing the existing app architecture.
- Journal is text-only: no photos, videos, audio attachments, documents, or Firebase Storage dependency.
- Journal supports timeline, calendar, search, tags, prompts, templates, mood, streaks, On This Day, tracker context, AI reflection/planning, and entry-level AI actions.
- Journal entries remain part of the existing local state and Firestore sync/backup model.
- Existing signing keystore is preserved.
- No separate Voice Mode/assistant is introduced.
