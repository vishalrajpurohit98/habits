# V31 — UI/UX changes & overlay bug fixes

## 1–2. Tasks Export / Recently deleted: "blur screen" that blocks every tap
**Root cause.** `#taskExportSheet` and `#trashSheet` were the only sheets nested inside `#app`. `#app` is
`position:relative; z-index:1`, which creates its own stacking context, so the sheets' `z-index:64` only
applied *inside* `#app`. The body-level `#scrim` (`z-index:62`, backdrop blur) therefore painted **over**
the open sheet: the user saw a dimmed, blurred screen and every tap hit the scrim (hit-test at the
sheet's centre returned `#scrim`). The dock and Ask AI also painted above the sheet.

**Fix.**
- Both sheets moved to `<body>` next to the other sheets (all their handlers are bound by id).
- `openSheet()` re-homes any sheet that isn't a direct child of `<body>` and bails out if the id is missing,
  so a future nested sheet can't reintroduce the bug.
- Export sheet now closes itself after a successful PDF/Excel hand-off (`taskExportDone()`); it stays open on
  a validation error ("Select a valid date range").

## 3. Ask AI → right side, same size as Add
- New `#fabStack` wrapper (bottom-right, flex column): Ask AI on top, Add below, both 54×54, radius 16.
- Where Add is hidden (every tab except Today/Money), Ask AI drops into the bottom slot automatically.
- Vault: Ask AI is lifted above the vault's own + button while the unlocked vault home is showing.
- Parity kept: Add stays hidden under the workout module and the milestone overlay
  (`#wkModule.on ~ #fabStack > #fab`, `#miles.on ~ …`); Ask AI still shows there.
- Also fixes a desktop (≥1000px) bug where the Ask AI pill fully covered the Add button, and centres the +
  (old asymmetric padding put it 2px off-centre). Label kept for screen readers (`aria-label`, `.srOnly`).

## 4. Add anything
Habit, Task, **Journal**, **Workout**, Mood, Sleep, Expense, **Income**.
- Workout opens the Workouts module (and the "New exercise" sheet if none exist yet).
- Income opens the transaction sheet pre-switched to Income (same "add an account first" rule as Expense).
- Habit now uses 🔁 (it shared ✅ with Task); matches the Recently deleted list.
- Vault items intentionally not included (PIN-locked, has its own add menu; still reachable from quick options).

## 5–7. Today at a glance
- Icon per metric via `ICON()` (follows the app's emoji/line mode): 🔁 Habits, ✅ Tasks, 😴 Sleep,
  🔥 Streak, 💸 Spent, ⏰ Overdue, 📅 Due today. Mood shows the logged mood's emoji as its icon and
  names it as the value (avoids a generic smiley beside "Sad"). New icon keys: `journal`, `income`, `alarm`.
- Per-cell borders and tile backgrounds removed.
- Width: Today gutter 18px → 12px on phones (<640px) and tighter card padding; cells ~80px → ~88px at 412px.

## 8. Quick options
Mood / Sleep / Workout / Stats / Vault now live in one card; tiles have no card chrome of their own
(AMOLED override updated so tiles don't reappear as black boxes).

## Files
`index.html` (markup, CSS block `#ui-refresh-v31`, JS), `script1.js` (mirror regenerated), `sw.js` (cache
`habits-v2-78-v41-uifixes`). `script2.js` unchanged.

## Verified (headless Chromium, 360 / 412 / 700 / 1280 px, Android UA)
Export and trash sheets on top at every width; chips, PDF download, auto-close and screen use afterwards
with real clicks; restore from trash; all 8 Add-anything options open the right sheet; FAB stack position
on all tabs, vault, workout module; light theme; all inline scripts parse; zero page errors.

## Noticed, not changed
`#onbOverlay`, `#draftsOverlay` and `#vaultAddMenu` are also inside `#app`, so the dock and floating
buttons paint above them. Same cause; moving them to `<body>` is the fix if wanted.
