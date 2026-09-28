# Momentum 1.5.1 · build 46 — seven feature phases

Each phase was implemented, tested, visually checked and bug-fixed before the next; all phase tests were re-run at the end.

| # | Feature | What it does | Bugs found and fixed during testing |
|---|---|---|---|
| 1 | Adaptive Home | Morning (05–11): "Top 3 today" leads (overdue → priority → time). Day: unchanged. Evening (17–04): "Evening wrap-up" leads with what is still open + "Start daily review". The leading card has a quiet accent. | evening started at 18:00 while the greeting switched at 17:00 — aligned |
| 2 | Milestone moments | Full-screen card in the habit's colour at 7/30/100/365-day streaks; once per streak; Share (image on Android); one 150 ms fade. | the old confetti celebration fired at the same time — merged into one system, confetti removed |
| 3 | Charts, recap, pixels | Every trend chart: light gridlines, tap/hover a point for date + value. Sundays: "Your week" recap on Home (dismissible). Insights › Wellness: mood "Year in pixels" (12 × 31). | tooltip clipped by the card; pixel grid was a screen tall — compact 12-row layout |
| 4 | Active workout session | Elapsed clock, pause/resume, quick set logging, 60/90/120 s rest countdown with haptic, finish summary; survives minimise and reload; saves into the normal workout log. | hidden elements that set their own display stayed visible — global `[hidden]` rule |
| 5 | Text size | New default "System" follows the phone font size (Android `fontScale`, WebView text zoom pinned to 100%); at ≥120% a larger-text layout reflows dense grids. | Tasks header and Money tabs overflowed at 1.4× — they reflow |
| 6 | Native Android | Reminder notifications get "Done" (marks habit/task complete without opening the app, never un-completes) and "Snooze 1h". Home-screen widgets restyled to the app palette. | — (compiled and verified in the APK; not tested on a device) |
| 7 | Two-pane (≥1000 px) | Habit detail, task editor and journal reader dock on the right; the list stays usable and the selection is highlighted. | the selected-habit highlight read a non-existent variable — fixed |

Also: the habit detail meta line now reads "Reminder 6:30 PM" instead of an alarm-clock emoji.
