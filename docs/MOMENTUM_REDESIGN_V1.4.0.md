# Momentum UI/UX redesign — v1.4.0 (presentation layer only)

## Design system (`<style id="Momentum-design-system">`, loaded last)
- **Colors (dark):** bg #000 · surfaces #0B0B0D / #111113 / #171719 · text #F5F5F5 / #A1A1AA / #71717A · lines rgba(255,255,255,.06/.08). One accent (the user's palette; default amber) for active nav, primary CTA, progress and selection. Semantic colors only in charts and money in/out.
- **Type:** system stack. Page title 30px/700 · section label 12px/600 uppercase · card heading 15–17px/600 · body 15px · secondary 13–14px · micro 11–12px.
- **Spacing:** 4·8·12·16·20·24·32·40·48 (`--s1…--s9`). **Radius:** 8·12·16·20 (`--r-sm…--r-xl`).
- **Depth:** surface contrast + 1px hairlines; no shadows, glows, gradients or blur.
- **Icons:** one line-icon set (the app's icon system now renders SVG instead of emoji).
- **Components:** primary / text / icon buttons, inputs, chips, segmented control, list row, section label, stat, progress bar, bottom sheet, snackbar, empty state.

## Navigation
Mobile bottom bar: **Home · Habits · + · Money · AI**. The + opens "What do you want to add?" (Habit, Task, Expense, Journal, Mood, Workout, Sleep).
Tasks, Journal, Insights, Settings, Vault, Mood, Sleep and Workout are reached from Home (Spaces / Wellness). Desktop: sidebar with Create + primary + "Spaces".

## Screens
Home (new overview renderer) · Habits (new page; same list and handlers) · Tasks (checklist rows) · Money · Expense sheet (amount focused) · Journal · Insights (was Stats) · AI · Settings (grouped list rows) · Global search (new sheet) · Workout (weekly summary) · Mood sheet · all forms and sheets via the component styles.

## Removed clutter (hidden or restyled, not deleted)
Floating "Ask AI" pill and floating +; 8-tile "Today at a glance"; weekly-pulse card; icon tile row; emoji in nav, headers, buttons and settings rows; red-tinted task cards and coloured priority pills; gradient buttons; card-heavy settings tiles; decorative emoji on empty states.

## Preserved
All data, storage keys, sync, Firebase, reminders, OCR, import/export and handlers are untouched. The mood scale keeps its 7 states so history and stats stay valid.

## Performance
No new animations (18 keyframes before and after). Tab switch is still one 100–120 ms fade. No backdrop blur on Android. Measured tab switches equal to or faster than v1.3.10.
