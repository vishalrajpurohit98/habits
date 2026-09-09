# V20 — Gemini Live connection reliability

- Fixed Voice Mode hanging indefinitely at “Connecting to Gemini Live…”.
- Added explicit WebSocket connection timeout and session-setup timeout.
- Surface Gemini Live server errors instead of leaving the UI in Thinking state.
- Surface WebSocket close code/reason for diagnosis.
- Added Gemini Live input language hint (`en-IN`).
- Added session resumption/context compression configuration.
- Preserve 2-second server-side silence completion window.
- Preserve existing AI tab, fallback voice path, voice action safety, conversation context, and signing key.
