# HabitTracker-web base (fresh) — drafts sheet "blur screen" FIX
- Root cause: drafts/trash list sheet used --bg2 (#0C0B09 ≈ page color) so it blended into the dimmed page,
  and short lists made it a tiny bottom strip -> read as "just a blur screen".
- Fix: #jrDraftsSheet/#trashSheet -> distinct --card bg + border + strong shadow + min-height 42vh
  (max 82vh, scrollable); carded draft rows; scrim blur 3px->2px so the panel clearly sits above.
- Verified: drafts list shows both rows + Delete, tapping opens editor w/ title+content; suites pass; 0 errors.

# drafts sheet — brighter panel + lighter dim (v2 of fix)
- Screenshot showed whole screen too dark: scrim was rgba(0,0,0,.8) (80% black) + --card panel (#17150F) too
  dark to stand out. Fixed: drafts/trash sheet bg -> #211d14 (brighter), rows -> #2b2619 w/ .12 white border,
  header/label ink white; scrim.on dim reduced .8 -> .55. Sheet now clearly separates from dimmed page.
- Verified: both draft rows visible+carded+delete, tappable; suites pass; 0 errors.

# DRAFTS REBUILT FROM SCRATCH (v4.2.0)
- CSS patching the shared sheet/scrim never fixed the "blur screen" for the user, so rebuilt drafts as a
  fully independent component:
  * New #draftsOverlay DOM (full-screen, own backdrop rgba .5, own slide-up panel #1b1e27) — does NOT use
    the shared .sheet/#scrim at all.
  * Own module: renderJrDraftsBtn, renderDraftsList, openDraftsOverlay/closeDraftsOverlay, resumeDraft,
    delegated click handler (backdrop-close, open, delete). Removed all old jrDraftsSheet/renderJrDrafts.
  * openJr extended with draftObj param -> resume loads draft natively (title/content/mood/tags/date/time/
    location) + sets _draftId so re-save updates the draft.
  * Own CSS: bright panel, carded rows (#262a35), grab handle, close ✕, red trash delete, spring slide-in.
- Verified: overlay opens (2 rows), resume opens editor w/ title+content+draftId, delete removes row;
  suite1 51/52 (known timing), suite2 25/25; zero errors.

# drafts -> centered popup (v4.2.1)
- Feedback: drafts bottom-sheet got cut off on wide/desktop screens. Converted #draftsOverlay to a CENTERED
  modal popup: align-items center, panel is a floating rounded card (max 440px / 78vh), scale-in animation
  (removed slide-up + grab handle). Verified fully visible + both rows shown at mobile (390) AND desktop
  (868) widths. suite1 51/52 (known timing), suite2 25/25; zero errors.

# CI FIX v2 — remove failing setup-android action
- setup-android@v3 kept failing inside its own dist (cmdline-tools/16.0 sdkmanager exit 1) even with pins.
- Fix: removed the action entirely. New step uses the runner's PRE-INSTALLED Android SDK ($ANDROID_SDK_ROOT),
  finds sdkmanager under cmdline-tools/*/bin, accepts licenses, installs platform-tools + android-34 +
  build-tools 35.0.0, exports ANDROID_HOME + PATH. Build step already consumes ANDROID_HOME/BUILD_TOOLS_VER.
- YAML validated. App unchanged (still v4.2.1 drafts popup).
