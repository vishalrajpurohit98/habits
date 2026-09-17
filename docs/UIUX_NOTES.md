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
