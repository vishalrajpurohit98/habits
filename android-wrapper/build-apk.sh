#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WRAP="$ROOT/android-wrapper"
BUILD="$WRAP/build"
STAGE="$BUILD/stage"
WEB="$STAGE/assets/web"
OUT="$ROOT/dist"
mkdir -p "$BUILD" "$OUT"
rm -rf "$STAGE" "$BUILD/gen" "$BUILD/classes" "$BUILD/apk" "$BUILD/unsigned.ap_" "$BUILD/unsigned.apk" "$BUILD/aligned.apk"
mkdir -p "$WEB" "$BUILD/gen" "$BUILD/classes" "$BUILD/apk"

find_tool() {
  local name="$1"
  local found=""
  if [[ -n "${ANDROID_HOME:-}" ]]; then
    found="$(find "$ANDROID_HOME/build-tools" -type f -name "$name" | sort -V | tail -1 || true)"
  fi
  if [[ -z "$found" && -n "${ANDROID_SDK_ROOT:-}" ]]; then
    found="$(find "$ANDROID_SDK_ROOT/build-tools" -type f -name "$name" | sort -V | tail -1 || true)"
  fi
  if [[ -z "$found" ]]; then
    found="$(command -v "$name" 2>/dev/null || true)"
  fi
  [[ -n "$found" ]] || { echo "ERROR: Required tool not found: $name" >&2; exit 1; }
  echo "$found"
}
AAPT2="$(find_tool aapt2)"
D8="$(find_tool d8)"
ZIPALIGN="$(find_tool zipalign)"
APKSIGNER="$(find_tool apksigner)"

if [[ -z "${ANDROID_HOME:-}" && -z "${ANDROID_SDK_ROOT:-}" ]]; then
  echo "ERROR: ANDROID_HOME/ANDROID_SDK_ROOT is not set." >&2; exit 1
fi
SDK="${ANDROID_HOME:-$ANDROID_SDK_ROOT}"
PLATFORM="$(find "$SDK/platforms" -maxdepth 1 -type d -name 'android-*' | sort -V | tail -1)"
[[ -n "$PLATFORM" ]] || { echo "ERROR: Android platform not installed." >&2; exit 1; }
ANDROID_JAR="$PLATFORM/android.jar"

[[ -f "$ROOT/index.html" ]] || { echo "ERROR: index.html not found." >&2; exit 1; }

PACKAGE_NAME="$(sed -n 's/.*package="\([^"]*\)".*/\1/p' "$WRAP/AndroidManifest.xml" | head -1)"
[[ -n "$PACKAGE_NAME" ]] || { echo "ERROR: AndroidManifest.xml has no package attribute." >&2; exit 1; }
PACKAGE_PATH="${PACKAGE_NAME//./\/}"
if ! grep -Rqs "^package ${PACKAGE_NAME};" "$WRAP/src" --include='*.java'; then
  echo "ERROR: Java package declarations do not match manifest package: $PACKAGE_NAME" >&2
  exit 1
fi

# Bundle the existing web app exactly as supplied, excluding repository/development metadata.
rsync -a --delete \
  --exclude='.git' \
  --exclude='.github' \
  --exclude='android-wrapper' \
  --exclude='dist' \
  --exclude='*.zip' \
  "$ROOT/" "$WEB/"

for f in index.html; do
  [[ -f "$WEB/$f" ]] || { echo "ERROR: Missing web asset: $f" >&2; exit 1; }
done

# AAPT2 compile/link
find "$WRAP/res" -type f | while read -r f; do
  "$AAPT2" compile --dir "$WRAP/res" -o "$BUILD/res.zip" >/dev/null
  break
done
"$AAPT2" link \
  -o "$BUILD/unsigned.ap_" \
  -I "$ANDROID_JAR" \
  --manifest "$WRAP/AndroidManifest.xml" \
  --java "$BUILD/gen" \
  --min-sdk-version 29 \
  --target-sdk-version 35 \
  --version-code "${VERSION_CODE:-1}" \
  --version-name "${VERSION_NAME:-1.0}" \
  -A "$STAGE/assets" \
  "$BUILD/res.zip"

# Compile native Java and DEX it.
mapfile -t JAVA_FILES < <(find "$WRAP/src" -name '*.java')
[[ "${#JAVA_FILES[@]}" -gt 0 ]] || { echo "ERROR: No Java sources found." >&2; exit 1; }
# AAPT2 determines the generated R.java package from AndroidManifest.xml.
# Do not hard-code the generated R.java path; this keeps the build aligned
# with the actual manifest package and avoids path failures.
mapfile -t GENERATED_JAVA < <(find "$BUILD/gen" -type f -name '*.java')
[[ "${#GENERATED_JAVA[@]}" -gt 0 ]] || {
  echo "ERROR: AAPT2 did not generate Java sources (R.java). Check AndroidManifest.xml and resources." >&2
  find "$BUILD/gen" -maxdepth 6 -type f -print >&2 || true
  exit 1
}

javac -Xlint:-options -source 8 -target 8 -encoding UTF-8 -classpath "$ANDROID_JAR" -d "$BUILD/classes" \
  "${JAVA_FILES[@]}" "${GENERATED_JAVA[@]}"
"$D8" --min-api 29 --output "$BUILD/dex" $(find "$BUILD/classes" -name '*.class')

# Turn AAPT2 output into an APK and add DEX.
unzip -q "$BUILD/unsigned.ap_" -d "$BUILD/apk"
cp "$BUILD/dex/classes.dex" "$BUILD/apk/classes.dex"
(
  cd "$BUILD/apk"
  zip -qr "$BUILD/unsigned.apk" .
)
"$ZIPALIGN" -f 4 "$BUILD/unsigned.apk" "$BUILD/aligned.apk"

KEYSTORE="${KEYSTORE_PATH:-}"
if [[ -n "$KEYSTORE" ]]; then
  [[ -f "$KEYSTORE" ]] || { echo "ERROR: KEYSTORE_PATH does not exist: $KEYSTORE" >&2; exit 1; }
  : "${KEYSTORE_PASSWORD:?ERROR: KEYSTORE_PASSWORD is required when signing}"
  : "${KEY_ALIAS:?ERROR: KEY_ALIAS is required when signing}"
  : "${KEY_PASSWORD:?ERROR: KEY_PASSWORD is required when signing}"
  "$APKSIGNER" sign \
    --ks "$KEYSTORE" \
    --ks-pass "pass:$KEYSTORE_PASSWORD" \
    --ks-key-alias "$KEY_ALIAS" \
    --key-pass "pass:$KEY_PASSWORD" \
    --out "$OUT/PersonalTracker.apk" \
    "$BUILD/aligned.apk"
  "$APKSIGNER" verify --verbose "$OUT/PersonalTracker.apk"
else
  cp "$BUILD/aligned.apk" "$OUT/PersonalTracker-unsigned.apk"
fi

echo "APK output: $OUT/PersonalTracker.apk"
