# InnerOs — World-Class UI/UX Rebuild — Report

## What changed (UI)
- New InnerOs design system layer (html.osui, on by default; reversible via state.set.uiClassic).
  Calm/minimal aesthetic per brief (refs Linear/Things/Notion) — NOT gradient/glass heavy.
- Semantic color tokens (accent/success/warning/error/info + neutral surface scale), Inter type scale,
  controlled spacing (4-32) + radius (10-22) + SUBTLE elevation. Indigo (#6d8bff) accent, not amber gradient.
- Cards: controlled radius/border/subtle shadow (no giant rounding / heavy shadow).
- Integrated bottom nav (not heavy floating), indigo active state.
- Restrained Today glance (removed glow spam), clean fintech Money, reflective Journal (indigo timestamps),
  AI panel as core capability (not ad pill). Full light + dark palettes.
- Accessibility: focus-visible outlines, prefers-reduced-motion honored, semantic colors (not color-only status).

## Preserved functionality (verified working under new UI)
habit complete ✓ · task complete ✓ · money/balance ✓ · journal save ✓ · drafts ✓ · vault encrypt/decrypt ✓ ·
RTDB sync entries ✓ · navigation (all tabs) ✓ · appearance tuner ✓ · Android wrapper / GitHub Actions / keystore
UNTOUCHED ✓.

## Validation results (brief #24)
1 HTML: renders ✓  2 CSS: balanced braces ✓  3 JS: all blocks parse ✓  4 Nav: all items activate ✓
8 Dark mode ✓  9 Light mode ✓  13 Data functionality: habit/task/money/journal/vault/sync all pass ✓
Regression suites: suite1 51/52 (1 = known mood-sheet TEST-TIMING artifact, sheet verified opening),
suite2 25/25. Zero runtime errors across all screens.

## Approach note (honesty)
This rebuild is applied as a comprehensive CSS DESIGN-SYSTEM LAYER over the existing working markup/logic —
per the brief's own "build a design system first, apply consistently" + "do not break functionality" +
"do not inject CSS into JS". This delivers the cohesive premium identity while guaranteeing every feature
still works. Truly bespoke per-module MARKUP restructures (e.g. a from-scratch timeline DOM for Journal)
were NOT done, to avoid regressions to sync/vault/data — those remain a further, riskier phase if desired.

## Could not validate here (needs on-device)
Android APK build, live Firebase/RTDB round-trip, widgets, notifications, biometric — verified in-logic /
structurally only; require a physical device + the GitHub Actions build (which is preserved, unmodified).

# v5.1 — UI AUDIT: issues found via screenshots + fixed
Audited 16 screens incl ENTRY screens (onboarding 3 steps, PIN lock), all tabs, sheets, editors.

## Issues found + fixed
1. ONBOARDING (critical): bottom nav + FAB + Ask AI pill bled THROUGH the welcome overlay -> looked broken.
   Fix: html.onboarding class hides all app chrome while onboarding; refined onboarding typography/spacing.
2. LOCK SCREEN (critical/security): Ask AI pill + nav visible under the PIN lock (z-index 60 = same as pill).
   Fix: #lock z-index 100001 + html.locked hides chrome; chrome restores on unlock (verified).
3. LOCK KEYPAD: "0" left-aligned (bio button used display:none, collapsing the 3-col grid).
   Fix: visibility:hidden keeps the slot -> 0 centered, backspace right, fingerprint appears left when avail.
4. SLEEP SHEET (bug): Note field showed literal "undefined" when no note. Fix: sleepEd.note || ''.
5. JOURNAL EDITOR (UX): writing area buried under 7 controls (title/date/time/location/mood/template/toolbar).
   Fix: WRITING-FIRST reorder via flex order — Title -> toolbar -> LARGE writing area -> compact meta below.
   No IDs/handlers touched. (Day One / Bear style.)
Noted, not changed: task editor Save below fold (works, minor); Mood sheet already well-designed.

## Verified
JS ✓ CSS ✓ · 11/11 functions (habit/task/money/journal/sleep/mood/vault/sync/lock-unlock/drafts/nav) ·
suite1 51/52 (known timing), suite2 25/25 · zero errors · all fixes screenshot-confirmed.

# v5.2 — UI/UX improvements
## Fixed
- CRITICAL regression guard: entry-screen chrome-hiding classes (onboarding/locked) can NEVER get stuck.
  Cleared in applyTheme AND on every showTab navigation. Verified navRestoresChrome=true (nav always
  returns after onboarding/lock).
- Task editor: added a STICKY bottom action bar (Cancel + Add task pinned; form scrolls above). Sheet now
  caps at 90vh with internal scroll — Save always reachable (Things/Todoist pattern). Verified saveInView.
## Verified
JS ✓ CSS ✓ · 10/10 functions incl taskSave + navRestoresChrome · suite1 51/52 (known timing), suite2 25/25 ·
zero errors.

# v5.2.1 — FIX: palette/accent color now applies everywhere
- BUG: osui layer hardcoded --accent:#6d8bff and used --accent (not --amber) for FAB/nav/buttons/chips,
  so the Settings palette picker changed --amber but NOT the visible accent -> color didn't apply.
- FIX: osui --accent now = var(--amber) (+ --accentSoft=var(--amberSoft)); removed the hardcoded osui
  --amber and scoped the indigo DEFAULT to html.osui:not(any p-* palette). Palettes (p-lagoon/frost/sakura/
  violet/rose/gold/mono/ember/ocean/forest) now flow into --accent app-wide.
- Verified: default=indigo; sakura->FAB pink; violet->purple; frost->blue; lagoon->teal; nav+AskAI+FAB all
  recolor. suite1 51/52 (known timing), suite2 25/25; zero errors.
