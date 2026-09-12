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
