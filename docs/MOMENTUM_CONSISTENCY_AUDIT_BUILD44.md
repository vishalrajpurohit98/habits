# Momentum 1.5.1 · build 44 — full UI consistency audit (check → fix → recheck)

Method: automated role audit across 34 screens/sheets/settings sections × dark + light themes (demo data), plus an
alignment scan (mobile + desktop), the fine-tune coverage test, the accessibility audit and a visual sweep of every
screen. Each role must have exactly one look; remaining variants must be deliberate.

| Role | Variants before | After | Remaining variants (deliberate) |
|---|---:|---:|---|
| Chips / filters | 7 | 1 | — (40px, pill, 14px/500 everywhere) |
| Section labels | 2 | 1 | — |
| Sheet titles | 1 | 1 | — |
| List rows | 3 | 1 | — (56px) |
| Secondary buttons | 4 | 2 | 48px "Add subtask" matches its input |
| Primary buttons | 3 | 2 | compact 40px "+ Task" in the Tasks header, paired with "Export" |
| Text inputs | 7 | 4 | large amount/value fields; on-page search fields sit one surface lower |
| Icon buttons | 4 | 3 | 44px page-header actions, 40px in-card actions, round avatar |
| Page titles | 3 | 2 | 20px titles on back-button screens (Workouts, Settings sections) |
| Button icons | 2 | 2 | 16px on secondary, 18px on primary |
| Cards | 10 | 4 | containers whose inner sections carry padding; segmented control |
| Emoji used as UI icons | 14 locations + 7 toasts | 0 | the logged-mood emoji in "Logged: 😄 Happy" is mood data |

## Fixes
- Chips, section labels, list rows, input heights/text size, button text size, card radius (20px) and padding (16px)
  unified in one "role canon" block.
- Emoji replaced by line icons: save ✓ buttons, 🎤 voice buttons, ☑ checklist, ✨ AI actions/buttons/headers, 📄📝
  export, ⭐ favourites, 🔙 looking back, 💡 prompt, ✕ dismiss, ➕ new template, ❄️ freeze, task-checkbox ✓, built-in
  journal template icons, generated insight prefixes (📈📚…). Toasts no longer carry emoji.
- AI page uses the same title pattern as every page ("AI" + subtitle); journal AI stats and net worth use neutral
  numbers (net worth is red only when negative); "For you" label matches other section labels; sleep duration is
  neutral; budget rows are cards like every other list.
- Journal favourite star grouped with the AI action (alignment scan: 0 floating/misaligned icons).
