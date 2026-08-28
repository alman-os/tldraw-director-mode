# Verify the patch

Verification has two parts: package integrity and an end-to-end Director tour. Always quit every other tldraw copy before the runtime test.

Set the target once for the shell examples:

```bash
APP_PATH="$HOME/Applications/tldraw Camera Director.app"
```

## Static source checks

From the repository root:

```bash
node --check camera-upgrade/camera-tour.js
node --check camera-upgrade/patch-runtime.js
bash -n camera-upgrade/apply-camera-upgrade.sh
bash -n scripts/package-local-dmg.sh
```

## Bundle signature

```bash
codesign --verify --deep --strict --verbose=2 "$APP_PATH"
```

The command should exit successfully.

## ASAR integrity hash

```bash
ASAR_PATH="$APP_PATH/Contents/Resources/app.asar"
INFO_PATH="$APP_PATH/Contents/Info.plist"
ASAR_HASH=$(shasum -a 256 "$ASAR_PATH" | awk '{print $1}')
PLIST_HASH=$(/usr/libexec/PlistBuddy \
  -c 'Print :ElectronAsarIntegrity:Resources/app.asar:hash' \
  "$INFO_PATH")
test "$ASAR_HASH" = "$PLIST_HASH"
```

No output and exit status zero means the values match.

## Injected files

```bash
npx --yes @electron/asar list "$ASAR_PATH" | \
  rg 'out/renderer/(assets/camera-tour\.(js|css)|index\.html)'
```

The listing should include both assets and the renderer index.

Confirm the live vendor module—the renderer's actual `tldraw-vendor://modules/tldraw.js` source—contains the zero-opacity stop:

```bash
rg 'tldrawSupportedOpacities = \[0,' \
  "$APP_PATH/Contents/Resources/vendor-modules/tldraw.js"
```

For a deeper inspection, extract to a temporary directory and confirm that `index.html` contains the `tldraw-camera-upgrade` marker and references both assets.

## Runtime acceptance test

Use a disposable document and complete this sequence:

1. Launch only the patched application.
2. Confirm the **Shots** control appears at the upper-left canvas edge, does not overlap tldraw's upper-right style panel, and opens the Director panel.
3. Pan and zoom to a useful composition, then capture a shot.
4. Capture at least two more shots at visibly different locations and zoom levels.
5. Move and resize one camera marker; confirm playback uses its new bounds.
6. Rename and reorder shots; confirm the panel and playback order update.
7. Enter presentation mode and test previous, next, play/pause, and exit.
8. Confirm a normal pan or zoom interrupts an active automated transition cleanly.
9. Save, close, reopen, and confirm the markers, names, and order persist.
10. Confirm marker names are not rendered as centered text on the canvas.
11. Move the native opacity slider to its first stop and confirm the selected shape has `opacity: 0`.
12. Toggle **Hide style palette**, close the Director panel, and confirm the native palette disappears and returns without changing the selected shape.
13. Enter presentation and confirm the native style palette is hidden automatically.
14. Check the Director panel in both light and dark appearance if the release will support both.

## Record the tested matrix

For a release or pull request, record:

- macOS version and architecture
- tldraw Offline version
- Camera Director patch revision
- fresh install or reapplication
- static checks result
- runtime acceptance result
- known limitations or visual differences

One successful launch is not enough: persistence and marker-resize playback are the two tests most likely to reveal a contract regression.
