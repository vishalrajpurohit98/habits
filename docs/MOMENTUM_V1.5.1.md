# Momentum v1.5.1 — finalization

## Branding
Every user-facing legacy name was replaced with **Momentum**: search title/label, appearance text, desktop sidebar,
About fallback, vault export file name, Android notification title, print job name, WebView error page,
home-screen widget labels and the `brand_word.png` wordmark asset. Cache-busting query strings, the service-worker
cache name, CSS ids, code comments and docs were renamed too.
Intentionally retained (technical): the vault key-derivation salt `inneros-vault-v1` — changing it would make
existing encrypted vaults undecryptable.

## Version
versionName 1.5.1 / versionCode 36 in `AndroidManifest.xml` and `version.properties` (CI reads the latter).
About shows the native `versionName` on Android and `APP_VERSION` (1.5.1) on the web.

## Fixes
- Android back now closes the full-screen Workout module (it previously fell through to the exit flow).
- Android back in a Settings section returns to the Settings list instead of jumping to Home.
- Android back closes pro dialogs and the drafts overlay.
- Receipt scan with an unreadable/empty result no longer claims "details filled".
- About shows the real version and no longer shows a chevron on a non-interactive row.
- Home empty state: guidance and "Create a habit" instead of "0 / 0".
- Empty states no longer sit inside a card.
- Workout summary spacing; exercise progress uses the accent.
- Accessible names for the two Workout header icon buttons and 35 inputs that only had a visual label.
- Remaining decorative emoji removed from the Mood title and journal editor labels.
- **Settings sections (build 37):** tapping a Settings row appeared to do nothing — the section opened *below* the
  still-visible list because a v1.4 rule `.setCardGrid{display:block!important}` overrode the inline style that hides
  the list. The `!important` was removed; all 8 sections now open at the top and Back returns to the list. The section title no longer repeats as a label, and "Notifications" is used consistently.
- **Cards restored (build 38):** Home sections, habit rows, tasks (overdue marked by a coral edge), task summary,
  journal entries, Journal "Your journey" stats (visible again), Insights stats and insight, habit-detail stats,
  mood sheet sections, Money hero, Financial Tools, empty states and AI insight cards use the surface card
  (`--card`, 1px `--line`, 16px radius) again. No shadows or gradients were reintroduced.
- **Polish (build 39):**
  - One type scale: page title 28/700 (32 on desktop) · subtitle 14 · section label 12/600 caps with an accent icon ·
    card title 16/600 · body 15 · secondary 13 · meta 12.
  - One button system (`.btnP` primary, `.btnS` secondary, 40px, 12px radius, icon + label). Text actions converted to
    buttons: Home "View insights" / "Create a habit" / "Sign in", Tasks "Export" / "+ Task", Journal "Ask about my day" /
    "Select", Money "Select", expense "Date, payee, note, tags", receipt "Upload & scan" / "Camera & scan", habit
    "More options" / "Add reminder time", Mood "More insights", Achievements "View all", Settings back, AI "Clear".
  - Icons: Home section headers, Next rows (task/habit, overdue in coral), At-a-glance rows, a Spaces grid (8 tiles),
    empty states (icon in a soft accent circle). New line icons: clock, download, cloud, calendar, zap, chevL, grid, camera.
