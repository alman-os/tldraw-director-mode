# Troubleshooting

Start every investigation by quitting all tldraw copies and relaunching only the exact bundle under test. Identical bundle identifiers and shared application data can make an unpatched window look like it came from the patched app—or the reverse.

| Symptom | Likely cause | Resolution |
| --- | --- | --- |
| Camera-tour asset returns a protocol 404 | Files were placed in a new renderer directory that the `tldraw-app://` handler does not serve | Inject directly into the existing `out/renderer/assets/` directory. Reapply the current patch to a clean app copy. |
| App refuses to launch after patching | ASAR hash or code signature does not match the modified bundle | Compare the file hash with `ElectronAsarIntegrity`, update it with `PlistBuddy`, ad-hoc sign, and run strict signature verification. |
| Plist hash command cannot find the key | `Resources/app.asar` was interpreted as a path rather than one literal key | Use `/usr/libexec/PlistBuddy` with `:ElectronAsarIntegrity:Resources/app.asar:hash`; do not split the slash-containing key. |
| App opens but **Shots** is missing | Another copy is running, the renderer index was not injected, or the asset failed to load | Quit every copy. Verify the ASAR contains the assets and that `index.html` contains the marker. Launch only the target bundle. |
| Markers exist but the Director panel is absent | Document data loaded normally, but the controller did not load or bind to `window.editor` | Inspect asset injection and renderer errors. The saved shot model is intentionally independent of the overlay. |
| Native watcher or WebSocket module fails | ASAR repack omitted native unpack rules or left an inconsistent `.unpacked` directory | Reapply to a clean app using the preserved native-module unpack pattern. |
| Captured shots play at the wrong position | Playback uses stale camera values or local rather than page-space marker bounds | Recompute from current page bounds and call `editor.zoomToBounds(...)`; do not persist a second camera transform. |
| Shot names appear in the rectangles | Marker `richText` was populated | Keep shape text empty and render names only in the Director interface. |
| Reordering looks correct until reopening | Orders were changed only in UI state | Persist normalized `meta.cameraTour.order` values on the shapes. |
| Panel is obscured by native tldraw UI | Overlay stacking or background styling regressed | Restore the Director overlay's explicit z-index and opaque light/dark backgrounds. |
| **Shots** launcher overlaps the native style panel | The launcher was right-anchored beside tldraw's upper-right controls | Keep `.ct-launcher` at `top: 52px; left: 12px`; the full Director panel remains right-anchored. |
| `npx @electron/asar` fails | Node.js is absent, network access is unavailable, or the package cache is incomplete | Confirm `node` and `npx`, restore network access for the first run, or preinstall/cache the ASAR package. |
| Reapplying does not replace the backup | Expected one-time-backup behavior | Use a fresh source app when you need a new pristine baseline. Never treat a later rerun as a new recovery point. |
| A tldraw update removes the feature | The application bundle was replaced | Rebase and fully verify the patch against the new version before applying it again. Do not assume the old ASAR layout or APIs are unchanged. |

## Focused diagnostic commands

Set the application path first:

```bash
APP_PATH="$HOME/Applications/tldraw Camera Director.app"
ASAR_PATH="$APP_PATH/Contents/Resources/app.asar"
INFO_PATH="$APP_PATH/Contents/Info.plist"
```

Check the signature:

```bash
codesign --verify --deep --strict --verbose=2 "$APP_PATH"
```

Print the packaged and calculated hashes:

```bash
/usr/libexec/PlistBuddy \
  -c 'Print :ElectronAsarIntegrity:Resources/app.asar:hash' \
  "$INFO_PATH"
shasum -a 256 "$ASAR_PATH"
```

List the injected files:

```bash
npx --yes @electron/asar list "$ASAR_PATH" | rg 'camera-tour|out/renderer/index.html'
```

If package integrity is correct but the interface still fails, inspect the renderer console for the first error rather than secondary errors caused by the controller not loading.
