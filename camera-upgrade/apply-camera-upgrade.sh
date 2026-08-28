#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
APP_PATH=${1:-"$SCRIPT_DIR/../tldraw offline.app"}
RESOURCES_PATH="$APP_PATH/Contents/Resources"
ASAR_PATH="$RESOURCES_PATH/app.asar"
INFO_PATH="$APP_PATH/Contents/Info.plist"
BACKUP_PATH="$RESOURCES_PATH/app.asar.before-camera-upgrade"
VENDOR_PATH="$RESOURCES_PATH/vendor-modules/tldraw.js"
VENDOR_BACKUP_PATH="$RESOURCES_PATH/vendor-modules/tldraw.js.before-camera-upgrade"
WORK_PATH=$(mktemp -d "${TMPDIR:-/tmp}/tldraw-camera-upgrade.XXXXXX")

cleanup() {
	rm -rf "$WORK_PATH"
}
trap cleanup EXIT

if [[ ! -f "$ASAR_PATH" || ! -f "$INFO_PATH" || ! -f "$VENDOR_PATH" ]]; then
	echo "Not a tldraw offline app bundle: $APP_PATH" >&2
	exit 1
fi

echo "Extracting app runtime…"
npx --yes @electron/asar extract "$ASAR_PATH" "$WORK_PATH/app"

mkdir -p "$WORK_PATH/app/out/renderer/assets"
cp "$SCRIPT_DIR/camera-tour.js" "$WORK_PATH/app/out/renderer/assets/camera-tour.js"
cp "$SCRIPT_DIR/camera-tour.css" "$WORK_PATH/app/out/renderer/assets/camera-tour.css"
rm -rf "$WORK_PATH/app/out/renderer/camera-tour"

INDEX_PATH="$WORK_PATH/app/out/renderer/index.html"
if [[ ! -f "$VENDOR_BACKUP_PATH" ]]; then
	cp "$VENDOR_PATH" "$VENDOR_BACKUP_PATH"
fi
node "$SCRIPT_DIR/patch-runtime.js" "$WORK_PATH/app" "$VENDOR_PATH"

echo "Packing upgraded runtime…"
npx --yes @electron/asar pack \
	"$WORK_PATH/app" \
	"$WORK_PATH/app.asar" \
	--unpack 'node_modules/{@parcel/watcher-darwin-arm64/**,@parcel/watcher-darwin-x64/**,bufferutil/**}'

if [[ ! -f "$BACKUP_PATH" ]]; then
	cp "$ASAR_PATH" "$BACKUP_PATH"
fi

cp "$WORK_PATH/app.asar" "$ASAR_PATH"
if [[ -d "$WORK_PATH/app.asar.unpacked" ]]; then
	cp -R "$WORK_PATH/app.asar.unpacked/." "$RESOURCES_PATH/app.asar.unpacked/"
fi

ASAR_HASH=$(shasum -a 256 "$ASAR_PATH" | awk '{print $1}')
/usr/libexec/PlistBuddy -c "Set :ElectronAsarIntegrity:Resources/app.asar:hash $ASAR_HASH" "$INFO_PATH"

echo "Signing local app bundle…"
codesign --force --deep --sign - "$APP_PATH"
codesign --verify --deep --strict "$APP_PATH"

echo "Camera upgrade applied: $APP_PATH"
echo "app.asar sha256: $ASAR_HASH"
