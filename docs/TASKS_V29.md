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

---

# V1.4.0 — Journal separate backup/restore + Day One import

## Dedicated Journal backup/restore (Settings)
- "Journal backup" — exports ONLY journal entries as journal-backup-DATE.json
  ({type:'journal-backup', version:1, count, jr:[...]}).
- "Import journal" — reads a journal backup (or {jr:[...]}, {entries:[...]}, or bare array)
  and MERGES entries into the existing journal, de-duplicating by id. Never overwrites
  other app data (unlike the full-backup restore, which replaces everything).
- Both work in web and Android WebView (native saveFile when available, web download fallback).

## Day One import
- Provided a converter + ready-to-import file for the user's Day One export
  (221 entries). Day One richText/markdown -> app HTML; creationDate (UTC) -> IST
  date+time; starred -> favorite; tags flattened; photos/videos/audio dropped (text-only).
- Import file includes empty habits/tx/accts arrays so BOTH import validators accept it
  (the stricter feature-pack importer requires habits+tx+accts to be arrays).

## Validation (runtime, jsdom)
- Full import of 221 entries: all render, persisted, zero errors.
- Journal export round-trip: re-import dedupes (stays 221); a new entry merges (222).
- All 8 tabs render with no runtime errors.
- Caught during testing: a jsdom cross-realm instanceof artifact (not a real bug), and
  the stricter importer's habits+tx+accts requirement (fixed in the converter).

---

# V1.4.0 — Day One media cleanup, Mood tab removed, mood-in-journal

## Import formatting fix
- Day One embeds ![](dayone-moment://UUID) image markers inline in the text field
  (112 entries). These were passed through as literal text ("gibberish"). The converter
  now strips all image markers, dayone-moment/dayone2 refs, and reduces real markdown
  links to their visible text. Redundant "Date:" titles are skipped. Verified: 0 markers
  survive in all 221 entries; headings/paragraphs render in the editor.
- Note: entries open in the editor (which renders HTML). The timeline shows a plain-text
  2-line preview by design.

## Mood tab removed; contents relocated
- Removed the Mood tab (nav + page). Its markup was relocated (ids preserved so all
  existing render/handlers keep working):
  - Sleep card + daily mood check-in -> Today.
  - Mood history calendar + analytics/insights -> Stats.
- renderToday() now renders the sleep card + mood check-in; renderStats() renders the
  mood calendar + stats. Sleep tracking is fully retained.

## Mood logging from Journal
- The journal entry editor's mood picker now also writes to the app mood history
  (state.mood[date]) via JR_TO_MOOD mapping (great->Happy, good->Calm, okay->Neutral,
  low->Sad, diff->Stressed), so journal moods appear in Stats.

## AI journal querying — confirmed
- Verified against the imported 221 entries: the AI prompt includes a JOURNAL section,
  real entry content, the full entry count, and the no-hallucination rule. Recent entries
  are included in full; older ones rely on keyword retrieval.

## Validation (runtime, jsdom)
- 221 entries import cleanly, no gibberish, formatting renders.
- 7 tabs (Mood gone) all render; sleep+mood on Today, mood history on Stats.
- Journal mood writes to mood history (good -> Calm/2 confirmed).
- Zero runtime errors. All relocated mood/sleep element ids still resolve for their handlers.

---

# V1.4.0 — journal exports, range insights, stat & favorite fixes

## Bug fixes
- Journal stats: "days journaled / this month" showed ~0 for imported historical entries
  (they were 2025-2026, not the current month). Kept "this month" and ADDED all-time
  totals: total entries, days journaled, longest streak. (Confirmed on import: 221 / 215 / 114.)
- Favorite: the native checkbox was effectively invisible/untappable on the dark theme.
  Replaced with a styled toggle (jrFavTog). Verified click toggles + persists favorite.
- Timeline preview already renders mood emoji when an entry has a mood; imported entries
  have none (left moodless by decision), so mood shows on new entries going forward.

## New: filtered export (PDF + Word)
- Export sheet: pick a date range and optional tag(s) (AND match), see live match count,
  export to PDF (print dialog) or Word (.doc via HTML, opens in Word; no library needed).
- Works on web (download / print) and Android (nat.saveFile). Content sanitized to a safe
  HTML subset; photos/media are not included (text-only journal).

## New: custom date-range insights
- Insights view now has From/To date inputs showing entries / days / words / moods for the
  chosen range, plus an "AI analysis of this range" button (uses gemCall, tentative language,
  source references). Defaults to the full span of your journal.

## UI/UX polish
- Bigger tap targets (cards, nav items, mood options, toolbar buttons, New Entry),
  cleaner card spacing/typography, styled favorite toggle.

## Validation (runtime, jsdom)
- All-time stats correct on the 221-entry import; favorite toggle persists; PDF doc builds
  with entries; Word export produces application/msword .doc; range insights compute.
- All 7 tabs render with zero runtime errors.

---

# V1.4.0 — Memories: layered "On this day"
- On This Day now works in two layers:
  1) Exact month+day match in earlier years (label "On this day", "N years ago").
  2) Fallback when no exact match: surfaces nearest PAST entries (prefers same day-of-month,
     else most recent past), labelled "Looking back" with N days/months ago.
