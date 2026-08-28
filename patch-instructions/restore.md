# Restore the original application

Restoring the saved ASAR removes Camera Director Mode from the patched renderer. For a guaranteed pristine installation, replacing the entire app with a clean downloaded copy is still the strongest option.

## Restore from the one-time backup

First, quit every running tldraw copy. Then set the target:

```bash
APP_PATH="$HOME/Applications/tldraw Camera Director.app"
RESOURCES_PATH="$APP_PATH/Contents/Resources"
ASAR_PATH="$RESOURCES_PATH/app.asar"
BACKUP_PATH="$RESOURCES_PATH/app.asar.before-camera-upgrade"
VENDOR_PATH="$RESOURCES_PATH/vendor-modules/tldraw.js"
VENDOR_BACKUP_PATH="$RESOURCES_PATH/vendor-modules/tldraw.js.before-camera-upgrade"
INFO_PATH="$APP_PATH/Contents/Info.plist"
```

Confirm the backup exists before changing anything:

```bash
test -f "$BACKUP_PATH"
test -f "$VENDOR_BACKUP_PATH"
```

Restore it and recalculate the integrity hash:

```bash
cp "$BACKUP_PATH" "$ASAR_PATH"
cp "$VENDOR_BACKUP_PATH" "$VENDOR_PATH"
ASAR_HASH=$(shasum -a 256 "$ASAR_PATH" | awk '{print $1}')
/usr/libexec/PlistBuddy \
  -c "Set :ElectronAsarIntegrity:Resources/app.asar:hash $ASAR_HASH" \
  "$INFO_PATH"
codesign --force --deep --sign - "$APP_PATH"
codesign --verify --deep --strict --verbose=2 "$APP_PATH"
```

Do not delete the backup automatically. It is intentionally retained as the recovery point for that bundle.

## Verify restoration

Launch only the restored app. The Camera Director **Shots** control should no longer appear.

Existing camera markers inside `.tldraw` documents remain ordinary rectangles with metadata. Restoration does not delete or rewrite user documents.

## Limits of ASAR restoration

The backup captures the ASAR at the first patch run, not necessarily the pristine downloaded app. It also does not reverse unrelated changes made elsewhere in the application bundle.

If any of these are true, replace the whole app instead:

- The backup is missing.
- The app had another patch before Camera Director Mode was applied.
- Native-module or signing errors continue after restoration.
- You need a known-clean baseline for a new release test.

To replace the whole bundle, quit the app, move the patched copy somewhere recoverable or to Trash, and create a fresh copy from the original installer or trusted download.
