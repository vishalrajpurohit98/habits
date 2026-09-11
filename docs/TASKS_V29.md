# V1.4.0 — Journal (text-only, multi-entry, AI-integrated)

## Goal
Replace the legacy photo-based journal with a text-first, multi-entry Journal that
integrates deeply with the existing AI Chat, TTS, and Firestore sync — without
breaking existing functionality.

## Navigation
- Journal is now a first-class tab (Today · Tasks · Mood · Money · Stats · **Journal** · AI · Settings).
- Inside Journal, an icon sub-nav splits the experience into focused views instead of
  one long page: **Timeline · Calendar · Write · Memories · Insights**, plus **Search**.

## Data model (new schema)
Each entry: `{id, date, time, title, content, mood, tags[], favorite, template, createdAt, updatedAt}`.
- Multiple entries per day are supported (no one-per-day limit).
- Legacy entries `{d, t, b, ph, created}` are auto-migrated in `normState` via `jrMigrateEntry()`.
  Photos are dropped (Journal is text-only in V1.4.0).

## Features
- Rich-text editor (bold, italic, heading, bullet/numbered lists, quote, checklist).
- Mood (Great/Good/Okay/Low/Difficult), favorites, and #tags (typed inline, auto-detected).
- Timeline grouped by day; Calendar with entry dots; tap a day to see its entries.
- Daily writing prompt + "Another prompt"; six journal templates (editable, not auto-saved).
- On This Day (memories from earlier years) and a Favorites list.
- Streak + monthly stats (informational, not pressure-oriented).
- Today's Tracker Context (sleep, mood, tasks, habits, workout, spending) — read-only.

## AI (uses the existing gemCall + provider config; no separate AI)
- Per-entry AI menu: Improve Writing, Summarize, Suggest Title, Find Insights, Reflect,
  Extract Tasks, Ask AI About This. The original entry is never overwritten.
- Summarize My Day / Reflect on My Day (combines all of the day's entries).
- Guided "Talk / Write About My Day" → draft reflection + Tomorrow's Plan (user approves save).
- Whole-journal analysis (themes/patterns) with source references.
- AI Chat now understands the Journal: journal entries are included in `buildDataContext`,
  and journal questions are answered only from real entries with explicit no-hallucination rules.
- AI-generated Journal responses have a "Listen" (TTS) button reusing the existing mechanism.

## Sync / offline / backup
- Journal syncs per-record via the existing `journal:{id}` Firestore records (no schema/Java change).
- Offline create/read/edit/delete/search all work via the existing local + sync-queue architecture.
- Backup/export (xlsx) updated to the new columns: Date, Time, Title, Entry, Mood, Tags, Favorite.

## Safety
- Delete requires the existing tap-again confirmation.
- AI never silently creates a journal entry from ordinary conversation; the create-journal
  and destructive AI actions keep the existing confirm/undo flow.

## Not included (per spec, to avoid scope creep)
- No photos/videos/audio/document attachments, no Firebase Storage, no separate Journal AI,
  no separate voice assistant, no duplicate TTS or database.

## Version
- versionName 1.4.0 / versionCode 2. Signing key preserved (keystore.b64 unchanged).

## Validation performed
- All inline `<script>` blocks parse (index.html + regenerated script1.js/script2.js).
- Runtime (jsdom): app initializes with no errors; create entry / search / calendar work;
  legacy entry migrates and photos are dropped; every existing tab still renders without error.
- NOT verified in this environment (require your pipeline/device): APK compilation and
  on-device Firestore sync behavior.

---

# V1.4.0 addendum — build fix, in-editor templates, voice input

## Android build fix (pre-existing failure)
- MainActivity.java referenced `REQ_SPEECH`, `pendingSpeechId`, and `RecognizerIntent`
  in `onActivityResult` but never declared/imported them (half-finished speech code,
  present before the Journal work). Completed it:
  - Added `import android.speech.RecognizerIntent;`
  - Declared `REQ_SPEECH`, `REQ_MIC_PERM`, `pendingSpeechId`, `pendingSpeechPrompt`
  - Added `startSpeech()/launchSpeech()` (RECORD_AUDIO permission flow mirrors camera)
  - Added mic-permission handling in `onRequestPermissionsResult`
  - Added Bridge methods: `speechAvailable()`, `startSpeech(id)`, `startSpeech(id,prompt)`
  - Recognizer configured with 2.5s silence-complete timeout per requirement.

## Voice input in AI Chat
- Mic button added to the AI chat input row.
- Prefers native Android recognizer via Bridge; result returns through `window._speechResult`.
- Web Speech API fallback: continuous listening, finalizes after ~2.5s of silence.
- Transcript is placed in the input box for review before sending.

## Templates inside the writing screen
- Added a "Use a template" picker inside the entry editor (all 6 built-in templates),
  in addition to the Write tab. Inserting into a non-empty entry asks for confirmation.
- Custom (user-defined) templates: deferred to a later version, per decision.

## AI journal querying — verified
- Confirmed (runtime test) that a journal question sends the model a prompt containing a
  JOURNAL section, the actual entry text, and the no-hallucination rule.

## Note on CI version override
- Observed the build pipeline overrides the manifest version (code/name) at build time,
  so the manifest bump is cosmetic when CI supplies its own version.

---

# V1.4.0 cleanup pass

## Removed (safe, no user-facing change)
- Deleted 6 stale VOICE_MODE_PREVIEW_*.html scratch files (not part of the app).
- Moved internal dev docs (TASKS_V*.md, ARCHITECTURE, REMOVED_FEATURES, FIRESTORE_*) into /docs/
  so they don't ship in the app build. Exclude /docs from the web-asset packaging step.
- Removed the orphaned recurring-transaction editor sheet (already hidden) and its init
  event wiring (recurKindGrid/recurFreqGrid/recurWeekGrid/recurCatGrid/recurAcctGrid/
  recurActive/recurSave/recurDel). paintRecur() reduced to a no-op.

## Deliberately KEPT (removal would have caused regressions)
- Transaction fields recurId/recurDate — used by live split-transaction, credit-card
  payment, and Excel/PDF export code.
- s.recur state normalization — keeps older backup files importable.
- recurringNextDate/recurringStateInit/recurringAdvance helpers — harmless, referenced by
  the retained normalization; removing risked breaking backward-compatible parsing.
- FX / multi-currency — left fully untouched per decision (deeply wired into balances and
  historical accounting; not safe to remove without a data migration).
- Biometric code — already correctly self-hides when the native bridge reports unavailable;
  left intact so it works if implemented later.

## Validation
- All inline script blocks parse; mirrors (script1.js/script2.js) regenerated.
- Runtime (jsdom): all 8 tabs render, recurring sheet gone, zero runtime errors.
- Caught and fixed one missed init handler (recurKindGrid) during runtime testing.
