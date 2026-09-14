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

---

# V1.5.2 — Today/Tasks cleanup, journal location, voice UI, reminders

## Today
- Hid the duplicate Sleep card (sleep already shown in Today's progress) and the Workout card
  (workout lives in More -> Workout). Both force-hidden via CSS; functionality intact via progress
  summary / More / quick actions.

## Tasks
- Export tasks converted from a space-hogging bottom section to a compact button that opens an
  export sheet (range + PDF/Excel).
- Removed duplicate add-task: the global FAB no longer shows on the Tasks page (header "+ Task"
  is the single add entry point).

## Animations
- Smoother global transitions (cubic-bezier), subtle press-scale on buttons/cards, refined page
  fade-up and sheet/scrim easing; respects prefers-reduced-motion.

## Journal
- Added manual Location field (like date/time), saved in schema + migration, shown on cards.
- Voice input: live "Listening…" status banner with interim transcription + "Added" confirmation.
- Android now PREFERS the in-app Web Speech UI over the ugly system RecognizerIntent dialog,
  falling back to native only if Web Speech is unavailable/denied.

## Reminders (existing native alarm + web-notif pipelines)
- Daily Journal reminder (default 21:00, on) and Expense reminder (default 20:00, off), with
  user-set times + toggles in Settings -> Reminders.
- Smart rule-based nudge: if you journal >=7 of last 14 days but haven't today, a gentle 21:45
  nudge (toggleable).
- Wired into BOTH computeAlarms (Android native) and scheduleWebNotifs (browser) so reminders
  work on both platforms.

## Honest limitations (told to user, not faked)
- Persistent/ongoing actionable notification (quick-add from the shade) NOT built: needs a native
  foreground service + notification actions that I cannot compile/test here. Deferred.
- The ugly Android system speech dialog itself cannot be restyled (it's Google's OS UI); the fix
  is to prefer the in-app Web Speech UI instead.
- Smart notifications are rule-based, not ML pattern detection.

## Verified (real Chromium)
- Today sleep+workout hidden; Tasks fab hidden + export sheet; journal location/voice-status/mic
  present; computeAlarms emits journal+expense reminders; settings toggles flip + persist;
  all pages render; zero errors.

---

# V1.5.3 — AI assistant fix (journal/habits Q&A)

## Root cause of "just says need more data"
- The AI is BRING-YOUR-OWN-KEY: gemCall() rejects with "No API key" if none is set in
  Settings -> AI configuration. With no key, every question (journal, habits, etc.) fails.
  The vague failure looked like "need more data".
- Secondary issue: journal context was capped at the 12 most-recent entries, so questions about
  older/specific dates or moods ("sad moment", "between these days") couldn't be answered even
  with a key.

## Fixes
- Clear, actionable error when the key is missing: explains the AI needs a free API key and shows
  an "Open AI settings" button (instead of a cryptic message).
- Smart, query-aware journal retrieval in buildDataContext(query):
  * keyword match across ALL entries (not just recent 12),
  * date-range detection (YYYY-MM-DD in the question),
  * mood-sentiment mapping ("sad"->low, "happy"->good, etc.),
  * plus the 10 most recent as baseline; capped at 30 most relevant.
  buildDataContext now receives the user's question at both call sites (uaiPrompt + weekly narr).

## Verified (real Chromium)
- keyword "family" surfaces a 2025 entry; "sad" pulls the low-mood entry; date-range finds the
  Jan entry; no-key path shows the guidance + Open AI settings button; all pages render; no errors.

## Note to user
- To actually use the AI you must add an API key (e.g. free Google Gemini key) in
  Settings -> AI configuration. The app cannot ship a shared key. Once added, journal/habits/etc.
  questions work, including "what happened on <date>" and "sad moments".

---

# V1.5.4 — CRITICAL AI FIX: answers never rendered (always "need more information")

## Real root cause (found via screenshot: key WAS set)
- In uaiSend, after parsing the model's JSON {action,message}, the code NEVER called
  executeAction to normalize it. The renderer checks result.isQuery / result.ok / result.msg,
  but the raw model object only had result.action + result.message. So EVERY response fell
  through to the "I need a little more information." fallback — for journal, habits, everything.
  (Previous "no API key" theory was wrong; the key was configured.)

## Fix
- uaiSend now calls executeAction({action,params,message}) on the parsed result (unless clarify),
  converting query -> {ok:1,isQuery:1,msg} and CRUD -> proper {ok/needConfirm/...}. clarify is
  shown as its message.
- Prompt hardened: added a CRITICAL QUESTION RULE (questions -> query + answer, never clarify),
  restricted clarify to create/update with a missing field, and specified that query "message"
  must contain the FULL answer.

## Verified (real Chromium, stubbed model)
- "can you access journal data?" -> renders the full answer (not the clarify fallback).
- add_expense CRUD still executes correctly.
- All pages render; zero errors.

## Combined with V1.5.3 smart retrieval
- Journal questions now search ALL entries by keyword/date/mood (not just recent 12), so
  "sad moments", "what happened on <date>", "between <d1> and <d2>" work once answered.

---

# V1.5.5 — journal-only AI, report journal, biometric, persistent quick-add

## Journal-only AI (new)
- Journal > Insights now has "✨ Ask your journal": a dedicated assistant that answers ONLY
  from journal entries (refuses habits/tasks/money/etc.). Uses smart retrieval (keyword/date/mood
  across ALL entries) + a strict journal-only prompt. Quick chips: recent themes, sad moments,
  what makes me happy, recurring struggles. Verified journal-only prompt + rendering.

## Monthly report now includes Journal
- Added a Journal section: entries count, days journaled, words written, mood breakdown, and a
  table of up to 20 entries for the month. Verified via the report button.

## Biometric (fingerprint/face) — IMPLEMENTED (needs device testing)
- Previously a stub (bioAvail=false, bio=noop) so it never worked.
- Implemented native android.hardware.biometrics.BiometricPrompt (API 28/29+): bioAvail() now
  checks BiometricManager; bio() shows the system fingerprint/face prompt and calls window.bioResult(true/false).
- Added USE_BIOMETRIC permission. HONEST: written to spec but NOT compiled/tested here — needs
  on-device verification (hardware + Android version + enrollment). Works API 29+; older devices
  fall back to PIN.

## Persistent quick-add notification (simpler, safe version)
- Per user choice, NOT a foreground service (which risked blocking app launch). Instead an ONGOING
  normal notification with actions (Task/Journal/Expense) that deep-link into existing quick-add
  flows via getLaunchAction. Toggle in Settings > Reminders. New deep-link keys addJournal/addMood/
  addSleep wired in handleLaunchAction + getLaunchAction. HONEST: native notification code not
  testable here; needs device verification.

## Verified (real Chromium, web side)
- All pages render; journal-only ask box works with journal-only prompt; monthly report includes
  Journal section; settings toggles present; bioResult callback present; zero errors.

---

# V1.5.6 — AI answer formatting + tappable entries + remove followups

## Fixes (per user screenshots)
1. Run-on lists: AI answers now render real <ol>/<ul> lists (uaiFormat splits "1. 2. 3." and
   "- " into list items, handles **bold**, paragraphs, line breaks).
2. Useless followup chips ("Show me more detail / What should I do next?") removed everywhere.
3. Journal dates (YYYY-MM-DD) in AI answers are now tappable links that open the entry (single)
   or the calendar day (multiple). Same formatting applied to the journal-only AI.

## Key bug found & fixed
- Query answers were hitting the result.ok branch (rendered as raw "✓ text") BEFORE the isQuery
  branch, so uaiFormat never ran. Reordered: isQuery is now checked first -> formatted output.

## Verified (real Chromium)
- 3-item list renders as <li>s; date link present and tapping it opens the entry; no followup
  chips; all pages render; zero errors.

---

# V1.5.7 — journal AI is now a real conversation

## Change (per user feedback: one-shot Q&A had little use vs universal chat)
- Rebuilt "Ask your journal" as a proper multi-turn CHAT (like the universal AI, but journal-only):
  - message log with user/bot bubbles, persistent history (jr_chat_history_v1, last 16 turns),
  - follow-ups work (last 8 turns fed to the model so "tell me more" / "what about last month" resolve),
  - answers use uaiFormat (lists, bold, tappable YYYY-MM-DD entry links) + Listen button,
  - "Clear conversation" button; history survives leaving/returning to the view,
  - still strictly journal-only (refuses habits/tasks/money/etc.).

## Verified (real Chromium)
- 2-turn conversation renders user+bot bubbles; follow-up answered with context; history persists
  across view switches; clear works; date links tappable; all pages render; zero errors.

---

# V1.5.8 — Read more/less for long AI answers
- Long AI answers (journal chat + universal AI query) now collapse with a fade + "Read more ▾"
  toggle to save space; tap expands to "Show less ▴". Heuristic: collapse if >420 chars or >5
  list items; short answers are unaffected.
- Verified (real Chromium): long answer collapses + expands on click; short answer not collapsed;
  all pages render; zero errors.

---

# V1.6.0 — full UI revision (approved from preview)

## Today
- Merged "Today's progress" + "Weekly pulse" into one 8-metric "Today at a glance" card
  (Habits/Tasks/Mood/Sleep/Streak/Spent/Overdue/Due today). Weekly-pulse block hidden.
- Cloud-sync bar hidden on Today (available in More + Settings).

## Stats
- Added sub-tabs: Overview / Habits / Health / Money. Sections auto-bucketed by header; Money
  shows a hint linking to Money → Insights. Re-applies filter after each renderStats.

## Money
- Collapsed the savings/credit inline summary (#featureSummary hidden); the compact Financial
  Tools launcher (opens full sheet) remains, so transactions rise up the page.

## Settings
- Every section is now a collapsible accordion (9 sections); Profile open by default.

## More / Health
- Mood moved to its OWN home: opens a dedicated Mood sheet from More → Health (check-in + history
  + analytics). Removed from Journal → Insights. All mood entry points (quick-log, notification
  deep-link) repointed to the sheet. (Reverses the earlier 'mood in Journal' per user's new choice.)
- Workout/Sleep continue to open their existing module/sheet from More → Health.

## Verified (real Chromium)
- 8-cell Today card; pulse+sync hidden; Stats sub-tabs filter; Settings accordion (1 open);
  Money summary collapsed; Mood sheet opens with 7-button check-in; Mood removed from Journal;
  no duplicate IDs; all tabs render; zero errors.

---

# V1.6.1 — sync status icon + in-app icon picker
## Sync status icon
- Fixed sync icon top-right on every tab with a colored status dot (green=synced, amber=syncing,
  red=error, grey=offline/not-signed-in/not-configured). Spins while syncing. Tap opens a popover
  with status text + "Sync now" (calls doSync/pushRecordSync). Driven by setSyncState + online/offline events.
## In-app app icon picker
- Settings → Appearance → App icon: 15 selectable icons; choice saved to state.set.appIcon and
  applied instantly to the in-app brand logo (navLogo + any [data-brandicon]). Works on web + app.
- HONEST: this changes the IN-APP icon, not the installed PWA/launcher icon (PWA icon is cached at
  install; launcher icon needs native activity-alias — not done, per user's choice of in-app picker).
## Verified (real Chromium)
- Sync icon visible on all tabs, popover opens with status, dot reflects state; icon picker shows
  15 icons, selection persists + applies to navLogo; all tabs render; zero errors.

---
# V1.6.2 — app icon picker switched to Material-style SVG icons
- Replaced the 15 emoji with 15 Material-style line SVG icons (spark/star/bolt/leaf/heart/target/
  rocket/moon/sun/flame/trophy/brain/diamond/book/compass). Selection stored as an id; applied as
  SVG to navLogo + [data-brandicon]. Old emoji selections auto-migrate to 'spark'. Verified: 15 SVGs,
  selection applies + persists, no emoji left, all tabs render, zero errors.

---
# V1.6.3 — richer duotone Material icons for the picker
- Replaced the thin line icons with 15 filled/duotone Material-style icons using accent colors
  (amber/blue/green/coral/purple) that read well on dark theme. svg() wrapper no longer forces
  stroke/fill:none so each icon's own colors show. Applied to navLogo + [data-brandicon].
- Verified: 15 colored SVGs render, selection applies colored icon to navLogo + persists, all tabs
  render, zero errors.

---
# V1.6.4 — persistent notification: more quick options + clearer text
- Quick-add notification now has 6 one-tap action buttons: + Habit, + Task, 🙂 Mood, 😴 Sleep,
  📓 Journal, 💰 Expense (was Task/Journal/Expense). Tapping the notification body opens the app
  (where you view habits/tasks).
- Clearer wording: title "Quick add — Personal Tracker", BigTextStyle body listing the options.
- Added viewHabits/viewTasks deep-link keys (JS + getLaunchAction) so those routes exist too.
- Settings description updated to list all quick-add options.
- Verified (real Chromium): all 8 deep-link routes (addHabit/Task/Mood/Sleep/Journal/Expense +
  viewHabits/viewTasks) route without error; Java structurally valid (6 actions, BigTextStyle);
  all tabs render, zero errors.
- HONEST: the native notification RENDERING is untestable here; needs on-device verification.
  Android shows ~3 buttons collapsed, ~6 on expand — that's why View Habits/Tasks are via body tap,
  not buttons (per user's choice of the 6 add-buttons).

---
# V1.6.5 — renamed app to "inneros"
- Display name changed to "inneros" everywhere user-facing: title, nav brand, AI name ("inneros AI"),
  PIN-lock text, version line, monthly report footer/subtitle, manifest (name + short_name),
  Android strings.xml app_name.
- Kept feature-label "Habits" (Stats sub-tab, chart legend, AI category, report section) unchanged.
- Kept Android package id (com.actionables.personaltracker.app) unchanged on purpose — changing it
  breaks the signing key, Firebase config, and installed-app identity; it's an internal id, not shown to users.
- LOGOS: the "10 pasted logos" document came through EMPTY — could not replace the icon set. Rename
  only in this build; logos pending user input.

---
# V1.6.6 — 10 monk logo concepts (per brief) replace the icon set
- Replaced the icon picker's set with 10 seated-meditation ("monk = the user") logo concepts from
  the brief: Minimal, +Progress, +Habit Ring, +Checkmark, +Rising Sun, +Mountain, +Mind, +Orbit,
  Geometric, Premium Symbol. Each is a full rounded-square Material-style app icon (own bg color,
  no text), recognizable at small sizes. Default = orbit. Old ids migrate to orbit.
- Applied to navLogo + [data-brandicon]; picker shows all 10; selection saves + applies.
- Verified (real Chromium): 10 logos render, selection persists + applies to navLogo, all tabs
  render, zero errors.
- NOTE: this is the in-app icon set (as before). The installed PWA/launcher icon (icon-192/512.png,
  apple-touch, favicon) is NOT auto-generated from these SVGs — that needs PNG export + manifest
  swap, which I can do next if you pick ONE concept as the official launcher icon.

---
# V1.6.7 — InnerOs naming, in-app 🧠, 3-button notification + body→Today fix
- Display name capitalized to "InnerOs" everywhere (title, AI, lock, reports, manifest, strings).
- In-app brand mark is now the 🧠 emoji (per request). The logo picker still records the chosen
  branded logo but only for the EXTERNAL icon; it no longer overwrites the in-app navLogo.
- Persistent notification: reduced to EXACTLY 3 actions — Add Task, Journal Entry, Expense.
- FIXED body-tap: it used quickPI("tab") -> tab="1" -> showTab("1") (no-op). Now quickPI("tab","pgToday")
  so tapping the notification body opens the Today page. Verified body-tap routes to pgToday.
- PENDING: external app icon PNGs (icon-192/512, apple-touch, favicon) still need ONE chosen logo
  concept to render + swap. Not done yet — awaiting user's pick.

---
# V1.6.8 — official InnerOs app icon (Logo #2 Monk+Progress) baked in everywhere external
- Chosen permanent icon: concept #2 (seated meditation figure + upward growth arrow, emerald gradient).
- Rendered PNGs and replaced: icon-192.png, icon-512.png, apple-touch-icon.png, favicon-32.png, +new favicon-16.png.
- HTML head: added 16px favicon, cache-busted icon links (?v=inneros2) so browsers refresh the tab icon.
- manifest already points to icon-192/512 (now the new icon), purpose "any maskable".
- Android launcher: regenerated ic_launcher.png + ic_launcher_round.png at all 5 densities
  (mdpi..xxxhdpi); rewrote adaptive drawables ic_bg_dark (emerald gradient), ic_fg_spark
  (monk+arrow, fits 108 safe zone), ic_mono_spark (Material You monochrome glyph). Adaptive XML
  unchanged (references those names).
- In-app UI brand stays 🧠 (per earlier request); picker no longer overwrites it.
- Verified: app loads, title InnerOs, favicon linked, foreground fits safe zone (previewed), all tabs render, zero JS errors.
- HONEST: Android launcher icon change only applies on (re)install/build of the APK; an already-installed
  PWA home-screen icon won't update until reinstalled (browser caches it). The APK build itself is untestable here.

---
# V1.7.0 — full E2E QA pass
- Built an automated Playwright E2E harness (52 checks) driving REAL app functions across Habits,
  Tasks, Journal, Mood, Sleep, Expenses, AI, Notifications, Navigation, Data Persistence, Insights,
  Edge cases. Validated underlying logic (streaks, overdue, sleep mins, month totals, retrieval,
  deep-link routing, persistence round-trip), not just UI render.
- BUG FOUND & FIXED (Medium): normState() crashed if stored s.habits was a non-array (corrupted
  localStorage) -> "(s.habits||[]).map is not a function". Added Array.isArray guard (jr/tx/accts/
  sleep were already guarded). Re-tested: sanitizes bad types; normal load unaffected.
- All other initial "failures" were test-harness param/timing issues, not app bugs (verified each
  against real handlers: delete_habit/delete_task use 2-step confirm; add_expense uses amt/cat;
  deleteTask() is sheet-bound; mood sheet opens - fixed-delay was too short).
- Final: 51/52 automated + the 1 remaining verified manually (mood sheet opens, polled). Zero
  uncaught runtime errors across the whole suite.
- UNTESTABLE here (documented): native APK build, on-device notification delivery, biometric
  hardware, real Firebase sync. These are simulated/validated at code+data level only.

---
# V1.7.0 QA — Round 2 (backup/restore, reports, receipt, financial)
Added a second automated suite (25 checks). ALL PASS. No new bugs found; no code changes needed
(the build already had the round-1 normState fix).
Covered:
- Full backup: jsonB64 structure (habits/jr/tx/mood/sleep), restore ROUND-TRIP preserves every
  area incl. habit completion + journal favorite flag. Negative: garbage import rejected, non-backup
  JSON rejected, habits-less backup edge documented.
- Journal-only backup: builds + restores.
- Reports/exports: monthly PDF report HTML (Habits+Journal+Mood sections, valid HTML); buildXlsx
  (after lazy ensureXlsx load); expense CSV; task export rows; journal export doc.
- Financial: account balance (80000-200=79800), netWorth, income/expense/net totals, credit
  outstanding, Money page render.
- Receipt scan: no-key guard fires; scan functions present. (Vision network call itself not run.)
Test-harness learnings (not app bugs): restore has a protective confirm() dialog (must accept);
report uses setTimeout before window.open; XLSX is lazy-loaded via ensureXlsx().

---
# V1.7.1 — FIX: PDF export broken on Android + export path audit
## Bug (High): PDF exports relied on window.open('','_blank')+print, which fails in Android WebView
- Affected: expense PDF, expense-range PDF, expense-log PDF, monthly report, journal PDF.
- XLSX/CSV were fine (they use nat.saveFile).
## Fix
- Added exportHtmlDoc(html, name) helper: WEB -> window.open+print (unchanged, works);
  ANDROID -> native nat.printHtmlToPdf (real PDF) with HTML-save fallback via nat.saveFile so an
  export never fails silently.
- Routed all 5 PDF exports through the helper.
- Added native printHtmlToPdf(name, html) bridge using Android PrintManager +
  WebView.createPrintDocumentAdapter (real PDF). UNTESTED natively; JS fallback covered.
## Verified (real Chromium)
- Web: expense PDF (1238 chars valid), expense-range PDF, journal PDF, monthly report all generate.
- Android (mocked bridge): exportExpPdf calls printHtmlToPdf; fallback saves .html via saveFile.
- XLSX still routes to saveFile. No JS errors.

---
# V1.8.0 Batch 1 — AI preferences memory + multi-step batch actions
- Multi-step batch: AI can return {"actions":[...]} -> executed in sequence with a combined summary.
  Guards: incomplete step -> asks instead of half-executing; destructive steps flagged for confirm;
  single-action path unchanged (backward compatible). Prompt updated to allow the actions array.
- Preferences memory: existing save/forget-in-chat kept; ADDED "What I remember" viewer in AI config
  (lists saved prefs, delete individually). saveAiPreferences re-renders the list.
- Verified (real Chromium): 3-habit batch, mixed mood+task batch, incomplete-batch guard, single
  action regression, prefs list + delete. Core suite 51/52 (1 = known mood-sheet test-timing). Zero errors.

---
# V1.9.0 — AI enhancement batches 2-6 (all tested)
Batch 2 — Proactive insights + cross-domain correlations: correlation engine (sleep/mood/habits/
  spend, Pearson-ish over 30d), journal theme detection, streak-at-risk; dismissible "For you" card
  on AI page; correlations injected into AI context.
Batch 3 — Weekly/monthly review + richer formatting: markdown TABLE rendering in uaiFormat; monthly
  review chip; AI told it may use tables.
Batch 4 — Natural-voice read-aloud: toggle in AI input row (persists), improved voice pick, auto-reads
  new answers when on, stop on off.
Batch 5 — Multi-select delete: select mode + delete bar for transactions (#expTx) and journal (#jrList);
  checkbox affordance CSS; normal tap unaffected when not in select mode.
Batch 6 — Adaptive reminder timing: adaptiveJournalTime() = median of recent entry times, nudges ~30m
  before; toggle in Settings honestly labeled "heuristic, not AI". (NOT true ML — needs a backend.)
Verified: dedicated tests for each batch pass; Suite 1 51/52 (1 known mood-sheet test-timing), Suite 2
  25/25, full tab regression clean, zero runtime errors.

---
# V1.10.0 — feature-gap work (part 1)
- Task reminders: VERIFIED already working on both native (computeAlarms includes task-rem alarms
  carrying task id) and web (scheduleWebNotifs); tap opens the task. NOT a bug (earlier flag was a
  false grep). No change needed.
- Global search (NEW): full-screen overlay searching habits + tasks + journal + expenses; grouped
  results; tap navigates to the item; opened from More -> Search. Verified: multi-domain matches,
  navigation, no-match, Escape-to-close. Regression clean.
- PENDING (approved, not yet built): reminder snooze, recently-deleted trash/undo.

---
# V1.11.0 — task/journal feature batch
- Pin/favorite task: t.pinned; pinned non-completed tasks show in a "📌 PINNED" section at top;
  pin/snooze/duplicate quick-action buttons on each task card.
- Snooze task: one tap -> due date = tomorrow (reopens if completed).
- Duplicate task + duplicate habit: deep-copy with "(copy)" title, fresh id, reset progress/pins.
- Recurring visibility: task card badge now shows "↻ freq ×interval".
- Journal writing goal: weekly goal (1-7 days) with progress bar + streak-style copy; Set goal prompt.
- Single journal entry export: "Export this entry" button in editor -> exportHtmlDoc (per-entry PDF/HTML).
- Receipt after OCR: confirmed image is already discarded post-extraction (clearReceiptScanData in the
  OCR .then); toast updated to say "image discarded".
- Pinned tasks notification (native): pushPinnedTasksNotif -> nat.showPinnedTasks(json); native
  showPinnedTasksNotif builds an ongoing BigText notification listing pinned tasks, tap opens Tasks.
  UNTESTED natively (JS side verified).
- Verified (real Chromium): pin/snooze/dup task, dup habit, recurring badge, writing goal, single
  export, all pass. Suite 1 51/52 (known timing), Suite 2 25/25, zero errors.

---
# V1.11.1 — placement fixes
- Tasks: Export moved from a bottom full-width button to a compact "⬇ Export" in the header top-right
  (next to + Task). Old bottom button removed (no duplicate id).
- Expense: "Export data" added into Financial Tools sheet (data-ft="export" -> opens expExportSheet).
  The Insights-tab report buttons remain too.
- Global search: REMOVED entirely per user (card from More hub, overlay markup, JS module, CSS).
- Verified: task export in header opens sheet; financial-tools Export opens expense export sheet;
  no global-search remnants; no dup ids; regression clean.

---
# V1.11.2 — sync icon overlap + remove redundant Reports export
- Sync icon overlapped the header search button (both top-right). Moved #syncIcon to right:62px so it
  sits beside the search button (verified no overlap: sync ends 328px, search starts 330px).
- Removed the Money -> Insights "Reports" row (CSV/Excel/PDF/Date range); export now lives in
  Financial Tools -> Export data. Wiring for repCsv/repXlsx/repPdf/repRange removed.
- Verified: no overlap, Reports row gone, export still reachable via Financial Tools, regression clean.

---
# V1.11.3 — sync icon only on Today
- Sync icon was fixed/global (showed on every tab). Now shown only when active tab is pgToday
  (hidden elsewhere; popover force-closed when leaving Today). Matches original behavior.
- Verified: visible on Today, hidden on Tasks/Money/Journal/More/Stats, reappears on return. Regression clean.

---
# V1.11.4 — restore original Cloud sync banner, remove floating sync icon
- Per user (screenshot): sync should be the original "Cloud sync / Sign in" banner on Today, not a
  floating icon. Un-hid #todaySyncBar on Today; removed the floating #syncIcon + #syncPop (markup,
  CSS, showTab toggle). renderSyncIcon/init are guarded so leftover calls no-op safely.
- Verified: Cloud sync banner visible on Today with status dot + Sign in; floating icon gone;
  regression clean; zero errors. Screenshot matches the requested reference.

---
# V1.12.0 — CRITICAL sync data-loss fix + Trash (30-day)
## Data-loss bug (Critical)
- Root cause: queueChangedSyncRecords inferred DELETIONS from any shadow key missing in current
  state. On a fresh/empty device (or before initial remote pull), this generated tombstones for
  records the device never had -> pushed deletions to Firestore -> wiped synced data on all devices.
  (Matches user report: synced on web, fresh install showed nothing, then web went blank too.)
- Fix: guard deletion inference. Suppress deletions when (a) syncInitialHydration, (b) all CONTENT
  records are absent but shadow had them (fresh device/glitch), or (c) >50% of content vanished at
  once. Config keys (set/cats/incCats) excluded from the content count so the guard measures real
  data. Genuine single deletes still tombstone normally. Verified: empty-state -> 0 tombstones;
  single delete -> 1 tombstone.
## Trash / recently deleted (NEW, also hardens deletes)
- Soft delete: tasks, habits, journal entries now go to state.trash[] (with type/label/timestamp)
  instead of vanishing. Routed: deleteTask, AI delete_task/journal/habit, habit-detail delete,
  journal multi-select delete.
- Auto-purge: normState drops trash items older than 30 days on every load.
- UI: Settings -> Data -> "Recently deleted" opens a Trash sheet listing items with days-left and
  a Restore button.
- Verified: delete->trash->restore round-trip; 30-day purge; trash UI.
- NOTE: transactions intentionally NOT soft-deleted (money integrity); can add if wanted.
- Native sync round-trip still needs on-device confirmation with Firebase; logic verified here.

---
# V1.12.1 — CRITICAL sync PULL fix (old data not restoring)
## Root cause (why Android showed no old data)
- applyRemoteRecords skipped any remote record whose timestamp was <= the local shadow's
  timestamp for that key. The earlier buggy build wrote DELETE tombstones into the phone's shadow
  with recent timestamps. So on the fixed build, when the phone pulled the real cloud records, they
  were skipped (at <= poisoned lat) -> old data never restored.
## Fix
- applyRemoteRecords(docs, force): initial reconcile now force-applies ALL remote records when the
  device has no meaningful local data (fresh install / restore), bypassing the stale/poisoned shadow.
  Also drops local pending DELETE tombstones before a fresh restore so they can't re-delete.
- New "Restore from cloud" button (Settings -> Cloud sync): force re-pulls everything from server
  (source:'server'), clears local delete tombstones first. Manual recovery path.
- Verified: with a poisoned shadow (stale tombstone), non-force pull restored 1/2 (bug reproduced);
  force pull restored 2/2 (fixed).
## HONEST limits
- If the cloud records themselves were already overwritten/tombstoned as deleted by the old build,
  a pull cannot un-delete them. Recovery then requires a device/browser that still holds the data
  locally -> export JSON backup -> import. The force-restore only helps if the cloud still has the
  real (non-deleted) records.
- Live Firebase round-trip is untestable here; logic verified via simulated remote docs.

---
# V1.12.2 — Restore auth fix + performance (debounced persist)
## Bug: "Restore from cloud" said "sign in first" while signed in
- Cause: restore checked !fbRecords, but in legacy sync mode fbRecords is null (fbUser still set).
- Fix: restore now checks fbUser only; supports BOTH record-level (fbRecords) and legacy (fbDoc)
  modes; offline guard. Verified: legacy-mode signed-in restore no longer says "sign in first" and
  pulls cloud data.
## Performance: debounced persist (Android lag)
- persist() ran full stateJson + localStorage + nat.saveState + pushAlarms(computeAlarms) +
  queueChangedSyncRecords (hash every record) synchronously on EVERY change (116 call sites). With
  221+ journal entries this caused lag.
- Fix: persist() now writes localStorage immediately (data safety) but DEBOUNCES the heavy work
  (native full-state save, alarm recompute, sync-record hashing) by 500ms; flushes on
  visibilitychange/pagehide and via persist({now:true}). Verified: immediate localStorage write
  kept; heavy work batched; regression + backup/restore suites still pass.
- HONEST: on-device lag improvement can't be measured here; this removes redundant heavy work per
  keystroke/tap which is the most likely cause.

---
# V1.12.3 — update Android launch splash to InnerOs
- The launch splash (@drawable/launch_brand, LaunchTheme) still showed the OLD logo + wordmark.
  Regenerated splash app_icon.png at all densities (mdpi..xxxhdpi + 1024 master) from the InnerOs
  Monk+Progress icon, and brand_word.png (720x104) to read "InnerOs".
- No JS change. HONEST: splash only updates after the APK is rebuilt + reinstalled; can't verify on
  device here.

---
# V1.13.0 — nav no-scroll + manual/incremental sync
## Nav bar
- Dock changed from overflow-x:auto with fixed 82px tabs to overflow:hidden + flex:1 tabs, so the
  5 tabs (Today/Tasks/Money/Journal/More) fill the bar evenly with no horizontal scroll.
## Sync: manual + incremental
- Removed auto-push: persist() no longer calls scheduleSyncPush. Changes are queued
  (queueChangedSyncRecords) and state shows 'pending', but nothing uploads until the user taps Sync.
- Removed the live onSnapshot listener: attachFirestoreSync now pulls ONCE on open (via
  syncReconcile .get) then does nothing automatically. "Sync now" (syncReconcile) pulls+pushes on demand.
- Incremental confirmed: pushRecordSync only uploads records in syncPendingRecords (diffed vs shadow).
  Verified: changing 1 of 10 records -> exactly 1 pending (not all).
- New 'pending' banner state: "Changes to sync — Tap Sync to save changes to the cloud".
- Verified: nav not scrollable (5 tabs, overflow hidden); no auto-push on change; incremental push;
  regression + backup/restore suites pass.

---
# V1.14.0 — UI redesign (Journal / Money / Tasks) + markdown fix
Grounded in Day One / Copilot Money / Things 3 / Todoist patterns (content-first).
- Markdown fix: jrClean() strips **bold**/###/`code`/list markers from journal titles+snippets;
  jrCard drops a leading title-duplicate from the body (fixes "**Title**" leaks and
  "TitleFrom Monday…" run-ons).
- Journal: 6 stat tiles -> one quiet line (🔥streak · entries · days) + small Export; entries appear
  sooner. (jrStatMonth/jrStatBest kept hidden so render code is untouched.)
- Tasks: 8 stat tiles (2 rows) -> one compact line (overdue/today/upcoming/done); removed the
  dynamically-injected aging-summary row. Cards unchanged (pin/snooze/dup still there).
- Money: three tiles -> a big "spent this month · N left" hero with in/out subline + insight;
  transactions rise up.
- Verified: markdown cleaned, stat lines render, money hero renders; suite1 51/52 (known timing),
  suite2 25/25; zero errors. Screenshots captured.
- Minor leftover noted (not fixed this pass): Money "Export date range" button still bottom-left
  (superseded by Financial Tools export) — can remove next.

---
# V1.14.1 — Money polish (revised build)
- Removed redundant "Export date range" button under transactions (export lives in Financial Tools).
- Fixed hero cramping: .expSum was a 3-col grid (old tiles); now block so the spent hero + insight
  are full-width, not squeezed side-by-side.
- Verified: hero full-width, range button gone, expSum block; suite1 51/52 (known timing), suite2 25/25; zero errors.

---
# V1.14.2 — task/journal stat line horizontal + overdue reminders
- Fixed stat lines wrapping to multiple lines: taskStatLine & jrStatLine now flex-nowrap +
  justify-between + nowrap spans + smaller gap/font, so the 4 items stay on one horizontal row.
- Overdue task reminders (NEW): previously reminders only fired BEFORE due date; overdue tasks went
  silent. Added a 3-day 9am overdue nudge for any incomplete past-due task (toggle rc.overdue).
  Verified: 3 overdue reminders scheduled for a past-due task; stat line one-row confirmed.

---
# V1.15.0 — performance + UX batch
PERF:
- Journal timeline virtualized: renders ~25 items then loads more on scroll via IntersectionObserver
  sentinel (was building all 221 entries upfront). Initial render ~12 cards vs 221; big lag source gone.
- today() memoized (30s cache) to cut repeated Date formatting across renders.
- Journal search debounced 150ms (task search already was 180ms).
UX:
- Task cards: 3 crammed action buttons (pin/snooze/dup) collapsed behind a single ⋯ menu that
  reveals them on tap (declutter; swipe wasn't testable headless so used a reliable tap-menu).
- Empty states + Today "at a glance" card: reviewed — already good; deliberately NOT changed
  (would degrade working UI for false consistency).
- Deferred (device-dependent, honest): true swipe gestures, pull-to-refresh, Android haptics —
  need real touch/native; not shipped this pass.
Verified: virtualization paging; today memo; debounced journal search; more-menu + pin-through-menu;
suite1 51/52 (known timing), suite2 25/25; zero errors.

---
# V1.16.0 — Android-native hardening
CRASH RESILIENCE:
- onRenderProcessGone: recreates the WebView + reloads instead of dead white screen (memory-kill recovery).
- Hardware back: routes through JS window.handleAndroidBack() -> closes open sheet/menu/popover, else
  journal sub-view->timeline, else non-Today->Today, else double-tap-to-exit. (Was: canGoBack->exit.)
NATIVE POLISH:
- Haptics: nat.haptic() (18ms one-shot) fired on habit + task completion; JS falls back to navigator.vibrate.
REMINDER RELIABILITY:
- Reviewed: NativeAlarms ALREADY does canScheduleExactAlarms() fallback to inexact; BootReceiver ALREADY
  re-arms alarms on BOOT_COMPLETED. No change needed (told user, not faked).
BUILD TWEAKS:
- largeHeap: recommended SKIP (journal virtualization already fixed the memory pressure; largeHeap can
  worsen GC jank). Not added.
Verified (web side): back handler consumes sheet/nav correctly, returns false on Today; haptic safe;
suite1 51/52 (known timing), suite2 25/25; zero errors.
HONEST: native Java (onRenderProcessGone, haptic, back eval) is untestable here — needs on-device build.

---
# V1.17.0 — Android reliability/perf/polish (remaining items)
#3 Offline/error page: onReceivedError(main frame) -> showErrorPage() renders an inline retry screen
   (emoji + "Couldn't load InnerOs" + Retry button) instead of a bare toast.
#6 WebView first-paint tuning: hardware layer, RenderPriority.HIGH, MIXED_CONTENT_NEVER_ALLOW,
   overscroll-none. Low-risk.
#9 Pull-to-refresh: implemented in WEB layer (touch overscroll-at-top -> release to sync) because the
   build compiles against android.jar only (no androidx SwipeRefreshLayout). Indicator + syncReconcile.
#10 Predictive back: android:enableOnBackInvokedCallback="true" in manifest (works with custom back).
#7 largeHeap: DELIBERATELY NOT SET — journal virtualization already fixed the memory pressure; largeHeap
   is a known anti-pattern that can worsen GC jank. Recommended skip (told user).
Fixed a self-inflicted bug: my showErrorPage insert had displaced @TargetApi(28) off showBiometricPrompt;
   restored it. Java catch syntax corrected (was JS-style).
Verified (web): JS/CSS valid, manifest valid, biometric annotation intact; suite1 51/52 (known timing),
   suite2 25/25; zero errors.
HONEST: native pieces (error page, webview tuning, predictive back) untestable here; PTR touch untestable headless.

---
# V1.18.0 — big requirements batch (final)
1. MIC PERMISSION BUG (fixed): WebView had no onPermissionRequest -> in-app Web Speech mic auto-denied
   despite OS RECORD_AUDIO granted. Added onPermissionRequest (grants RESOURCE_AUDIO_CAPTURE, requests
   OS perm if needed) + made Android prefer native speech recognizer. Audited all perms — rest correct.
2. JOURNAL DRAFTS (new): unsaved new entries auto-save to state.jrDrafts on editor close; "📝 Drafts(N)"
   button on timeline lists them; tap to resume, delete, or auto-clear on save; empty editor makes no draft.
3. TODAY CLEANUP: removed quick-action widgets (#quickActions) + Momentum hero (.heroTop) via CSS.
4. PROMINENCE: Tasks summary -> bold 4-tile stat card (big colored numbers); Money "spent this month"
   -> prominent hero box (44px, gradient border).
5. STRICT ON-OPEN REMINDERS (new): in-app banner on Today — after 9pm nags pending mood/journal
   (worded to what's missing) until logged; before noon nags sleep. Two Settings toggles (strictMoodJournal,
   strictSleep). In-app banner (not push), per user.
6. WIDGETS: combined "Quick Log" widget NEW (LogHubWidget + widget_loghub layout/info + drawables +
   manifest + strings): Habit/Task/Mood/Sleep/Journal/AI cells deep-link into the app via
   WidgetHub.openAppDeep -> getLaunchAction. Tasks widget ALREADY existed and matches spec (scrollable
   overdue/today list, circle=complete, body=open task) — verified, no change needed.
VERIFIED (web): mic-fix code, drafts end-to-end, Today cleanup, task card + money hero, strict reminder
   paths, settings toggles; suite1 51/52 (known timing), suite2 25/25; zero errors. Java/XML validated.
HONEST: all native (mic onPermissionRequest, LogHub widget, tasks widget) untestable here — verify on device.

---
# V1.19.1 — REVERT journal restructure
- Per user request, reverted the V1.19.0 journal restructure (✦ AI top button, 2-tab nav,
  calendar+memories merge, write/insights removal, weekly-goal removal, Money/Tasks polish).
- Method: restored the working tree from the pre-restructure build (v1.18.0-final) rather than
  hand-undoing edits (safer). The v1.19.0 tree was kept aside as imp_backup_1_19 in case it's
  wanted later.
- Journal is back to 5 tabs (Timeline/Calendar/Write/Memories/Insights). All v1.18.0 features
  intact (mic fix, drafts, strict reminders, Today cleanup, widgets, etc.).
- Verified: JS valid; suite1 51/52 (known timing), suite2 25/25; zero errors.

---
# V1.20.0 — feature cleanup (user-selected removals)
- Journal "Insights" tab RENAMED to "AI" (sparkle icon); removed its duplicate stats
  (streak/total/days/longest — they duplicate the Timeline stat line); KEPT range/whole/ask AI features.
- Weekly writing goal removed (jrGoalCard -> hidden placeholder; render code guarded).
- Routine stack removed from Settings; guarded btnStack + stStack references.
- Category-1 dead code removed from Today: momentum hero (heroTop), quick-actions, and the visible
  wrappers for qod/nextRem/aiInsights/recoverBox/stackBox (kept hidden <span> placeholders so guarded
  render code never null-crashes). sleepCard/wkCard KEPT (used by More->Health).
- KEPT per user: Workouts/Fitness, multi-currency/FX.
- Fixed 2 null-ref bugs surfaced by removal (btnStack, stStack) by guarding them.
- Verified: AI tab (range/whole/ask present, stats gone), goal gone, routine stack gone (0 in markup),
  today dead blocks gone; no dup ids; suite1 51/52 (known timing), suite2 25/25; zero errors.

---
# V1.20.1 — export title dedup + Talk/Write placement + Write cleanup
- Single-entry export showed title 3x: (1) page H1, (2) per-entry heading, (3) body first line (imported
  entries repeat their own title). Fix: jrEntryHtmlForExport de-dupes a leading title from the body (DOM
  TreeWalker, robust to tags); single-entry export suppresses the per-entry <h2> when it equals the H1.
  Now visible title = 1. (The <title> in <head> is document metadata, not printed.)
- "Talk/Write about my day": added to AI tab (jrTalkBtnAi) + already in Timeline (Ask about my day menu);
  no longer Write-only.
- Write tab: removed "Today's context" card (jrCtx kept as hidden placeholder for render safety).
- Verified: export title once, talk in AI+Timeline, today-context gone from Write; no dup ids;
  suite1 51/52 (known timing), suite2 25/25; zero errors.

---
# V1.21.0 — Settings card-grid UI
- Replaced the Settings accordion with a 2-col CARD GRID landing (Profile/Appearance/Money & currency/
  Reminders/Privacy & security/Pause/Cloud sync/Data), each card = icon + title + subtitle.
- Tap a card -> only that section's options show, with a "‹ Settings" back bar + section title. Back
  returns to the grid. Re-opening Settings resets to the grid.
- Reused the .lbl-header grouping; sections hidden on landing, shown on drill-in. Export More-card now
  drills into the Data section.
- Verified: 8 cards, sections hidden on landing, drill-in shows one section + back bar, back returns,
  reopen resets; suite1 51/52 (known timing), suite2 25/25; zero errors.

---
# V1.22.0 — Profiles (multi-user, cloud + password)
- Profile = a Firebase email/password account (real per-account cloud isolation + real password
  protection; reuses existing createUser/signIn). Confirmed feasible against current auth.
- Remembered profiles (hb_profiles_v1): stores email + display name + lastUsed ONLY — never passwords.
- Signed-out sync state shows a "Saved profiles" list: tap Sign in -> fills email, prompts password
  (password required every switch, per user). Forget removes a profile from the device (cloud data kept).
- Signed-in state: "👥 Switch / add profile" -> switchProfileFlushAndSignOut(): flushes current data to
  ITS cloud (best-effort, 6s timeout), CLEARS local state + sync shadows, signs out -> next person can't
  see prior data. Backup-before-switch safety given prior sync incidents.
- On successful sign-in, the profile is remembered; current profile excluded from the switch list.
- Verified (mock auth): remember 2 profiles, list renders, one-tap fills email, current excluded,
  switch clears habits/jr to 0 + signs out, NO password stored; suite1 51/52 (known timing), suite2 25/25; zero errors.
- HONEST: live 2-account cloud round-trip untestable here (needs real Firebase) — verify on-device.
  Sign-out clears visible data by design; no master unlock; each person needs their own password.

---
# V1.23.0 — Today profile switcher chip
- Avatar chip (current profile initial) added top-right of Today, next to search.
- Tap -> menu: current profile header + "Switch to" (other saved profiles) + "Add profile" +
  "Manage in Settings". Reuses the tested v1.22.0 profile system.
- Switch: confirms -> switchProfileFlushAndSignOut() (flush current to its cloud, clear local) ->
  routes to Cloud sync with the target email prefilled, password required (per user's choice).
- Add profile: signs out current (if any) -> routes to Cloud sync sign-in with email focused for
  "Create account".
- Chip avatar updates via renderSyncUI/renderProfileChip; menu closes on outside tap.
- Verified: chip present, avatar initial, menu (current+others+add+manage), current excluded from
  switch list; suite1 51/52 (known timing), suite2 25/25; zero errors.
- HONEST: switching still needs the target profile's password (real protection); live cloud round-trip
  untestable here.

---
# V1.23.1 — profile chip to top-right corner
- Changed .profileChip from an inline header item to position:fixed at the top-right corner
  (top:10px+safe-area, right:14px, z-index 58). Added #pgToday .h1row padding-right so the search
  button clears it. Chip lives inside #pgToday so it only shows on Today (hidden when that page is display:none).
- Verified: chip at corner (top 10, 14px gap), no overlap with search, hidden off Today, still opens
  the profile menu; suite1 51/52 (known timing); zero errors.

---
# V1.24.0 — UI/UX refinement brief pass
Audited the full brief against the current app. MOST items already implemented (5-tab nav, Today
4x2 glance with —/0 semantics, Habits/Mood/Sleep under Today, Money sub-tabs + Financial Tools,
Journal 5-section scrollable nav, compact empty states, More hub, global+contextual AI, FAB with
env(safe-area-inset) offsets + page bottom padding). Did NOT rebuild what already conforms.
REAL DELTA FIXED:
- Money "Financial tools / Plan & manage / Financial Tools" duplicated hierarchy -> collapsed to a
  single "Financial tools" eyebrow + the launcher (removed the redundant "Plan & manage" bold and
  the doubled label), per brief section 5.
Verified: 5 tabs, glance grid, journal nav overflow-x:auto, FAB safe-area, Plan&manage gone,
Financial Tools launcher intact; suite1 51/52 (known timing), suite2 25/25; zero errors.
HONEST: I refined rather than rebuilt — the brief's "SAME APP + BETTER ORG" goal was largely already
met by prior work, so I fixed only the genuine remaining discrepancy rather than manufacturing churn.

---
# V1.25.0 — Today/Tasks/Money/Settings polish (user screenshots)
- Today: removed momentum ring + "Best chain: N days" banner (heroRing no longer rendered; #hero
  emptied+hidden). (Per-habit streak chip on habit cards unchanged — that's a different element.)
- Settings: removed the dynamically-inserted "Advanced tools" card.
- Tasks: stat tiles restyled into a cleaner card grid (bigger colored numbers, uppercase labels,
  subtle red/orange tint on Overdue/Today).
- Money: hero restructured to spend-left / in-out-right (expHeroL + expHeroR flex row).
- Verified: ring/flame gone on Today, Advanced tools gone, hero left/right, task cards; suite1 51/52
  (known timing), suite2 25/25; zero errors. Screenshots captured.

---
# V1.25.1 — uniform task tiles + money hero spacing
- Task stat tiles: removed a stale duplicate CSS block that re-added colored tint/border to
  Overdue/Today. All 4 tiles now uniform (same neutral card, min-height:78px, only numbers colored).
- Money hero: padding 22px top / 20px left so the amount has space above (from border) and on the left.
- Verified: no stale border rule (0), CSS valid, uniform tiles + hero spacing in screenshots;
  suite1 51/52 (known timing); zero errors.

---
# V1.26.0 — consistent cards + compact task summary + Remaining-first Money
- Consistent card system: --cardR:16px/--cardPad:15px/--cardGap:10px; normalized setCard/todayProgress/
  taskCard/moreCard/jcard/tools/expHero to shared radius + padding for cross-screen consistency.
- Tasks: replaced the 4 big stat cards with ONE compact single-row summary card
  (1 Overdue · 1 Today · 1 Upcoming · 1 Done, nowrap) -> more space for the task list.
- Money: hero reworked to "REMAINING THIS MONTH" as the headline figure (₹net, red if negative) with
  "+ Income" / "− Spending" underneath — removed the ↑/↓ arrows for clarity.
- Verified: money shows Remaining/Income/Spending + no arrows; task summary one row (4 items same top);
  cards consistent; suite1 51/52 (known timing), suite2 25/25; zero errors.

---
# V1.27.0 — hero account balance + search corner + responsive
- Today: search button pinned to the corner (position:fixed, right:58px) next to the profile chip
  (right:14px); h1row padding-right:96px so the title clears both. No more mid-row search.
- Money hero: added account selector chips (All + each active account). "All" -> Remaining this month;
  a specific account -> that account's live balance via acctBalance (verified HDFC 5000+85000-1200=88800).
  Choice stored in state.set.heroAcct.
- Responsive: @768px #app/.page widen to 900px + larger journal editor (220px); @1024px widen to 1040px,
  editor 300px, entry cards max 820px reading width, dock stays centered. Wider writing area on desktop/tablet.
- Verified: search+profile both in corner no overlap; hero shows chosen account balance; desktop #app=1040,
  editor=300; suite1 51/52 (known timing), suite2 25/25; zero errors.

---
# V1.27.1 — hero account expense + wider desktop journal editor
- Money hero (account selected): now shows month Income + Spending for that account (sum of tx in
  current month filtered by acct) beneath the balance, plus a "this month · type" caption.
  Verified HDFC: bal 88,000, +85,000 income, −2,000 spending.
- Desktop journal editor: the @1000px sheet-as-modal capped width at 480px, so #jrBody stayed narrow.
  Added #jrSheet{width:min(760px,100vw-120px)} + #jrBody min-height 360 at >=1024px. Verified sheet=760,
  body=718 wide on 1280px viewport.
- Verified: suite1 51/52 (known timing), suite2 25/25; zero errors.

---
# V1.28.0 — clearer journal stats + compact export
- Journal timeline stats: replaced the ambiguous "streak/entries/days" line with 4 labeled tiles —
  Current streak (🔥), Longest streak, Entries, Days (jrStatBest now visible; already computed via
  jrLongestStreak + set in render). Export + Drafts shrunk to small icon buttons (⬇/📝) so they no
  longer eat space. Removed conflicting old .jrStatLine b rule.
- Verified: 4 labeled stats show correct values, export as icon, one row; suite1 51/52 (known timing),
  suite2 25/25; zero errors.

---
# V1.28.1 — journal stats redesigned as one clean card
- The 4 separate cramped stat tiles looked weird; replaced with a SINGLE "Your journey" card:
  header row (title + export/drafts icons in the corner) and a divided 4-stat row
  (Current streak 🔥 / Longest streak / Entries / Days) with big numbers + 2-line labels + subtle
  vertical dividers. Much cleaner hierarchy.
- Verified: card renders with correct values + labels; suite1 51/52 (known timing), suite2 25/25; zero errors.

---
# V1.29.0 — warn before leaving with unsynced changes
- Browser: beforeunload fires the native "leave site?" confirmation when syncPendingRecords is
  non-empty (also best-effort pushRecordSync). Note: browsers only show a GENERIC message + can't run
  async sync during unload (platform limit) — it's a warning, not a forced sync.
- Android: back-to-exit now routes through window.handleAndroidExit() BEFORE finishing. If there are
  pending changes it shows an in-app dialog: "Sync now" (runs syncReconcile) or "Exit anyway"
  (nat.exitApp). Added native exitApp() bridge. In-app dialog CAN offer a real Sync button (unlike the
  browser unload).
- Verified: no-pending exits freely; pending shows dialog; Sync now closes+syncs; Exit anyway calls
  exitApp. Java/JS/CSS valid; suite1 51/52 (known timing), suite2 25/25; zero errors.
- HONEST: native back+exitApp untestable here (verified JS logic + Java structure); browser unload text is not customizable.

---
# V1.29.1 — FIX desktop sidebar overlap + exit dialog buttons
- Desktop overlap: my earlier @768/@1024 blocks set #app max-width!important + shrank .dock, which
  wiped the sidebar's margin-left:248px -> content hid behind the fixed sidebar. Rewrote as
  @768-999 (centered, no sidebar) and @1000+ (respects sidebar: .page centered within the 248px offset,
  never touches #app margin or the dock). Verified appLeft(340) >= navRight(248), contentClear.
- Exit dialog buttons: made handleAndroidExit robust — remove dupes, addEventListener (not onclick),
  Sync now falls back to pushRecordSync, Exit anyway falls back nat.exitApp->nat.back->history.back so
  it works even if the new exitApp bridge isn't in the current APK. Verified Sync now + Exit anyway fire.
- Verified: desktop no overlap; exit buttons work; suite1 51/52 (known timing), suite2 25/25; zero errors.

---
# V1.30.0 — Today task-overview removed, full-width task summary, Vault (encrypted)
- Today: removed the Tasks overview card (renderTaskDashboard now hides #taskDashSummary).
- Tasks: summary row now full-width (#taskSummary forced display:block; .taskStatRow width:100%).
  Verified rowW == cardW == pageW (354).
- Vault (More → Vault): encrypted passwords + secure notes. Crypto = PBKDF2(PIN,100k,SHA-256) ->
  AES-GCM 256 via Web Crypto. Requires app PIN; entries encrypted at rest in state.vault (SYNCS per
  user's choice). Tabs (Passwords/Notes), add/edit/delete, copy password. Explicit warnings: not a
  hardened manager; same PIN needed on every device; forgotten PIN = unrecoverable.
  Verified: encrypt/decrypt round-trip, WRONG PIN FAILS, no-PIN guard, unlock+list, notes tab.
- Verified: suite1 51/52 (known timing), suite2 25/25; zero errors.
- HONEST: web-side crypto verified; not a security-audited vault; native/sync round-trip needs device.

---
# V1.31.0 — Vault redesign (per brief)
- Vault home: 🔐 header + "Your secure space", search bar, Passwords/Notes summary cards, filter chips
  (All/Passwords/Notes/⭐Favorites), sort control (updated/added/A-Z/Z-A/favorites), card list, floating +.
- Data model extended BACKWARD-COMPATIBLY: id/category/tags/favorite/createdAt/updatedAt added via
  normVaultItem; old entries (title/user/pass/url/notes or title/body) load & display correctly. Encryption
  (PBKDF2->AES-GCM) UNCHANGED. state.vault preserved.
- Removed prompt()-based flow -> proper in-app forms (Add/Edit Password + Note) with validation + errors.
- Password detail: masked by default, show/hide, copy user, copy pass, open website, edit, delete, fav toggle.
- Note detail: readable content, edit/delete/fav, last-updated.
- Search across name/user/domain/note title/content/category/tags; live; clean empty state. Categories
  (Personal/Work/Finance/Travel/Shopping/Documents/Other). Lightweight tags. Add menu (Password/Note).
- Lock Vault action. Kept honest security warning (no bank-grade claims).
- Renamed vault detail fn -> vaultOpenDetail to avoid collision with habit openDetail.
- Verified: OLD-format loads (backward compat), form add+validation, search, favorites, detail mask+reveal;
  suite1 51/52 (known timing), suite2 25/25; zero errors.

---
# V1.31.1 — Vault is now a full page (was a bottom sheet)
- Converted #vaultSheet -> <div class="page" id="pgVault">; added pgVault to showTab's page list +
  subPages (keeps More highlighted). openVault -> showTab('pgVault'). Lock button -> showTab('pgMore').
- FAB -> position:fixed above nav; add-menu -> fixed full-screen overlay over home (vShow no longer
  toggles the menu). Delegation retargeted to #pgVault.
- Verified: opens as page (onPage true, More highlighted), unlock, add-menu overlays home, leaving via
  tabs works; suite1 51/52 (known timing), suite2 25/25; zero errors.

---
# V1.32.0 — import Promega_LLP.docx data into Vault
- Parsed the doc into 13 password entries (simple logins: DIGILocker, Meesho, IRCTC, Apple, LinkedIn,
  GitHub, EPF, Amazon x2, etc.) + 10 secure notes (rich records kept whole: Kotak Salary/Current,
  HDFC, SBI, HDFC Women's, Demat, SBI/RBL credit cards, Passport Seva, Fable work credentials).
  Bank/card/ID records -> notes so nothing (CVV/PIN/IFSC/security-Qs) is lost.
- One-time seed embedded (VAULT_IMPORT_SEED) + mergeVaultImport(): on unlock, merges de-duped by title,
  encrypts via existing PBKDF2->AES-GCM, sets state.set.vaultImported_promega so it never re-imports.
- Verified: first unlock -> 13 pw + 10 notes; second unlock -> still 13/10 (no dupes); sample entries present.
  suite1 51/52 (known timing), suite2 25/25; zero errors.
- HONEST: highly sensitive data (bank cards/CVV/PINs/gov IDs). This vault is convenient encrypted
  storage, not a hardened manager — for this sensitivity a dedicated manager is safer.

---
# V1.33.0 — Vault: removed seed, added extra fields + Excel export/import
- Removed the auto-import seed logic entirely.
- Password entries now support ADDITIONAL DETAILS (extra: [{label,value}]) — bank/card/ID info lives
  UNDER the password (not as notes). Form has "+ Add detail" rows; detail view lists them with Copy.
- Excel export (2 sheets: Passwords [Title,Username,Password,URL,Category,Tags,Notes,Favorite,Extra],
  Notes [Title,Content,Category,Tags,Favorite]) via SheetJS + saveFile/webSave.
- Excel import: reads both sheets, merges by title (update existing, add new), Extra parsed from
  "label=value | label=value". Verified: import generated file -> 23 pw + 1 note; extra fields
  (IFSC/CVV/SecQ) land under the password; export button produces xlsx (36KB round-trip).
- Delivered InnerOs_Vault_Import.xlsx pre-filled with Promega_LLP data (bank/card details in Extra column).
- suite1 51/52 (known timing), suite2 25/25; zero errors.

---
# V1.34.0 — Vault category/tag filtering + custom categories + Excel category validation
- Categories now dynamic: VAULT_DEFAULT_CATS + state.vaultCats (custom). allVaultCats()/addVaultCat().
  Form category dropdown has "＋ New category…" (prompt -> saved). Import auto-registers unseen categories.
- New filter row (#vaultCatChips) below type chips: category chips (with counts) + #tag chips; tap to
  toggle-filter the list. Verified: Finance->1, #important->2, chips render (3 cats/3 tags).
- Excel export: Category columns get a data-validation DROPDOWN restricted to existing categories (pw col E,
  note col C) + a "Categories" reference sheet listing valid values (incl. custom). Verified in exported xlsx.
- Regenerated InnerOs_Vault_Import.xlsx with the category dropdown + Categories sheet.
- suite1 51/52 (known timing), suite2 25/25; zero errors.

---
# V1.35.0 — vault search covers content; AI vault access confirmed OFF
- AI: verified the vault is NOT in any AI context (buildDataContext etc. never reference state.vault).
  By design — vault is PIN-encrypted; routing decrypted passwords to the AI provider would be a leak.
  Kept AI-inaccessible.
- Vault search fixed: vaultMatch now searches title, username, url, note body, password notes, category,
  tags, AND extra fields (label+value like IFSC/Account No/security answers). Password value itself is
  intentionally NOT searched. Verified: IFSC label/value, pw notes, note content, title all match; AI
  context still excludes vault.
- suite1 51/52 (known timing), suite2 25/25; zero errors.

---
# V1.36.0 — motion system wired into real interactions (APPROVED to build)
- Motion tokens in :root (t-fast/normal/emph/data + easing). Global press-scale on buttons/cards/chips/tabs,
  page slide-in, toggle glide, mood pop, reduced-motion media query.
- Habit complete: checkbox pop (chkPop) on tap + streak pulse (streakPulse) + haptic on newly-done.
- Money hero NUMBER INTERPOLATION: animates from previous value (never 0) over 560ms via animNum, with
  window._lastHeroNum cache; reduced-motion skips it. Verified -1000 -> (mid -1245) -> -1500.
- Helpers: _reducedMotion(), pulseEl(el,cls), animNum(el,to,dur,fmt). All transform/opacity or textContent
  only (no layout thrash).
- Verified: token present, hero interpolates mid-animation, helpers exist, reduced-motion honored;
  suite1 51/52 (known timing), suite2 25/25; zero errors.
- HONEST: motion adds polish, not raw speed; ring animation skipped (momentum ring was removed from Today
  earlier); native feel needs on-device confirmation.

---
# V1.37.0 — FIX vault not syncing (record-level mode)
- Root cause: syncRecordEntries() listed every key EXCEPT state.vault/vaultCats, so in record-level sync
  mode the vault was never pushed to the cloud (it only rode along in legacy/compatibility whole-blob sync).
- Fix: added vault:all + vaultCats:all to syncRecordEntries (as config-like value records) and handlers in
  applySyncRecord to restore them on pull. Not matched by isContent() so they upsert safely and are immune
  to the content-deletion guards.
- Verified: vault in sync entries, change queues vault:all push, pulled vault applies, syncs even with no
  other content; suite1 51/52 (known timing), suite2 25/25; zero errors.
- HONEST: live 2-device cloud round-trip untestable here (needs Firebase); logic verified. Requires the
  Firestore Rules published (same as other record-level sync).

---
# V1.38.0 — sync audit: add jrDrafts + trash; confirm vault notes sync
- Audited every state.* key vs syncRecordEntries. Vault secure NOTES already sync (inside encrypted
  state.vault blob — confirmed decrypt round-trip). Genuine gaps found + fixed:
  - jrDrafts (journal drafts) -> now synced (jrDrafts:all).
  - trash (recently-deleted, 30-day) -> now synced (trash:all).
  Both config-like value records + applySyncRecord handlers; immune to content-deletion guards.
- Correctly NOT synced (device-local/transient): timers (running timers), mtime (sync metadata),
  stack (dead — Routine Stack UI removed).
- Full synced set now: habit/task/journal/jrtpl/jrDrafts/tx/acct/exercise/workout/sleep/goal/mood/
  moodNote/hlog/closed/budg/budgets/cats/fxRates/incCats/set/vault/vaultCats/trash.
- Verified: all populated keys appear in sync entries; jrDrafts/trash queue + apply; vault note round-trips;
  suite1 51/52 (known timing), suite2 25/25; zero errors.

---
# V1.39.0 — FIX: logging sleep/mood/journal didn't refresh Today (card + strict reminder)
- Root cause: saveSleep only called renderSleepCard() (not renderToday), so the "Today at a glance" Sleep
  metric AND the strict "Sleep not logged" reminder didn't refresh until the app was reopened (which runs
  a full renderToday). Same gap for mood (renderMood only) and journal (renderJr only).
- Fix: saveSleep -> renderToday(); mood-today handler -> renderStrictReminders()+renderTodayProgress();
  saveJr -> renderStrictReminders(). Now the card updates and the strict nag clears immediately.
- Verified: strict "Sleep not logged" shows before, GONE immediately after logging (no reopen);
  suite1 51/52 (known timing), suite2 25/25; zero errors.

---
# V1.40.0 — general fix: any data change auto-refreshes Today (glance + strict reminders)
- Root pattern (same as sleep bug): many log/save paths (saveTask, toggleTaskComplete, tapMain,
  toggleDay, setVal, saveExp, addExpense, etc.) persist() but never re-render Today, so the glance card,
  task summary, and strict reminders went stale until app reopen.
- Fix: persist() now schedules a debounced (60ms) Today refresh — renderStrictReminders +
  renderTodayProgress + renderTaskDashboard — but ONLY when #pgToday is the visible tab. Guarded so it
  never interferes with saving. Catches every current + future data-change path automatically.
- Kept the earlier explicit sleep/mood/journal refreshes (harmless, immediate).
- Verified: task add -> Due today=1, expense -> Spent ₹250, habit complete -> Habits 1/1 + streak, all
  auto-update while on Today with no reopen; suite1 51/52 (known timing), suite2 25/25; zero errors.

---
# V1.41.0 — full QA pass + isFroz robustness fix
- Ran 77 automated checks (functional/logic/negative/edge/boundary/security/resilience) across all modules.
  72 pass; 1 real bug (fixed); 4 test-harness artifacts (re-verified working); long-standing suite-1
  "More->Mood" failure re-investigated -> mood sheet DOES open (timing artifact, not a bug).
- ISSUE-1 FIXED: isFroz(h,ds) guarded (h&&h.frozen&&h.frozen[ds]) — was unguarded, could throw on a
  habit lacking a frozen map (corrupted/hand-edited import bypassing normState).
- Verified: XSS-escaping, data resilience (garbage input), boundaries (500 tasks/long text), money math
  incl xfer, streak gap logic, vault crypto+wrong-PIN-fails+no-AI-access, sync coverage, trash purge,
  no dup IDs, 5 nav tabs. Report: out/InnerOs_QA_Report.md.
- HONEST: native layer (sync round-trip, widgets, notifications, biometric, haptics, APK) untestable here
  — documented as [DEVICE] items needing on-device verification.
- suite1 51/52 (known timing), suite2 25/25; zero errors.

---
# V1.42.0 — FIX: sleep never synced (id-less records) + sync array audit
- Root cause: syncRecordEntries().addArray() keyed records by v.id, but SLEEP records have no id (keyed by
  d=date). So every sleep record was silently skipped -> sleep never pushed/pulled. User saw "synced but
  card still says Log sleep" because the data never actually arrived.
- Fix: addArray takes an optional id-field; sleep now keyed by 'd' (date). applySyncRecord matches/replaces
  sleep by d (not id), with de-dupe. Verified: sleep now in sync entries (sleep:YYYY-MM-DD), queues for
  push, applies on pull without dupes, card updates.
- Audit: sleep was the ONLY synced array without an id (habits/tx/accts/exs/wlog/jr/jrTpl/goals/tasks all
  have .id; mood/hlog/closed/budg/etc are maps keyed correctly). No other id-less array found.
- Rendering confirmed OK: sleepOn(d)+renderSleepCard read today's record correctly; reRenderCurrent updates
  it after a pull.
- suite1 51/52 (known timing artifact — mood sheet re-verified working), suite2 25/25; zero errors.
- HONEST: live cross-device round-trip still needs on-device confirmation (Firebase).

---
# V1.43.0 — full sync coverage audit + goals-init fix
- Audited EVERY state.* type: seeded one record each, ran syncRecordEntries (push) AND applied all back
  onto a wiped state (pull round-trip).
- RESULT: all 24 data types sync AND round-trip: habits, tasks, jr, jrTpl, jrDrafts, tx, accts, exs(exercise),
  wlog(workout), sleep, goals, mood, moodNotes, hlog, closed, budg, budgets, cats, fxRates, incCats, set,
  vault, vaultCats, trash. Correctly NOT synced: stack (dead feature), timers (transient/device-local).
- REAL BUG FOUND + FIXED: state.goals was never initialized in normState -> pulling a 'goal' record onto a
  fresh device crashed applySyncRecord (arrSet on undefined). Added s.goals=[] init + made arrSet guard
  against non-array targets (one bad record can't break the whole pull).
- Verified: round-trip drops NOTHING; suite1 51/52 (known timing), suite2 25/25; zero errors.
- HONEST: live cross-device Firebase round-trip still needs on-device confirmation.

---
# V1.44.0 — perf: skip redundant heavy-persist + habit rem crash fixes
- Profiled heavy dataset (12 habits/400d,200 tasks,250 jr,600 tx; 422KB state). Heavy persist was ~76ms
  (stateJson+nat.saveState+pushAlarms+queueChangedSyncRecords) and runs after every logging action.
- FIX (perf): _persistHeavy now fingerprints the serialized state (ignoring mtime) and SKIPS the native
  save + alarm recompute + sync hashing when nothing meaningful changed. No-op persist 76ms -> ~3ms (23x).
  Real changes still fully save (verified localStorage: change->saved, 5 no-ops->no loss, next change->saved).
- FIX (crash/robustness, found during profiling): habits without a `rem` object crashed renderToday
  (nextReminderStr + cardHTML read h.rem.times unguarded) -> frozen Today. normHabit now guarantees
  h.rem={times:[],...}; both read sites guarded. Also fixed earlier: goals init, isFroz guard.
- Verified: no-op persist ~3ms, data integrity intact; suite1 51/52 (known timing), suite2 25/25; zero errors.
- HONEST: measured on a fast machine/headless; real-device gain will vary. "General heaviness" may also
  involve WebView/scroll/animation factors I can't measure here — report back which screen still feels heavy.

---
# V1.45.0 — scroll performance (120Hz jank)
- Root cause of slow scrolling on high-refresh displays: the fixed bottom nav (.dock) used
  backdrop-filter:blur(12px) over scrolling content -> browser re-samples+re-blurs behind it EVERY
  scroll frame (kills the ~8ms/frame budget at 120Hz).
- FIX: removed backdrop-filter from .dock; made --dockBg opaque (#0a0806/#0a0a0a/#f4f4f6) — visually
  near-identical, zero per-frame blur cost. Added transform:translateZ(0) (own compositor layer).
- Added content-visibility:auto + contain-intrinsic-size to long-list cards (jrCard/taskCard/txRow/
  vaultCard) so off-screen items skip layout/paint while scrolling.
- Left backdrop-filter on modal scrims only (appear when a sheet is open, not during scroll).
- Verified: dock has 0 backdrop-filter, opaque bg, nav looks identical; suite1 51/52 (known timing),
  suite2 25/25; zero errors.
- HONEST: can't measure on-device fps here; backdrop-filter-over-scroll is the textbook cause of exactly
  this symptom, so this should help materially. If specific long lists still jank, report which.

---
# V1.46.0 — FIX: stuck on "syncing" forever
- Root cause: attachFirestoreSync's initial reconcile .catch only handled 'permission-denied' — ANY other
  failure (network/unavailable/timeout/failed-precondition) hit an empty catch, leaving syncState stuck on
  'syncing' with no error/retry. syncInitialHydration also never cleared.
- FIX: initial-reconcile catch now clears syncInitialHydration + sets error/cached + shows message for ALL
  non-permission errors. Added a 20s safety-net timeout that unsticks 'syncing' if the initial call hangs.
  Manual Sync buttons wrapped in syncWithTimeout() (20s Promise.race) so they can't spin forever either.
- Verified: non-permission error -> 'error'; hung sync -> timeout -> 'error' with message; suite1 51/52
  (known timing), suite2 25/25; zero errors.
- HONEST: the underlying cause of YOUR hang is likely Firestore Rules not published / network — this fix
  makes it fail visibly (error + retry) instead of hanging. Publish the Firestore Rules to enable real sync.

---
# V1.47.0 — sync timeout now DIAGNOSES the real cause (was generic "timed out")
- The v1.46 timeout showed a generic "Sync timed out" which hid WHY. Now on timeout (shortened 20s->12s),
  it fires a server probe (fbDoc.get source:server) and surfaces the actual Firestore error via
  prettySyncErr -> e.g. "permission denied — publish Firestore Rules" or "unavailable — check connection".
- Verified: hung reconcile + permission-denied probe -> shows rules message; + unavailable probe -> shows
  network message; suite1 51/52 (known timing), suite2 25/25; zero errors.
- LIKELY ROOT CAUSE for user's timeout: Firestore Rules not published (or Firestore DB not created / network).
  The new message will state which. Cure: Firebase Console -> Firestore -> create DB + publish the rules
  block + enable Email/Password auth.

---
# V1.48.0 — large first-sync resilience (was: "operation didn't finish")
- Diagnosis from user's message: probe succeeded (server reachable, rules OK, authed) but syncReconcile
  didn't finish in 12s -> a large first-time sync (many records incl. vault import) exceeded the timeout,
  and Promise.all of parallel batches gave no progress + no partial commit.
- FIX: pushRecordSync now commits SEQUENTIALLY in batches of 150, clearing pending per batch. Steady
  progress, shows "Syncing… X/Y", and a mid-sync failure keeps completed batches (retry pushes only the
  remainder). Verified: 320 recs -> 3 batches [150,150,20], remaining 0; batch-2 failure -> 170 remain (1st
  batch preserved).
- Timeout raised 12s->45s with an 8s "first sync can take a bit" hint; on real timeout still probes for the
  true cause.
- suite1 51/52 (known timing), suite2 25/25; zero errors.
- HONEST: real fix for the user is that the first big sync just needs to complete — this makes it
  progress-resumable so it will. Live confirmation on-device.

---
# V1.49.0 — surface real sync error on banner + persistence can't break init
- Banner said generic "Check Settings for details". Now syncMsg caches the last error (window._lastSyncErrMsg)
  and the Today banner shows the ACTUAL message (permission/unavailable/precondition/etc.) when signed in.
- Firebase init: enablePersistence().catch previously re-threw non-precondition errors, which could abort
  the whole init chain (auth never wires -> sync silently broken) in WebViews with blocked IndexedDB.
  Now swallows ALL persistence errors (persistence is optional; Firestore works online without it).
- Verified: banner shows real error when signed in + error; cleared on success; suite1 51/52 (known timing),
  suite2 25/25; zero errors.
- NEXT: user should read the specific message the banner now shows and report it — that pinpoints the cause.

---
# V1.50.0 — sync completes for large data (progress-aware timeout)
- User's real cause confirmed by message: data is large; the fixed 45s timeout killed the sync promise
  even while batches were still committing in the background.
- FIX: replaced fixed timeout with a PROGRESS-AWARE watchdog. Each committed batch (and each pull-apply)
  sets window._syncProgressAt; the watchdog only errors if NO progress for 30s (genuinely stalled). A large
  but steadily-progressing sync now runs to completion. Shows "Syncing… X/Y".
- Verified: 900-record slow sync (400ms/batch) COMPLETES with 0 remaining (previously would time out);
  batches still resumable + per-batch pending cleanup from v1.48. suite1 51/52 (known timing), suite2 25/25;
  zero errors.
- HONEST: still bounded by real network speed; if genuinely stalled (no progress 30s) it errors with the
  true cause + resumes on next Sync tap (already-synced items don't re-upload).

---
# V1.51.0 — FIX "can't connect": bundle Firestore SDK locally (was CDN-only)
- ROOT CAUSE of "not able to connect": firebase-app + firebase-auth were bundled LOCALLY, but the
  Firestore SDK was fetched at runtime from https://www.gstatic.com/firebasejs/... . If the WebView
  couldn't reach gstatic (offline/DNS/firewall/CDN block), Firestore never loaded -> no connection,
  regardless of login/rules. Rewriting sync logic would NOT have fixed this (it's an SDK-load issue).
- FIX: downloaded firebase-firestore-compat.js (349KB) and bundled it locally alongside app+auth.
  loadFirestoreSDK loads all 3 from local files (CDN only as fallback if a local file is missing).
  build-apk.sh asserts the Firestore asset is present. WEB_DIR rsync stages it into the APK automatically.
- Verified in-browser: SDK loads firebase+auth+firestore with 0 CDN fetches, 3 LOCAL loads; parses clean.
- DID NOT rewrite sync from scratch (deliberately): the sync logic was verified working; a blind rewrite of
  the data-bearing sync would risk data loss (prior incident) and couldn't be tested against real Firebase.
- suite1 51/52 (known timing), suite2 25/25; zero errors.

---
# V2.0.0 — SWITCH sync: Firestore -> Realtime Database (RTDB)
WHY: Firestore's gRPC/persistence transport was hanging/"can't connect" in the Android WebView. RTDB uses
a simpler WebSocket/REST transport that connects more reliably in WebViews.
CHANGES:
- Bundled firebase-database-compat.js LOCALLY (164KB); removed firebase-firestore-compat.js. loadFirestoreSDK
  loads app+auth+database from local files (CDN fallback). ensureFirebaseReady uses firebase.database()
  (no enablePersistence — RTDB doesn't need/have that WebView-breaking layer).
- Data model UNCHANGED (reused syncRecordEntries/applySyncRecord/shadow/guards/24-type coverage). Stored at
  /users/{uid}/records/{sanitizedKey}={key,data,updatedAtMs,deviceId}. Meta at /users/{uid}/meta.
- pushRecordSync: atomic multi-path ref.update() per 200-key batch (deleted -> null removes node),
  sequential + resumable + progress "Syncing… X/Y". applyRemoteRecords: reads the records tree (snap.val()).
  syncReconcile: once('value') pull -> apply -> push. attach/detach/restore-from-cloud all RTDB.
- Config: added REQUIRED databaseURL (https://habits-644e7-default-rtdb.firebaseio.com); cfgLooksValid now
  requires it. build-apk asserts the RTDB asset. Added database.rules.json (per-user auth rules).
- Removed all Firestore refs (fbFS/fbDoc/fbRecords) + legacy/compatibility path.
VERIFIED (mock RTDB): push writes sanitized keys + clears pending; fresh-device pull restores data;
  0 firestore refs; suite1 51/52 (known timing), suite2 25/25; zero errors.
HONEST: live RTDB round-trip untestable here. USER MUST: (1) enable Realtime Database in Firebase Console,
  (2) publish database.rules.json, (3) confirm the databaseURL matches your project's RTDB URL. Backup was
  taken per user before this switch.
