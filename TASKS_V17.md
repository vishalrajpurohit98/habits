# V9 Voice and motion rollback

- Removed the V3.1 navigation/motion override that caused duplicate-looking tab transitions.
- Restored the original `.page` fadeUp navigation behavior and existing legacy animations.
- Removed the V4/V8 voice modal and its custom animations.
- Rebuilt voice control as a direct microphone command flow: Android native SpeechRecognizer in APK; Web Speech API in supported browsers.
- Browser recognition now creates the recognizer directly, registers all events before start, has an 8-second startup watchdog and explicit errors, and sends the final transcript to the AI command engine automatically.
- Added a simple static global microphone button that opens the AI page and starts voice; no new voice animation.
- Kept the existing `keystore.b64` unchanged.
- Version 1.1.3 / code 6.
