# V22 — Gemini Live clean-close recovery

- Fixed clean WebSocket code 1000 leaving Voice Mode dead after a successful setup.
- Added automatic reconnect with bounded retries and backoff.
- Added generation guard so intentional shutdown cannot trigger an unwanted reconnect.
- Added stale session-resumption handle recovery for 1007/1008 reconnect failures.
- Removed deprecated input transcription languageCodes hint; server can auto-detect speech language.
- Kept 2-second server-side silence completion and low end-of-speech sensitivity.
- Simplified context-window compression to the documented slidingWindow default.
- Preserved function calling, safety confirmation, conversation context, and existing fallback voice paths.
- Version 1.2.9 / code 22.
