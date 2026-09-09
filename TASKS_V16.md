# V16 — Voice Reliability Fix

- Reworked browser voice capture to explicitly request microphone permission before SpeechRecognition.
- Added interim transcript display.
- Added watchdogs that start immediately, including when SpeechRecognition never fires `onstart`.
- Added explicit handling for permission, microphone, network, service, no-speech and aborted states.
- Kept native Android SpeechRecognizer path and added a native timeout.
- Preserved the existing keystore and all previous functionality.
