# Momentum 1.5.1 · build 40 — UI/UX audit (check → fix → recheck)

Method: automated audit of 26 screens/sheets × 2 themes (dark, light) at 390×844 with an Android user agent,
plus a visual design review of every screen. Checks: WCAG AA text contrast, minimum text size, touch-target
size, clipped text. Re-run after every fix round.

| Check | Before (distinct issues) | After | What remains (intentional) |
|---|---:|---:|---|
| Text contrast (WCAG AA 4.5:1, 3:1 large) | 76 | 0 real | emoji glyphs in mood cells; locked achievement badges (inactive UI, exempt); 9px counts inside dense calendar cells |
| Text smaller than 12px | 34 | 0 real | same calendar counts, locked-badge labels, lock emoji |
| Touch targets < 40px | 35 | 0 real | toggles and task checkboxes keep their visual size but now have a 44px invisible hit area; settings fine-tune segments are 36px (dense control) |
| Clipped text | 0 | 0 | — |

## Fixes (all at token / component level)
- Contrast tokens: dark `--mut2` #71717A → #8B8B94. Light `--mut` #6B6353 → #5E5647, `--mut2` #928A7A → #655C4E,
  `--coral` → #A9382F, `--amberDeep` → #8A5100, semantic greens/blues/orange darkened for text use.
  Light theme text on the amber accent is now dark (6.4:1) instead of white (2.7:1).
- Minimum UI text 12px: tab labels, mood labels, account labels, sleep labels, transaction day headers, journal
  calendar/day labels and tags, settings captions/values, AI panel captions, footer.
- Touch targets ≥ 40px: chips, filters, quick-start chips, segmented controls, account chips, select/sync/back/clear
  buttons, task/journal overflow buttons; 44px hit areas for toggles and task checkboxes.
- Screen-level design fixes: new habit starts with an empty name (placeholder "e.g. Read 10 pages") and saving an
  empty name explains why; reminder rows use the clock icon instead of an emoji; overdue task cards no longer say
  "Overdue" twice; Insights progress stats sit in one balanced row of three; Insights section headings match the
  rest of the app.
