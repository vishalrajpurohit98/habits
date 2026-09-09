# V11 — Conversational Voice Mode

- Preserves the existing AI Assistant tab and text-command workflow.
- Adds a separate conversational Voice Mode with animated microphone, live speech transcript, AI action execution, spoken response, and automatic turn-taking.
- Android uses native SpeechRecognizer + native TTS when available.
- Browser uses Web Speech API + speechSynthesis fallback.
- Existing one-shot AI microphone remains intact.
- Original app navigation animations retained; V3 enhanced navigation motion is not used.
- Existing production keystore is retained unchanged.
