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
- **Build 59 — duplicates removed:**
  - Removed: Home sync bar (shown only when sync fails), Home avatar switcher and saved-profiles list, Reconfigure
    (Firebase settings), Strict sleep (the daily check-in covers it), Quick-add notification (the Quick log widget
    covers it), Insights › Money tab, Journal-only backup, automatic daily file backup, "Ask about my day" and the
    Write-tab copy of "Talk or write about my day", Create › Sleep, Habits page search.
  - Merged: one Money export (any date range, Excel with Transactions/Summary/Accounts, or PDF); Full backup has
    Save and Share (Drive); Summarize/Reflect on my day moved to Journal › AI; journal questions answered in the main
    AI chat with the relevant entries attached; Smart nudges + Adaptive timing = "Smart journal reminder".
  - "Offline & private" reworded to "Private by design".
  - Fixed: Android back now checks the sign-in and sleep screens before anything else.
- **Build 60 — Import from Day One:**
  - Settings › Data › Restore › **Import from Day One**: reads the ZIP from Day One › Export › JSON (also a bare .json).
    The ZIP is read piece by piece (File.slice + DecompressionStream), so multi-GB exports work; stored, deflated and
    ZIP64 archives supported.
  - Maps creation date in the entry's own time zone, a leading `# heading` as the title, Markdown (bold, italic,
    strike, links, headings, lists, checklists, quotes, Day One backslash escapes), photos in text order and in the
    chosen photo quality, tags, starred → favourite, place; with several journals the journal name is added as a tag.
  - Re-importing never duplicates (entries keyed by Day One UUID). Skipped and reported: videos, audio and PDFs;
    photos the device cannot decode (e.g. HEIC); photos missing from the ZIP.
  - Journal limits raised for imports: 100,000 characters and 30 photos per entry.
  - Fixed: entry previews ran words together across lines, paragraphs and list items.
- **Build 61 — notebooks and the Day One-style timeline:**
  - Journal **notebooks**: a switcher under the Journal title (All notebooks or one notebook) filters the timeline,
    calendar, memories, photos and journey stats. Create, rename, recolour (8 colours) or delete notebooks; deleting
    moves entries to Journal. Existing entries live in the default "Journal" notebook. The entry editor has a
    notebook picker; the reader shows the notebook and colours the title. Notebooks sync with settings.
  - **Day One-style timeline** (default): month headings, a date column (weekday + day number), the title in the
    notebook colour, grey preview, time, and a photo mosaic (1 photo, or 2x2 with "+N"). Settings › Appearance ›
    Journal timeline: List or Cards.
  - Day One import: each Day One journal becomes a notebook (instead of a tag).
- **Build 62 — colourful text across the app:**
  - One text palette (amber, coral, blue, green, purple, teal, pink, orange, indigo) with bright shades on dark and
    deeper shades on light; WCAG AA contrast verified in both themes.
  - Page titles per area; every section heading coloured (with its icon); habit names in each habit's colour; task
    titles by priority; money payees by category and day headings green; Home Spaces labels, Next titles and
    At-a-glance values follow their icons; stat numbers in a rotating palette; chart titles teal; Settings group
    headings and row titles match their icons; AI headings and starter tiles coloured; the active tab takes its
    area colour; Journal Cards titles use the notebook colour.
- **Build 63 — clear active tabs, clean AI replies:**
  - Every switcher (Journal tabs, Money tabs, Insights tabs, chart ranges, task filters, account and vault chips,
    Appearance options) shows the selected option as a solid pill in the screen's colour with bold text; inactive
    options are muted. Active-vs-background contrast went from ~1.1:1 to 5–11:1.
  - AI: Gemini 2.5 Flash no longer spends the reply budget on "thinking" (thinkingBudget 0; Pro/3.x get extra room),
    the assistant asks for JSON output and has 1,500 tokens; replies are read robustly (code fences, text around the
    JSON, cut-off replies are recovered) and shown as formatted text — raw JSON/code is never displayed. Journal AI
    output uses the same formatting.
- **Build 64 — AI message box:**
  - Quick actions are outlined pills, each in its own colour (+ Habit amber, + Task blue, + Expense green, Overdue
    coral, reviews teal/purple) — they were the same colour as the box and read as loose text.
  - Read-aloud and microphone are light icon buttons; the input is outlined (purple when focused); send is purple
    like the AI page.
  - The box now sits 10 px above the floating + button (it used to sit above the tab bar only, so the + button
    tucked under it).