- This makes imported history (single ~13-month span, no cross-year dates yet) visible now,
  and auto-upgrades to true same-date memories as the journal ages.
- Favorites still requires entries marked favorite (imported entries have none).
- Verified: with imported data -> "Looking back" + 3 past entries; with a seeded
  one-year-ago entry -> "On this day" + "year ago". All 7 tabs render, no errors.

---

# V1.4.0 — Journal pass (formatting, templates, voice, AI rewrite, mood sync)

## Editor formatting (fixed)
- Rewrote toolbar commands: styleWithCSS applied before each command; formatBlock uses
  <h3>/<blockquote> with toggle-back-to-<p>; lists ensure a block exists first; toolbar
  uses mousedown preventDefault to preserve the editor selection.
- Added editor CSS for h3/p/ul/ol/li/blockquote/checklist so formatting renders (and is
  preserved on save/reopen, since content is stored as HTML).
- openJr seeds an empty editor with <p><br></p> so the first command has a block to format.

## Custom templates (local + synced)
- New state.jrTpl array; wired into normState + record sync (emit 'jrtpl:*' + applySyncRecord).
- jrAllTemplates() merges 6 built-ins + custom; Write-tab grid and in-editor picker list both,
  with a "New template" tile and per-custom delete. Template editor sheet with its own toolbar.
- "Save as template" helper also available from entry content.

## Voice input in editor
- Mic button in the editor toolbar; native RecognizerIntent when available (feeds
  window._speechResult, chained with the AI-chat handler), Web Speech fallback with 2.5s
  silence finalize; transcript inserted at the caret.

## AI rewrite actions
- Rewrite / Improve / Shorten / Expand / Make professional / Make personal.
- Shows a preview with Replace / Copy / Discard; original is untouched until the user taps
  Replace. Uses gemCall.

## Mood sync
- Saving a journal entry with a mood writes to state.mood[date] via JR_TO_MOOD, so it shows
  in Stats/mood history (great->Happy, good->Calm, okay->Neutral, low->Sad, diff->Stressed).

## JSON fix
- The uploaded JSON's content was already valid HTML; the "formatting not applied" issue was
  app-side rendering, now fixed. Also cleaned 15 entries with stray markdown (**), leftover
  ### headers, and double-escaped <br>. Final file: 0 markdown leftovers, 221 entries.

## Validation (runtime, jsdom)
- Toolbar issues styleWithCSS + formatBlock + list commands correctly; custom template
  saves to synced jrTpl; AI rewrite preview->replace works; mic present; journal mood syncs
  to history; fixed JSON imports; all 7 tabs render with zero errors.

## Deferred to next pass (per plan)
- Today tab simplification (4 quick actions, compact mood card w/ insights icon), Stats
  metric audit/trim, broader UI/UX consolidation, full AI-action audit.

---

# V1.4.0 — Today overhaul + mood consolidated into Journal

## Rewrite-preview UI fix
- Fixed uneven button sizing in the AI rewrite preview / save rows (all buttons flex:1,
  consistent height, no text wrapping).

## Mood consolidated into Journal only
- Removed the mood check-in from Today and the mood section from Stats.
- Mood now lives in the Journal > Insights view behind a "Mood / Insights" icon toggle
  (panel hidden by default; opens check-in + calendar + analytics on click).
- Element IDs preserved so existing mood render/handlers keep working; renderJr renders the
  mood pieces so the panel stays live.
- Fixed 4 dangling pgMood references left from removing the Mood tab (navigate mood -> Journal;
  guarded $('pgMood') null checks). Quick-log routing for mood/sleep updated.

## Mood sync (fixed/verified)
- Saving a journal entry with a mood writes state.mood[date] via JR_TO_MOOD and now surfaces
  in the Journal mood calendar/insights (verified great->1 written + calendar renders).

