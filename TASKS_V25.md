# TASKS V25 — Fast Voice Response

- Removed Gemini TTS from the normal Android Voice Mode response path.
- Voice Mode now starts local Android TextToSpeech immediately after the AI text response is available.
- Browser fallback uses SpeechSynthesis immediately.
- Gemini TTS remains only as a last-resort fallback when local speech is unavailable.
- Existing voice conversation context, confirmation gates, speech-completion behavior, and stable non-Live architecture are preserved.