- **Build 65 — Journal header redesign:**
  - Writing prompt: coral pen icon, "How was your day?", a live subtitle (today's date, or "N entries today · add
    another") and a coral Write button.
  - Your journey: "N this month" beside the title; four tiles with their own colour and icon — Day streak (flame,
    orange), Best streak (trophy, amber), Entries (book, coral), Days written (calendar, teal); one-line labels so
    numbers align; 2×2 on phones, 4 across on wider screens.
  - Entries bar: "Entries" heading with a compact Select pill on the right; Select mode shows the usual controls.
- **Build 66 — entry editor, Tasks header, pop-up sizes, multi-photo on Android:**
  - Journal editor: large borderless title; formatting toolbar as one pill (coral mic); sections Photos / Details /
    Mood; dashed "Add photos" and "Camera" tiles; a details card with coloured icon rows (Notebook, When, Place);
    compact mood pills that light up in their own colour; Template and AI actions side by side; favourite row with a
    star; coral Save.
  - Android: "Add photos" opens the system Photo Picker (Android 13+) or a multi-select picker, so several photos
    can be added at once (up to the 8-per-entry limit). Receipt scanning keeps the single-photo picker.
  - Tasks header: Export (outline) and + Task (blue) at 44 px; four coloured tiles with icons (Overdue, Today,
    Upcoming, Done) that filter the list when tapped; search field with an icon and 48 px view buttons.
  - Pop-up size system for every sheet and dialog: 48 px main buttons, fields and dropdowns; 44 px secondary
    buttons; 40 px inline buttons and chips.
- **Build 67 — AI errors, drafts, chat, modules, journal and Spaces polish:**
  - AI: the saved model is checked against the provider (a model from another provider caused 404/400); a 404 falls
    back to the provider's default (Gemini: a working Flash model from your key's list) and is remembered; a Gemini
    400 retries without extra settings; errors show the provider's actual reason; "API key not set up" only when
    there is no key.
  - Journal drafts: the Drafts button never refreshed (renderJr called a misnamed function); it now updates the
    moment a draft is saved, shows as a "Drafts · N" pill, with a "Saved as a draft" message.
  - Chat: your messages are fitted, right-aligned purple bubbles (no clipping); replies read at 15 px with formatting;
    errors are a card with the reason and a "Check AI settings" button; Clear is a compact pill.
  - Quick log widget: Journal opens the app's New entry screen again.
  - Modules: Settings › Money & currency, AI starters, global search and AI actions now respect turned-off modules.
  - Journal: notebook picker is a custom menu (colour dots, check, New notebook); native dropdowns follow the theme.
  - Journal stats: one compact row of four on phones.
  - Spaces: glass tiles with glowing app icons and a colour bar under each label.
- **Build 68 — task card menu:**
  - The ⋯ menu was clipped inside the card (task cards use content-visibility, which also trapped its position). It
    now opens as a labelled list on top of the page — Pin to top / Unpin, Snooze to tomorrow, Duplicate, with
    coloured icons — anchored to the ⋯ button, opening upwards near the bottom of the screen.
  - A press inside the menu no longer starts the card swipe (which moved the card and lost the tap); the menu closes
    on a real scroll, a tap elsewhere, Escape or back. The ⋯ button shows a subtle highlight instead of an amber ring.
