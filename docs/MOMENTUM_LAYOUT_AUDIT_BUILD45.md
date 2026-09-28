# Momentum 1.5.1 · build 45 — card position, alignment and sequence audit

Method: for every tab and sub-tab (19 views) the actual on-screen block sequence was extracted with each block's
left/right edge and the gap to the previous block; checked for edge alignment, one spacing rhythm, and a logical order
(header → filters → summary → primary action → content → secondary tools).

## Spacing rhythm (now identical in every tab)
header → content 16px · block → block 12px · list item → list item 8px · before a section label 24px ·
label → first item 10px · section labels inset 4px from the card edge.

## Sequence fixes
| Tab | Before | After |
|---|---|---|
| Money | balance card, then the account chips that filter it | account chips first, then the balance card they control |
| Insights › Habits | habit performance only | habit performance + "Patterns detected" (it describes habits) |
| Insights › Wellness | fitness insight → habit patterns → fitness stats → trend → records → calendar → mood (no label, 0–6px gaps) | fitness insight → stats → trend → personal records → calendar → Mood (labelled) |
| Insights › Money | a single line of small text | "This month" card (spent, vs last month, top category) + "Open Money insights" |
| Settings | Account, App, Data, AI, Security, Other, About | Account, App, AI, Security, Data, Other, About |

## Alignment/spacing fixes
Empty spacer blocks after the Money / Insights / Settings headers removed; header-to-content gap 16px everywhere
(was 4–28px); Journal gaps unified (were 4–24px, "Select" sat 4px under "Ask about my day"); Money blocks unified
(were 0–18px); account/budget lists 8px apart with actions 12px below; section labels share one inset (were 0/2/4px)
and one label→content gap (were 4/7/8/10px).

## Also fixed
The emoji-stripping for generated insights never matched (escaped pattern); insights on Home, Insights and Money now
show the line icon only.
