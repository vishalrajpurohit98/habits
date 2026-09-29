#!/usr/bin/env bash
# Build Momentum into a signed APK with Gradle (required for Google sign-in / Drive photo sync).
# Same interface as before: ANDROID_HOME, KEYSTORE, KS_PASS, KEY_ALIAS [, KEY_PASS, VERSION_CODE, VERSION_NAME, WEB_DIR, OUT_APK].
# The previous SDK-tools-only build is kept as build-apk-legacy.sh.
set -euo pipefail
WEB_DIR="${WEB_DIR:-..}"
OUT_APK="${OUT_APK:-build/PersonalTracker.apk}"
export KEY_PASS="${KEY_PASS:-${KS_PASS:-}}"
: "${ANDROID_HOME:?set ANDROID_HOME}"
: "${KEYSTORE:?set KEYSTORE}"
: "${KS_PASS:?set KS_PASS}"
: "${KEY_ALIAS:?set KEY_ALIAS}"
HERE="$(cd "$(dirname "$0")" && pwd)"; cd "$HERE"

echo ">> cleaning"
rm -rf build gbuild && mkdir -p build/stage/assets/web

echo ">> staging web assets from: $WEB_DIR"
rsync -a --exclude '.git' --exclude '.github' --exclude 'android-wrapper' --exclude 'node_modules' --exclude '*.apk' "$WEB_DIR"/ build/stage/assets/web/
for f in index.html firebase-app-compat.js firebase-database-compat.js xlsx.min.js; do
  test -f "build/stage/assets/web/$f" || { echo "ERROR: $f missing in $WEB_DIR"; exit 1; }
done

echo ">> staging manifest (Gradle supplies package, versions and SDK levels)"
sed -e 's/ package="[^"]*"//' -e '/<uses-sdk[^>]*\/>/d' AndroidManifest.xml > build/AndroidManifest.xml
export STAGED_MANIFEST="build/AndroidManifest.xml"
if [ -n "${VERSION_CODE:-}" ] || [ -n "${VERSION_NAME:-}" ]; then echo ">> version overrides (code=${VERSION_CODE:-props} name=${VERSION_NAME:-props})"; fi

echo ">> gradle assembleRelease"
# Windows checkouts can lose the executable bit / add CRLF: run the wrapper through sh with LF line endings
if [ -f ./gradlew ]; then sed -i 's/\r$//' ./gradlew; chmod +x ./gradlew; GRADLE="./gradlew"; else GRADLE="gradle"; fi
"$GRADLE" --no-daemon -q assembleRelease

mkdir -p "$(dirname "$OUT_APK")"
cp gbuild/outputs/apk/release/*-release.apk "$OUT_APK"

echo ">> verify"
BT="$(ls -d "$ANDROID_HOME"/build-tools/* | sort -V | tail -n1)"
"$BT/apksigner" verify "$OUT_APK"
echo ">> signing certificate (add this SHA-1 to the Android OAuth client in Google Cloud for Drive photo sync):"
"$BT/apksigner" verify --print-certs "$OUT_APK" | grep -E "SHA-1|SHA-256" || true
"$BT/aapt2" dump badging "$OUT_APK" | grep -E "package:|minSdk|targetSdk"
echo ">> DONE: $OUT_APK"
