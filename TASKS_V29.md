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
