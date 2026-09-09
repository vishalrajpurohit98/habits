# V5 Fixes – Voice Recognition & Navigation

- Replaced Android speech activity intent flow with native `SpeechRecognizer` callbacks for reliable WebView voice input.
- Added microphone/speech error propagation so the voice UI never remains stuck on “Listening…”.
- Added recognizer availability and permission handling.
- Added native stop-speech bridge for closing/cancelling voice mode cleanly.
- Removed stacked navigation animation wrappers and browser View Transition usage that could make navigation appear to refresh twice.
- Kept one lightweight directional page transition and Material-style interaction feedback.
- Added a navigation binding guard to prevent duplicate tab click listeners.
- Preserved the existing production `android-wrapper/keystore.b64` unchanged.
- Bumped Android version to `versionCode=4`, `versionName=1.1.1` so this bug-fix build can update the existing 1.1.0 APK.
