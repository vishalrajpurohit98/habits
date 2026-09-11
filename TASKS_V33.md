# V1.4.0 — AI Chat Intelligence + TTS

- Expanded AI Chat into a natural-language operating layer using deterministic analytics from real tracker data.
- Added structured insight cards and daily briefing/planning entry points.
- Added multi-action support for compound requests while retaining deterministic validation and destructive confirmation.
- Strengthened conversational required-field handling and pending-action continuity.
- Added per-response text-to-speech Listen controls with Android native TTS and browser fallback.
- Kept optional speech input inside the normal AI Chat composer; no separate Voice Mode/assistant was reintroduced.
- Speech input now uses segmented recognition with a 2.6-second silence grace window. If the user speaks again during the grace window, the new segment is merged into the same request.
