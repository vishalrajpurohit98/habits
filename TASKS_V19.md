# Personal Tracker V1.2.6 — Gemini Live Voice

## Scope
- Replace turn-based voice mode with Gemini Live API over WebSocket for Gemini-provider voice sessions.
- Stream microphone PCM audio continuously and receive native streaming audio responses.
- Enable live input/output transcription.
- Use Gemini Live function calling for tracker actions.
- Preserve existing AI tab and non-Gemini/native fallback paths.
- Preserve confirmation gates for destructive actions.
- Carry app data, persistent preferences, and active voice context into the Live session.
- Configure automatic speech activity detection with a 2-second silence duration to reduce premature turn completion.
- Add Android WebView microphone permission handling for the live audio stream.

## Validation
- JavaScript syntax: 5/5 scripts passed Node syntax validation.
- Android Java braces: balanced 248/248.
- Android Manifest XML: valid.
- Existing signing keystore preserved.
- APK build script could not be executed in this container because `ANDROID_HOME` is not configured.
