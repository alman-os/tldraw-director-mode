# Patch architecture

Camera Director Mode is a source patch layered onto the packaged tldraw Offline renderer. It does not fork tldraw's React application or introduce a second document format.

## Design goals

- Keep camera shots inside the `.tldraw` document.
- Make every shot editable with ordinary canvas interactions.
- Use tldraw's own camera animation and bounds calculations.
- Keep the patch small enough to rebase onto a newer Offline release.
- Avoid changing tldraw's core shape schema or application source.

## Runtime architecture

`camera-tour.js` waits for the renderer's `window.editor`, attaches the Director interface, and listens to the editor store for shot changes. If the editor instance changes, the controller safely rebinds.

The implementation has three layers:

1. **Document model** — ordinary `geo` rectangle shapes carrying `meta.cameraTour`.
2. **Director controller** — capture, sorting, selection, rename, playback, and presentation state.
3. **HTML/CSS overlay** — the Shots button, shot list, transport controls, and presentation controls.

Shot geometry is authoritative. A shot's page-space rectangle supplies the bounds passed to `editor.zoomToBounds(...)`; the patch does not persist a second set of raw camera coordinates.

Global transition and hold durations are controller preferences. They are intentionally not stored on each shot. Shot identity, order, name, and framing belong to the document.

## Packaging pipeline

`camera-upgrade/apply-camera-upgrade.sh` performs these operations:

1. Extract `Contents/Resources/app.asar` into a temporary directory.
2. Copy `camera-tour.js` and `camera-tour.css` into the existing `out/renderer/assets/` directory.
3. Add stable script and stylesheet tags to `out/renderer/index.html` using the `tldraw-camera-upgrade` marker.
4. Repack the ASAR while preserving the native-module unpack pattern.
5. Create `app.asar.before-camera-upgrade` if no backup exists yet.
6. Replace the packaged ASAR and its unpacked native files.
7. Recalculate the ASAR SHA-256 integrity value in `Info.plist`.
8. Ad-hoc sign the modified application bundle and verify its signature.

## Why assets must stay in the existing directory

The Electron application serves renderer files through its custom `tldraw-app://` protocol. Testing showed that a newly introduced renderer subdirectory could return a protocol 404 even when the files were present in the ASAR. Injecting the two patch files directly into the already-served `out/renderer/assets/` directory avoids that failure mode.

Do not move the runtime files into a new `out/renderer/camera-tour/` directory without retesting the packaged protocol behavior.

## ASAR integrity detail

The plist contains this literal nested key:

```text
ElectronAsarIntegrity
└── Resources/app.asar
    └── hash
```

Because `Resources/app.asar` includes a slash, treating it as a normal `plutil` key path can fail. The patch uses `/usr/libexec/PlistBuddy` to address the literal key correctly.

## Native modules

The app expects selected native dependencies outside the ASAR. Repacking preserves this pattern:

```text
node_modules/{@parcel/watcher-darwin-arm64/**,@parcel/watcher-darwin-x64/**,bufferutil/**}
```

Changing or dropping that pattern can produce startup failures that look unrelated to Camera Director Mode.

## Deliberate non-goals

- A replacement for tldraw's native presentation or frame concepts.
- Per-shot timing, easing, narration, or audio metadata.
- A new custom tldraw shape type.
- Cross-platform packaging beyond the tested macOS Offline app.
- Automatic migration across every future tldraw schema change.

See [Camera-shot contract](camera-shot-contract.md) before changing the stored model.
