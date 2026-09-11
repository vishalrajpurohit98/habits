# V1.4.2 / Version 35

- Journal editor now supports rich formatting: bold, italic, underline, ordered/unordered lists, blockquote and clear formatting.
- Journal content is stored as sanitized HTML and rendered safely; AI uses plain-text extraction.
- Added persisted custom journal templates with create/edit/delete. Templates live in `state.set` and follow existing Firestore `set:all` synchronization.
- No journal media or attachment storage.
- Removed AI Chat Ask/Plan/Analyze/Act mode selector. The chatbot now uses one simple conversational input.
- Strengthened AI action contract: explicit create/update/complete requests must return executable action JSON.
- Added `tracker:ai-action` event dispatch and post-save verification for AI-created habits, tasks and expenses.
- Existing confirmation/pending-action logic remains for destructive and incomplete actions.
