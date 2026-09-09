# V21 — Gemini Live setup schema fix

- Fixed invalid Live API context window compression payload.
- `targetTokens` is now correctly nested under `slidingWindow`.
- Removed invalid sibling `targetTokens` field that caused WebSocket close code 1007.
- Reuses stored Gemini Live session-resumption handle when available.
- Preserved 2-second voice completion window, tool calling, safety confirmation, and existing AI/fallback voice paths.
- Version 1.2.8 / code 21.