- **Build 69 — production test pass (139 functional cases + audits), fixes:**
  - CRITICAL: a journal entry saved with a mood made loading crash at the next start (JR_MOODS used before it was
    defined), and the blank fallback state then overwrote the saved data. Fixed the cause; load() now keeps an
    untouched rescue copy, salvages every readable record, and retries the full data once the app has started.
  - SECURITY: journal HTML is sanitised (scripts, frames, event attributes, javascript: links removed) on save, load,
    sync and every display; previews use an inert parser so stored text can never run code.
  - Deleting a journal entry now goes to Recently deleted (it was permanent despite the Data screen's promise).
  - Tapping anywhere on a draft row reopens the draft (the row edge did nothing).
  - Save buttons ignore an accidental second tap (duplicates were created); a retry after a refused save works.
  - Empty messages are never shown (Android could display "null").
  - Text size and Font weight options were cut off on 360 px phones; crowded segments now sit under their label.
  - AI: additions and check-offs made by the assistant now show a plain done message (not the model's question) and an
    Undo button; deletions already asked first. The AI page's promise now reads "Anything that deletes data asks first,
    and changes can be undone."
  - Touch targets raised to 40 px (recap and insight close buttons, notebook and Select pills, AI summary icon,
    Appearance options); compact journal stat labels 12 px; AI message box follows the border/radius settings.
- **Build 70 — UI/UX pass across every screen:**
  - One selected style for every choice chip in the editors (task reminder and expense account chips were outlined
    while others were filled); light theme uses dark text on amber for contrast.
  - Add expense: the amount is the hero (44 px, currency symbol, coloured by type); Expense / Income / Transfer each
    select in their own colour (coral, green, blue).
  - Money: "vs last month" and the top category now sit inside the hero card as an insight row (trend badge green
    when spending is down, coral when up).
  - Habits: each habit's check button is filled in the habit's own colour, matching its name and chain.
  - New users: the weekly recap stays hidden until the week has activity; the Habits empty state offers one-tap
    starter habits; empty-state buttons use their page colour; "Select" hides when a list is empty.
  - Journal › AI: the date range fits its card; Tasks: icon-only Export on phones so the summary line fits.
- **Build 71 — Spaces redesign and second UI/UX pass:**
  - Spaces: clean tinted tiles (no decorative circles or label bars), crisp 48 px icon tiles with a soft glow, clearer
    labels; new Workout (dumbbell) and Journal (notebook) icons.
  - Habit detail: the name, icon tile and stats in the habit's own colour; details as three chips
    (type · target, category, reminder) with "since" as quiet text.
  - Insights: trend chart in the page's teal.
  - Search: recent searches (with Clear) and colourful "Go to" shortcuts before typing; turned-off modules left out.
  - Vault without a PIN now opens Privacy & security with the PIN button highlighted.
  - Profile name placeholder is neutral ("e.g. Alex").
- **Build 72 — Appearance screen fixes:**
  - Large empty gaps under "Text size", "Font weight", "Paper texture" and "Type": a stacked label's fixed width was
    acting as a 116 px height; stacked labels now size to their text.
  - Sliders show a visible track filled in the accent colour up to the value, with a white thumb ringed in amber; the
    fill updates while dragging and when presets (Density, Reset) move them. Dark, AMOLED and light.
  - "Larger touch targets" and "Strong focus indicators" checkboxes had collapsed to 0×0; they are now proper switches
    (48×28, purple when on), the whole row is tappable, and they keep their shape with larger touch targets on.
- **Build 73 — journal photos fix and photo ZIP export:**
  - Photos below the first ~20 timeline entries stayed as empty squares: rows loaded while scrolling were never asked
    to load their images. Every batch now loads, and a watcher on the Journal page loads any photo tile added later.
  - A photo that is genuinely not on this device shows a "not on this device" marker instead of a blank square.
  - Export journal › Photos: "Download photos (ZIP)" for the chosen date range and tags, with a live photo count and
    progress. Files are named "YYYY-MM-DD HHMM Title NN.jpg" and keep the entry's date and time. Android streams the
    ZIP to Downloads in pieces (new saveChunkBegin/Append/End bridge), so large ranges are safe.
  - Export journal date fields no longer run past the sheet edge.
- **Build 74 — phrase search, jump to match, Google Drive storage:**
  - Search understands phrases: words in quotes must appear exactly; other words must all appear, in any order;
    entries containing the whole query as a phrase rank first; case and accents are ignored. Applies to Journal ›
    Search and global search (all result types).
  - Journal search results show a snippet around the match with the words highlighted.
  - Opening an entry from a search scrolls to the exact match and highlights every occurrence, with a "1 of N"
    navigator (previous / next / clear); the phrase is preferred over single words.
  - Settings › Cloud sync › Storage: space used by Momentum's photo folder (from every sync listing) and the Google
    account's storage (used / limit, with a bar), refreshed on opening and on demand. New Android bridge call
    driveQuota (Drive about.get, allowed by the existing drive.appdata permission).
- **Build 75 — Cloud sync Storage row always appears; build number in Settings:**
  - The Storage row follows the "Sync photos now" row directly (it could stay hidden if the Drive rows were shown
    before it was set up); buttons in the Drive card sit on the right edge.
  - Settings shows the build ("Momentum 1.5.1 · build 75 · web"; Android adds "web build 75") so you can confirm the
    newest code is loaded. WEB_BUILD must be raised with each build.
