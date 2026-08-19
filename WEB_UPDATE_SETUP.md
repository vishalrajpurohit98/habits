# Web Update System

The Android APK now embeds the Git commit used to build it and checks the GitHub `main` branch for a newer commit at startup.

## Flow

`git push main` -> GitHub Pages deploys the web app -> APK checks latest `main` commit -> update prompt -> Update Now loads the deployed web app.

## One-time GitHub setup

1. Open the repository on GitHub.
2. Go to **Settings -> Pages**.
3. Set **Source** to **GitHub Actions**.
4. Push to `main`.

The workflow deploys the repository's web files to GitHub Pages and then builds the APK with:

- `versionName`: `6.24`
- `versionCode`: GitHub Actions run number
- `BUILD_COMMIT`: current Git commit SHA
- `WEB_UPDATE_URL`: repository GitHub Pages URL
- `REPO_API`: GitHub `main` commit API endpoint

## User behavior

- **Update Now**: remembers the remote web commit and loads it on future launches.
- **Later**: remembers the dismissed commit so the same update is not shown again.
- A newer future commit triggers a new prompt.
- If the remote web app cannot be loaded, the APK falls back to the bundled web app.
- The native `Bridge` remains injected into the WebView, so native reminders, speech, files and other Android features continue to work.
