# Personal Tracker V1.3.1 — Voice Architecture Revert

- Removed Gemini Live / WebSocket voice architecture.
- Restored the stable turn-based voice architecture from V1.2.5: Android SpeechRecognizer/browser SpeechRecognition -> existing AI provider -> Gemini TTS/native TTS fallback.
- Preserved multi-turn voice context and persistent AI preference memory.
- Preserved safer exact/unique record resolution and destructive-action confirmation.
- Preserved live transcript UI and 2.6-second voice finalization layer.
- Preserved existing app functionality and signing key.
