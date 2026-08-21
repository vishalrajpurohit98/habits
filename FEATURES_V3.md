# Personal Tracker Feature Pack

This build adds a connected product layer on top of the existing trackers.

## Added
- Goals and goal progress
- Weekly planning and daily habit allocation
- Today Command Center
- Global search (including Ctrl/Cmd+K)
- AI memory/preferences
- Financial goals
- Habit templates
- Minimum Day mode
- Milestone progress
- Smart reminders based on recent completion hours
- Pattern insights for sleep/mood vs habit consistency
- Receipt image capture with Gemini vision extraction when Gemini is configured
- Privacy mode for Money
- Browser notification actions: Complete / Snooze
- Android home-screen Today widget support

## Notes
- Existing Firestore sync remains unchanged.
- Existing local-first storage remains unchanged.
- The web-update mechanism is not included.
- Receipt extraction requires a Gemini API key; manual expense entry remains available.
- Android widget is included in the native wrapper and refreshes from the web app through a dedicated WidgetBridge.
