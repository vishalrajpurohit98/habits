# Momentum v1.5.0 — premium refinement ("subtract, don't add")

## CSS cleanup (mandatory item)
Automated, verified pruning instead of new overrides:
- 807 declarations removed that were provably overridden later by the *same selector* in the same (or an unconditional) media context.
- 187 rules / 215 selectors removed whose classes or ids never occur anywhere in the markup or JavaScript (legacy redesign leftovers: taskStatCard, taskStatRow, expHero*, heroTop, qaBtn, moreCard, glass, badges, …).
- 93 rules removed that became empty.
- Verified lossless: computed styles of ~41,000 visible elements across 29 screens/sheets (dark mobile and light desktop) were identical before and after.
- Result: CSS 205 KB → 168 KB, 2,138 → 1,840 rules. The old v1.4 Home rules were deleted, not overridden.
- Canonical tokens added as aliases of the theme-aware ones: `--surface-1..3`, `--text-primary/secondary/muted`, `--border`, `--radius-sm/md/lg`, `--space-1..7`.

## Screens
- **Home:** daily briefing only — Greeting · Today (habits x / y, progress) · Next (up to 3 actions, overdue first) · At a glance (streak, money, mood as plain lines) · One insight · a single text row of spaces. The mood picker, quick-stat grid, Money/Wellness blocks and review card were removed from Home. They remain available in their modules; Daily review is in the spaces row.
- **Habits:** rows separated by hairlines instead of cards; small emoji; completion button stays the primary action. Habit detail stats are plain numbers; the freeze notice is neutral.
- **Tasks:** subtitle "N remaining · M overdue"; the four equal stat tiles are gone.
- **Journal:** statistics row hidden (export and drafts actions kept); "Ask about my day" is a text action.
- **Insights:** 3M range added (7D/30D/3M/1Y); trend drawn in the accent colour; insight text without a card.
- **Mood sheet:** nested cards removed.
- **Search:** also finds workouts and mood notes.
- **Settings:** AI and About groups added (AI preferences opens the AI configuration; About shows the version).

## Not changed
Data model, storage, sync, Firebase, auth, OCR, imports/exports, reminders, Android wrapper, navigation logic, animation system (18 keyframes, one 100–120 ms tab fade).