## Today overhaul
- Added 4 quick actions: Habit, Sleep, Journal, Task (each opens its working page/sheet).
- Decluttered Today: quote-of-day, next reminder, AI insights, recover box, stack box, week
  dots are force-hidden (kept in DOM to avoid null-ref crashes in existing render code).
- Kept: momentum hero, sleep card, habit list.

## Validation (runtime, jsdom)
- All 7 tabs render; quick actions work (journal opens editor, habit no-throw); Today
  decluttered; mood gone from Today/Stats, present in Journal; mood sync writes + renders;
  reRenderCurrent no longer crashes on removed pgMood. Zero runtime errors.

## Still deferred (need your direction)
- Stats metric audit (which to cut), broader UI/UX redesign, full AI-action audit of 32 actions.

---

# V1.4.0 — AI-control audit

## Findings (audit of all 32 AI actions)
- All 24 user-facing actions are BOTH implemented in executeAction AND advertised in the
  AI prompt (no unreachable actions).
- All 8 destructive actions (delete_expense/habit/journal/mood/sleep/task/workout and
  delete_transactions bulk) correctly return needConfirm and only execute with confirm:true.
- Runtime-verified: set_mood executes; add_task/add_habit ask for missing required info
  (clarify, not a bug); delete_transactions asks to confirm then deletes on confirm.
- Conclusion: the spec's core requirement (AI can execute all actions incl. bulk transaction
  delete, with confirmation before destructive ones) is already satisfied.

