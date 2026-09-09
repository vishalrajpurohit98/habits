# V11 — Conversational Voice Mode

- Preserves the existing AI Assistant tab and text-command workflow.
- Adds a separate conversational Voice Mode with animated microphone, live speech transcript, AI action execution, spoken response, and automatic turn-taking.
- Android uses native SpeechRecognizer + native TTS when available.
- Browser uses Web Speech API + speechSynthesis fallback.
- Existing one-shot AI microphone remains intact.
- Original app navigation animations retained; V3 enhanced navigation motion is not used.
- Existing production keystore is retained unchanged.

## V1.2.5 Voice reliability / context pass
- 2.6s silence/grace finalization for browser voice input.
- Android native recognition now allows continuation after an early recognition segment; final input is only submitted after 2.6s of no new speech.
- Voice context retains up to 18 turns and survives closing/reopening Voice Mode during the app session.
- Short follow-up answers are explicitly treated as continuations of the prior request.
- Habit and task destructive matching is exact/unique; ambiguous matches are rejected instead of silently choosing a record.
- Habit deletion uses the resolved habit ID for confirmation execution.
- Preference voice replies are added to conversation context so they do not leave Voice Mode waiting.
