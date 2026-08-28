#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
APP_SOURCE=${APP_SOURCE:-"/Applications/tldraw offline.app"}
APP_NAME="tldraw offline"
VOL_NAME="tldraw Camera Director"
BACKGROUND_SOURCE=${BACKGROUND_SOURCE:-"$ROOT_DIR/assets/dmg_window_bg.png"}
DIST_DIR=${DIST_DIR:-"$ROOT_DIR/dist"}
SIGNING_IDENTITY=${SIGNING_IDENTITY:-}

if [[ ! -d "$APP_SOURCE" ]]; then
	echo "Missing app bundle: $APP_SOURCE" >&2
	exit 1
fi
if [[ ! -f "$BACKGROUND_SOURCE" ]]; then
	echo "Missing 1200x800 DMG background: $BACKGROUND_SOURCE" >&2
	exit 1
fi
command -v create-dmg >/dev/null || {
	echo "Missing create-dmg. Install it with: brew install create-dmg" >&2
	exit 1
}

VERSION=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$APP_SOURCE/Contents/Info.plist")
ARCH=$(file "$APP_SOURCE/Contents/MacOS/tldraw offline" | sed -n 's/.*Mach-O 64-bit executable //p')
FINAL_DMG="$DIST_DIR/tldraw_Camera_Director_${VERSION}_macOS-${ARCH}.dmg"
WORK_DIR=$(mktemp -d "$ROOT_DIR/build/dmg-wrap.XXXXXX")
STAGE_DIR="$WORK_DIR/stage"
MOUNT_DIR="$WORK_DIR/mount"
TMP_DMG="$WORK_DIR/$(basename "$FINAL_DMG")"

if [[ -e "$FINAL_DMG" ]]; then
	echo "Refusing to overwrite existing artifact: $FINAL_DMG" >&2
	exit 1
fi

read -r BG_WIDTH BG_HEIGHT < <(
	sips -g pixelWidth -g pixelHeight "$BACKGROUND_SOURCE" |
		awk '/pixelWidth/ {w=$2} /pixelHeight/ {h=$2} END {print w, h}'
)
read -r BG_DPI_WIDTH BG_DPI_HEIGHT < <(
	sips -g dpiWidth -g dpiHeight "$BACKGROUND_SOURCE" |
		awk '/dpiWidth/ {w=$2} /dpiHeight/ {h=$2} END {print w, h}'
)
if [[ "$BG_WIDTH" != "1200" || "$BG_HEIGHT" != "800" ]]; then
	echo "DMG background must be 1200x800; got ${BG_WIDTH}x${BG_HEIGHT}" >&2
	exit 1
fi
if [[ "$BG_DPI_WIDTH" != "144.000" || "$BG_DPI_HEIGHT" != "144.000" ]]; then
	echo "DMG background must be 144 DPI for a 600x400 Retina Finder window; got ${BG_DPI_WIDTH}x${BG_DPI_HEIGHT} DPI" >&2
	exit 1
fi

mkdir -p "$STAGE_DIR" "$MOUNT_DIR" "$DIST_DIR"
ditto "$APP_SOURCE" "$STAGE_DIR/$APP_NAME.app"

codesign --verify --deep --strict --verbose=2 "$STAGE_DIR/$APP_NAME.app"

create_image() {
	create-dmg \
		--volname "$VOL_NAME" \
		--background "$BACKGROUND_SOURCE" \
		--window-pos 200 120 \
		--window-size 600 400 \
		--icon-size 100 \
		--text-size 14 \
		--icon "$APP_NAME.app" 175 120 \
		--hide-extension "$APP_NAME.app" \
		--app-drop-link 425 120 \
		--no-internet-enable \
		--format UDZO \
		"$@" \
		"$TMP_DMG" \
		"$STAGE_DIR"
}

if [[ -n "$SIGNING_IDENTITY" ]]; then
	create_image --codesign "$SIGNING_IDENTITY"
else
	create_image
fi

hdiutil verify "$TMP_DMG"
hdiutil attach "$TMP_DMG" -nobrowse -readonly -mountpoint "$MOUNT_DIR" >/dev/null
codesign --verify --deep --strict --verbose=2 "$MOUNT_DIR/$APP_NAME.app"
hdiutil detach "$MOUNT_DIR" -quiet

ditto "$TMP_DMG" "$FINAL_DMG"
shasum -a 256 "$FINAL_DMG"
echo "Packaged local DMG: $FINAL_DMG"
