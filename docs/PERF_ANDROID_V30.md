# V1.3.9 — Android animation & WebView performance

## Goal
Remove the real causes of janky transitions, sheets, FAB and scrolling in the Android WebView,
without changing features, architecture or (materially) the visual design.

## Root causes (measured, not assumed)
1. `#aiFab::before` — `filter: blur(9px)` + infinite `aiFabPulse`. The only always-running animation;
   it kept the compositor producing frames on every screen except AI, and because it sits *under* the
   scrim, the scrim's full-screen `backdrop-filter` had to be recomputed every frame whenever a sheet was open.
2. `MainActivity` put the WebView on `LAYER_TYPE_HARDWARE` — every changing web frame was rendered into an
   extra offscreen texture and composited again (window is already hardware-accelerated by the manifest).
3. Pull-to-refresh checked `window.scrollY`, but the app scrolls inside `#app`, so it was always "at top":
   on touch devices, every downward finger movement mid-list restyled `#ptrInd` per touchmove (restarting a
   CSS transition each event) and could trigger a sync / "Sign in to sync" toast on release.
4. Every data change ran `JSON.stringify(state)` + synchronous `localStorage.setItem` inside the tap handler,
   before the UI could paint. The later "heavy" save stored full-JSON copies of every record as sync "hashes"
   (shadow ≈ dataset size) and re-wrote it on every save.
5. Tab renders called `toLocaleDateString` per row (new Intl formatter each call); Journal forced two layouts.

## Changes
| File | Change |
|---|---|
| MainActivity.java | Removed `setLayerType(HARDWARE)` and deprecated `setRenderPriority`; `onPause` flushes pending JS saves |
| index.html `<head>` | Early `html.android` / `html.wv` classes |
| index.html CSS | Android: backdrop blur → slightly deeper solid tint (scrim, achievement modal, milestone, journal summary, pro modal); static Ask-AI glow. All platforms: pulse paused while an overlay is open. Fixed unitless `ui-motion-reduced` duration |
| index.html `persist()` | Local save runs one frame after the change (coalesced); synchronous flush on hide / pagehide / onPause / exit / `persist({now:true})`; heavy save runs in idle time |
| index.html sync | Shadow stores a compact digest; legacy full-JSON entries migrate in place without re-queuing or changing timestamps |
| index.html pull-to-refresh | Checks the real scroller, ignores overlays, rAF-batched writes only on change |
| index.html dates | Cached `Intl.DateTimeFormat` in `niceDate` / `jrNiceDay` (identical output) |
| index.html `showTab`/`jrGo` | One scroll reset per tab switch instead of two forced layouts |
| sw.js | Cache name bumped so PWA users receive the new `index.html` |
| script1.js / script2.js | Mirrors regenerated |

## Round 2 (animations, shadows, DOM)
| Area | Change |
|---|---|
| Toggles (`.tog`, `.jrTog`) | Thumb moved with `left` (layout); now `transform: translateX()` with identical geometry |
| `transition: all` (11 rules) | Explicit `transform, background-color, border-color, color, opacity` (onboarding dots keep width, intentionally) |
| Voice "listening" pulse | Animated `box-shadow` keyframes (`uaiPulse`, `jrMicPulse`) → `::after` ring animated with transform + opacity |
| Android shadows | Single-layer, smaller-radius `--shadowUp` / light `--shadow`; lighter Ask-AI shadow; press transitions no longer include `box-shadow` (`:where()` keeps specificity low) |
| `patchHTML()` | Today habit list, Tasks list, Money transactions: unchanged children are kept, only changed ones are rebuilt. Verified the resulting DOM is identical to the original build across 13 interaction steps |
| `setHTML()` | Small Today/Tasks boxes skip the rebuild when markup is unchanged and unmutated |
| Redundant refresh | The 60 ms post-`persist()` Today refresh is skipped when Today was already re-rendered for that change |
| `pulseEl()` | Restarts animations on the next frame instead of forcing layout via `offsetWidth`; checkbox pop now targets the node that survives the re-render (it previously animated a node that was immediately destroyed) |
| Money day headers | Cached `Intl.DateTimeFormat` |

## Verification
Headless Chromium, 412×915 @2.625x, Android UA, 4× CPU throttle, seeded large dataset; median of 3 runs.
All inline scripts parse. No page errors. Smoke flows (task add/complete, habit/expense/journal sheets,
journal views, Stats/AI/More/Settings, Android back) identical to the original build; data survives reload.
Sync migration verified against a control (original→original): 0 extra pending records, timestamps unchanged,
shadow 1.5 MB → 0.24 MB.

## Round 3 — Simple motion (v1.3.10)
Philosophy: tap → immediate response → one short transition → ready.

| Area | Before | After |
|---|---|---|
| Tab/page entrance | `fadeUp` 320ms, translateY(8px), plus `opacity:1!important` that cancelled the fade, so only the slide ran | ONE animation on the page: `simpleTabEnter` 120ms (opacity + 3px); Android `simpleTabFade` 100ms (opacity only) |
| Children replaying on every tab show | every completed checkbox `chkPop` (11 at once on Today), hero ring `ringIn` spring, Stats bars `barUp` spring + 0.9s line draw, `.calDay` / `.exDetail` / `.srchWrap` fade-ups | removed; content is shown immediately |
| Workout module | `fadeUp` 280ms | same single 120ms/100ms transition as tabs |
| Bottom navigation | 180ms highlight | 120ms colour fade, no movement |
| FAB | spring 180ms, scale .93 | 120ms ease-out, scale .96 |
| Bottom sheets | custom curves 260–320ms | translateY 220ms ease-out (open) / 180ms ease-in (close); scrim 180ms |
| Modals / dialogs | milestone `popIn` scale .5 spring; drafts panel scale spring; journal summary 12px + scale; pro dialog (broken var) | `simpleModalIn` 150ms opacity + 4px, no scale, no bounce |
| Snackbar | translateY(130%) 250ms | opacity + 6px, 150ms |
| Dropdown (task menu) | instant | 110ms fade + 2px |
| Tap feedback | spring pops to 1.18–1.3× | 150–180ms ease-out to 1.06–1.08×; classes removed on `animationend` so they never replay |
| Money hero number | rAF count-up loop (560ms) | value set immediately |
| showTab | scroll reset at the end forced a layout of the new page | scroll reset first (clean tree), no forced layout of the new page |
| UI config sliders | whole-document restyle + noise-tile regeneration on every input event | coalesced to one apply per frame; noise tile regenerated only when type/scale change |