- **Premium visual layer (build 41):** richer dark surfaces (#121215 / #1A1A1E / #222227), 20px cards with a 1px top
  highlight (dark) or soft two-layer elevation (light), iOS-style 34px large titles, floating pill tab bar with a
  raised Create button, Apple-Fitness-style activity ring on Home, tinted icon chips on Home rows, colourful app-icon
  squircles in Spaces, Settings and the Create sheet, fintech-style Money hero with a soft accent glow, raised
  selected segments, a warm accent glow behind page headers. All effects are static; no blur; contrast still WCAG AA.
- **Build 42:**
  - Journal card: the favourite star floated mid-row (two auto-margins split the space). The star now sits with the
    AI action on the right, and both use line icons instead of emoji. An automated alignment scan of every screen
    (mobile + desktop) found no other floating or vertically misaligned icons.
  - Contrast raised app-wide. Dark: secondary text 7.3→9.5:1, labels 5.5→7.2:1, hairlines 7%→13%.
    Light: secondary 7.2→9.7:1, labels 6.6→8.2:1, hairlines 8%→15%.
  - Appearance › Fine-tune now drives every card: border width, border contrast, corner radius, card depth and card
    tint are shared tokens (`--bw`, `--line`, `--r-*`, `--cardShadow`, `--cardBg`). Before: 19 of 60 cards followed
    border width; now 60 of 60, and 16 of 16 card types follow corner radius.
- **Build 43:** Home shows Spaces first. Habit detail history rebuilt as a contribution grid: fixed square cells
  (the old grid forced 10px rows under square cells, so cells overlapped into uneven blocks), weekday labels,
  a Less→More legend in the habit's colour, visible missed days, faint unscheduled days and a ring on today, inside
  its own "Last 20 weeks" card. Each cell has a date + state tooltip.
- **Build 44:** full consistency audit — see `docs/MOMENTUM_CONSISTENCY_AUDIT_BUILD44.md`.
- **Build 45:** card position / alignment / sequence audit — see `docs/MOMENTUM_LAYOUT_AUDIT_BUILD45.md`.
- **Build 46:** seven feature phases — see `docs/MOMENTUM_FEATURES_BUILD46.md`.
- **Build 47:**
  - Create (+) button: the bottom bar was a scroll container (`overflow: hidden auto`) and clipped the raised
    circle's top. The bar no longer clips, and the circle is its own round element (not a styled `<svg>`).
  - Journal photos, free and on-device: add from gallery or camera (up to 8 per entry); each photo is compressed to
    1600 px (plus a 360 px thumbnail) and stored in IndexedDB — the entry keeps only photo ids. Shown in the editor,
    as a banner on timeline cards, in the reader, and in a full-screen viewer. Native originals are deleted after
    import; unsaved photos are cleaned up after a day. Fixed during testing: the loader dropped the new `photos`
    field on every reload; Android back closed the reader instead of the photo viewer; photo-only entries said
    "(No content)".
- **Build 48 — photos travel with backups:** "Journal backup", "Backup (JSON)" and "Back up to Google Drive" now embed
  every journal photo (full size) inside the .json file; "Import journal" and "Import backup" write them back into
  the device photo store and rebuild thumbnails. Photo-only entries are no longer skipped on journal import.
  Re-importing the same file does not duplicate entries. The daily automatic backup stays photo-free to keep it small.
- **Build 49 — journal photos on Google Drive + Gradle build:**
  - Android build moved to Gradle (needed for Google's authorization library); `build-apk.sh` keeps the same interface,
    so the GitHub workflow is unchanged. The old SDK-tools build is kept as `build-apk-legacy.sh`. Each build prints the
    signing certificate SHA-1 for the Google Cloud setup.
  - Settings › Cloud sync › "Journal photos on Google Drive": connect once; photos upload after saving an entry and
    missing photos download on app start/resume, via the `drive.appdata` scope (hidden app folder in the user's Drive).
    Setup: `docs/GOOGLE_SETUP.md`.
- **Build 50 — sync account email:**
  - Settings › Cloud sync › "Change sign-in email": re-confirms the password, Firebase emails a verification link to
    the new address; after confirming, sign in with the new email and the same password. Same account, so every
    synced record stays in place on every phone.
  - Fixed: signing in to a different, empty sync account uploaded only recent changes (the device's sync state was not
    tied to an account). The device now remembers which account it synced with and uploads everything to a new empty
    account. Switching to an account that already has data behaves as before.
- **Build 51:** buttons the app hides (web Drive "Connect", "Remove PIN" without a PIN, notification buttons on web, expanded "More" buttons) were forced visible by an `!important` display rule in the button system; fixed.
- **Build 52 — one Google account for everything:**
  - Settings › Cloud sync › **Continue with Google** (signed out) or **Link Google** (signed in, keeps the same
    account and data). Android uses Credential Manager natively; browsers use Firebase's Google pop-up.
  - Journal photo sync now also works in the **web browser** (hosted on https) through Google Identity Services and
    the Drive REST API — same hidden folder, so phone and web share photos. Drive connects automatically with the
    Google account used to sign in.
  - Fixed: a stray "\n" was visible in the Cloud sync panel (builds 50–51).
  - Setup: `docs/GOOGLE_SETUP.md`.
- **Build 53:** Google Web client ID set (`GOOGLE_WEB_CLIENT_ID`), so Continue with Google and web photo sync are enabled for every device.
- **privacy.html:** public privacy policy (for the Google OAuth consent screen), served at `/habits/privacy.html`.
- **Build 54 — sign-in required, one account = one private space:**
  - Fresh installs open on a sign-in screen (Continue with Google, or email + password with Create account and
    Forgot password). The app opens only after sign-in and stays signed in, offline too.
  - Each account has its own data on the device as well as in the cloud: signing out keeps it, another account starts
    with its own data, and switching back restores yours. Data created before this update belongs to the first account
    that signs in on that device. The Android copy used by widgets/notifications is tagged with its owner and is never
    imported into another account.
  - Google sign-in turns journal-photo sync on automatically for that Google account (no separate Connect); email
    accounts can tap Link Google. "Change sign-in email" is shown only for password accounts.
  - Fixed: "Switch / add profile" called a function that did not exist (row removed; profile menu now signs out safely).
- **Build 55 — backups, downloads and Vault:**
  - Settings › Data in three groups: **Back up** (full, Drive, journal-only, automatic), **Restore** (full restore
    *replaces*, journal import *adds*, recently deleted), **Download for Excel / PDF**.
  - **Everything (Excel)**: Habits, Log (with daily completion), Tasks, Money, Accounts, Budgets, Mood, Sleep, Workouts,
    Journal, Summary. **Money workbook** now reachable (month picker). **Monthly PDF** for any month.
  - All files named `momentum-…`. Journal import also restores photos from a full backup.
  - Vault: number pad like the app lock, and **fingerprint unlock** (PIN sealed in the Android Keystore, released only
    after a fingerprint check; resets automatically if fingerprints change).
  - Fixed: changing the app PIN made the Vault undecryptable (it is now re-encrypted with the new PIN); removing the
    PIN while the Vault has data is blocked. App lock shows a fingerprint icon and "Momentum is locked".
- **Build 56 — journal photos, AI page, sheet fix:**
  - Fixed: "Recently deleted" (Settings › Data) and Tasks › Export could not be tapped — both sheets sat inside the app
    container's stacking layer, below the dim backdrop. Every sheet now lives at the top level.
  - Fixed: the photo viewer's close button was never pinned to the corner (`.iconBtn{position:static!important}`).
  - Journal › **Photos** tab: every journal photo, newest first, grouped by month; tap a photo to open its entry.
  - Timeline cards show a collage (1 wide · 2 side by side · 3 one large + two · 4+ grid with "+N"); the reader shows a
    large first photo and a grid; the viewer has previous/next, swipe and a "2 / 6" counter.
  - AI page: setup card when no key is set, "For you" as its own card, starter tiles with icons (hidden once a
    conversation starts), chat bubbles, and the message box fixed above the tab bar with one scrolling row of quick actions.
- **Build 57 — photo quality and layouts, widgets, Journal tabs:**
  - Photo quality (Settings › Appearance): **High** (default; full 2560 px at 90%) or **Original** (JPEGs kept byte for
    byte). Screen-sized previews: 1200 px for large tiles, 480 px for small ones (was a single 360 px thumbnail).
    Photos added earlier get new previews built once per device. Transparent images get a white background.
  - Journal photo layout (Settings › Appearance): **Collage, Cover, Filmstrip, Compact** — applies to timeline cards
    and to the entry view.
  - Journal: **Calendar and Memories merged** (Memories below the calendar); tabs are Timeline, Calendar, Write, Photos, AI.
  - Add habit: "Journal" removed from the suggested habits.
  - AI page: read-aloud, microphone and send are round 44 px buttons matching the input.
  - Android: Quick log widget uses line icons instead of emoji; its Journal button opens a **quick journal note**
    dialog that saves without opening the app.
- **Build 58 — modules and the daily sleep check-in:**
  - Settings › **Modules**: turn Money, Tasks and Workouts on or off. A turned-off module disappears from the tab bar
    (Journal takes Money's place on phones), Home, Create, Insights, Settings and the AI shortcuts, and can't be
    opened; its data is kept and returns when switched back on. Habits, Journal, Mood, Sleep and Vault are always on.
  - **Daily sleep check-in**: the first time the app is opened each day (from 4 am, after sign-in and the PIN lock)
    a full-screen check-in asks for bedtime and wake-up before anything else; times are pre-filled from the previous
    night. It replaces the sleep card on the Habits page.