## Fix
- Improved the bulk-delete confirmation wording ("This will delete N transactions (scope).
  This cannot be undone from here. Please confirm.") — clearer feedback per spec.

## Not changed (deliberately)
- No new AI actions were invented; the existing set already covers the app's UI actions.

---

# V1.4.0 — Stats metric audit (cuts)

## Audit result
- Stats was already fairly lean: Insight, Progress (streaks + completion), Trend chart,
  Habit performance (conditional >=2 habits), Fitness (conditional on workouts), Achievements,
  and the multi-metric Calendar heatmap.

## Cuts (approved)
- "Missed days" tile removed from Progress (redundant inverse of 30-day completion %).
- "Achievements" section removed from Stats view (hidden; element kept so existing
  render/handlers don't null-crash). The achievements modal code remains intact but is no
  longer surfaced on the Stats page.

## Kept (deliberately, genuinely useful)
- Insight card, Current/Longest streak, 30-day completion, Trend chart, Habit performance,
  Fitness section, Calendar heatmap.

## Validation
- Missed days no longer in Progress; Achievements hidden; all 7 tabs render; zero runtime errors.

---

# V1.4.0 — FIX: blank tabs (all pages except Today)

## Root cause
- The #pro-productivity-style <style> block began with orphaned CSS fragments
  ("to{opacity:1;transform:none}}" x2 and a stray "}"), leftover from a broken keyframes
  rule. This made that stylesheet block malformed (64 { vs 67 }). In a real browser this
  corrupts CSS parsing; combined with .page{animation:fadeUp} starting at opacity:0, non-Today
  pages (which get .on added later via showTab, re-triggering the animation) could stay at
  opacity:0 = blank. Today is .on at load so it rendered.
- Note: this corruption existed in earlier builds too (pre-existing), not introduced by the
  recent journal/stats work.

## Fix
- Removed the orphaned CSS fragments; the style block is now balanced (all 7 <style> blocks
  balanced).
- Hardened page visibility: .page.on now sets opacity:1!important so a broken animation can
  never blank a page again.

## Validation
- Computed styles verified: every page (Stats/Tasks/Exp/Journal/AI/Settings) resolves to
  display:block, opacity:1, with content, and no runtime errors.

---

# V1.4.0 — CRITICAL FIX: scrambled page structure (blank tabs)

## Root cause (real browser diagnosis via Playwright/Chromium)
- The earlier mood-relocation build's inject script broke the HTML nesting: pgTasks/pgAI/pgSet
  ended up rendering INSIDE pgJr (the journal page), and the journal's insights/search views +
  whole-journal button got scrambled into pgTasks. Because pgJr is display:none when not active,
  everything nested inside collapsed to 0x0 -> blank tabs. Today worked only because it's the
  default active page.
- Also found orphaned task-export divs wrongly sitting inside pgToday (leftover from the same
  corruption), causing duplicate IDs.

## Fix
- Reconstructed the entire pgJr insights/mood/search region + pgTasks with correct nesting.
- Removed the orphaned task-export block from pgToday.
- Result: no duplicate IDs; all 7 pages are correct top-level siblings.

## Verification (REAL browser, not jsdom)
- Installed Playwright + Chromium and loaded the app. Every tab (Today/Tasks/Money/Stats/
  Journal/AI/Settings) renders at full width (354) with proper height and content; zero page
  errors. Screenshots captured and visually confirmed.

## Process note
- jsdom testing gave false confidence (it builds DOM content but does not do CSS layout, so
  0x0 collapsed pages read as "has content"). Switched to real-browser rendering checks.

---

# V1.5.0 Phase 1 — Navigation restructure (IA redesign)
- Bottom nav reduced to 5: Today / Tasks / Money / Journal / More.
- New pgMore hub: Health (Mood/Sleep/Workout), Analytics (Stats/AI), Data (Export/Settings).
- Stats/AI/Settings are no longer primary tabs; reached via More. Sub-pages highlight "More".
- Global "Ask AI" button (#aiFab) opens the full AI page (kept intact: voice, context, 32 actions).
  Hidden while on the AI page.
- showTab handles pgMore + sub-page highlight mapping.
- Verified in real Chromium: all pages reachable and full-size, More cards route correctly,
  AI fab works, zero page errors.

---

# V1.5.0 Phase 2 — Today dashboard
- Added "Today's progress" summary card (Habits / Tasks / Mood / Sleep at a glance) at the top
  of Today, computed from live data (renderTodayProgress).
- Kept existing Today content (momentum, weekly pulse, tasks, quick actions, sleep, habit list).
- Verified in real Chromium: progress card renders with values; all pages still render; no errors.

## Status of the full 21-point IA plan
- DONE + tested: Phase 1 (navigation) and Phase 2 core (Today progress card).
- REMAINING (larger, deferred to avoid quality/regression risk): consolidate all Insights into
  Analytics; simplify Journal top-nav; group Settings into sections; progressive disclosure on
  habit/money creation; full visual-system standardization.

---

# V1.5.0 Phase 3+4 — consolidation & polish

## Phase 3 (scoped to non-conflicting items, per user)
- Journal AI buttons merged: timeline's "Summarize Day" + "Reflect Day" now live under one
  "✦ Ask about my day" menu (Summarize / Reflect / Talk). Uses existing handlers.
- Journal sub-nav LEFT AS-IS (icon nav was the user's earlier explicit request).
- Settings LEFT AS-IS (already grouped into 9 labeled sections; re-grouping = high risk, low gain).

## Phase 4 — visual polish + progressive disclosure
- Habit creation form: progressive disclosure. New habits show only Name / Quick start / Type /
  Repeat + "More options ▾". Advanced fields (Icon, Color, Category, Time of day, Reminders,
  Dates, Notes, Quote) are hidden until expanded. Editing an existing habit shows them expanded.
- Consistent card/menu styling reused across new elements.

## Verified (real Chromium)
- All pages render full-size incl. sub-pages via More; habit progressive disclosure works
  (hidden for new, expands on More options, shown when editing); journal ask-day menu opens;
  zero page errors. Screenshots captured.

## Honest note on the 21-point plan
- Some Phase 3 items (simplify Journal nav, re-group Settings) were NOT done because they would
  reverse decisions the user made earlier or re-architect already-organized code for little gain.
  Flagged to the user; user agreed to skip. Insight-consolidation across Money/Journal/Stats was
  not done as it needs an Analytics rebuild (large, deferred).

---

# V1.5.1 — workout restore, journal action placement, bug fixes

## Journal action placement (reported issue)
- "Ask about my day" (Summarize/Reflect/Talk) + its output moved ABOVE the entry list on the
  Journal timeline, so it stays at the top regardless of entry count (was buried below 200+ entries).

## Workout restored to Today (reported issue)
- Workout summary card (#wkCard) was force-hidden in an earlier declutter pass. Removed it from
  the #pgToday hide list and renderToday() now calls renderWkCard(). The card is back below Sleep.
- More -> Workout now opens the actual workout module (openWkModule) instead of scrolling to the
  Stats fitness section.

## Bug fixes found during audit
- AI add_habit referenced $('fGoal') (nonexistent) -> fixed to $('fTarget') with a guard; also
  now expands the habit advanced section so AI-prefilled category/goal are visible to the user.
- Audited all $('id') references vs. actual element IDs: remaining "missing" refs are all guarded
  or dynamically created (verified no unguarded crashes).

## Verified (real Chromium)
- Workout card visible on Today; More->Workout opens module; journal ask button sits above the
  list with 15+ seeded entries; all pages render; zero page errors.
