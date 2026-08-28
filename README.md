# tldraw Camera Director Mode

An unofficial macOS patch for **tldraw offline** that turns the infinite canvas into a document-native camera path for narrated explainers, product-release walkthroughs, and recorded presentations.

Instead of saving hidden camera bookmarks, Director Mode creates editable shot rectangles on the canvas:

- Drag a shot frame to change the camera focus.
- Resize it to change the camera zoom.
- Style it with tldraw's normal shape controls.
- Rename and reorder it from the **Shots** panel.
- Play the sequence with smooth transitions, holds, looping, and keyboard controls.

The frame itself is the camera state. Shot geometry, name, and order travel inside the `.tldraw` document.

> [!IMPORTANT]
> This is an unofficial local patch. It is not affiliated with or endorsed by tldraw. Supply your own copy of the application and review the patch before applying it.

## Status

- Tested against **tldraw offline 1.13.2** on macOS.
- Patches the packaged Electron renderer in `app.asar`.
- Replaces the target app's existing signature with an ad-hoc local signature.
- Preserves the original ASAR once as `app.asar.before-camera-upgrade`.
- Uses the document schema `meta.cameraTour.version === 1`.

App updates may change the renderer layout or APIs. Re-test against a clean copy before using the patch with another tldraw version.

## Feature tour

- **Capture this view** creates a dashed, resizable shot frame.
- The **Shots** launcher sits at the upper-left canvas edge, opposite tldraw's native style panel.
- The native opacity slider includes a true **0%** stop for invisible layout and camera-anchor shapes.
- **Hide style palette** can be toggled from Director settings and is automatic during presentation.
- The **Shots** panel lists, renames, reorders, visits, and deletes shots.
- **Present** opens compact previous/next/play/exit controls.
- **Play from start** moves through the ordered tour.
- Transition duration, global hold time, and loop state are configurable.
- Manual pointer or wheel input interrupts autoplay.
- Light and dark system appearances are supported.
- Director accents use the same blue tokens as tldraw's native selected controls.
- `Cmd/Ctrl+Shift+K` toggles the Shots panel.
- Arrow keys or Page Up/Page Down navigate during presentation.
- Home/End jump to the first/last shot, Space toggles playback, and Escape exits.

Transition and hold values are global tour preferences in the current controller; they are not stored per shot.

## Repository layout

```text
.
├── .gitignore
├── README.md
├── Camera Upgrade Demo.tldraw
├── camera-upgrade/
│   ├── apply-camera-upgrade.sh
│   ├── camera-tour.js
│   ├── camera-tour.css
│   └── patch-runtime.js
├── assets/
│   ├── dmg_window_bg.svg
│   └── dmg_window_bg.png
├── scripts/
│   └── package-local-dmg.sh
└── patch-instructions/
    ├── README.md
    ├── architecture.md
    ├── apply.md
    ├── camera-shot-contract.md
    ├── restore.md
    ├── troubleshooting.md
    ├── verify.md
    └── release-checklist.md
```

The repository intentionally does not include a distributable tldraw application bundle. Local `.app` copies, ASAR backups, Finder aliases, and build artifacts are ignored by Git.

## Prerequisites

- macOS with `codesign`, `shasum`, and `/usr/libexec/PlistBuddy`.
- Node.js and `npx` available in the shell.
- Network access the first time `npx @electron/asar` is resolved, unless it is already cached.
- A user-supplied copy of `tldraw offline.app`.

## Quick start

Quit **every running copy** of tldraw offline first. Copies share the same bundle identifier and Application Support directory; running more than one can mix windows, server state, and verification results.

Create a disposable working copy outside the repository:

```bash
mkdir -p "$HOME/Applications"
ditto "/Applications/tldraw offline.app" "$HOME/Applications/tldraw Camera Director.app"
```

Apply the patch to that copy:

```bash
./camera-upgrade/apply-camera-upgrade.sh \
  "$HOME/Applications/tldraw Camera Director.app"
```

Launch only the patched copy:

```bash
open "$HOME/Applications/tldraw Camera Director.app"
```

Open a board, click **Shots**, frame the canvas, then choose **Capture this view**. The included [Camera Upgrade Demo.tldraw](./Camera%20Upgrade%20Demo.tldraw) is a small sample board with three compatible shots.

For the complete procedure, read [patch-instructions/apply.md](./patch-instructions/apply.md) and [patch-instructions/verify.md](./patch-instructions/verify.md).

### Installation paths

| Purpose | Path |
| --- | --- |
| Patch repository | The folder containing this `README.md` |
| Installed tldraw Offline app | `/Applications/tldraw offline.app` |
| Recommended disposable Director build | `$HOME/Applications/tldraw Camera Director.app` |
| Packaged renderer | `<APP_PATH>/Contents/Resources/app.asar` |
| One-time ASAR recovery copy | `<APP_PATH>/Contents/Resources/app.asar.before-camera-upgrade` |
| One-time vendor recovery copy | `<APP_PATH>/Contents/Resources/vendor-modules/tldraw.js.before-camera-upgrade` |

Always run `apply-camera-upgrade.sh` from the repository root and pass the complete `.app` path explicitly.

### Update an existing patched installation

The patch is idempotent, so a CSS or controller update can be installed over an existing Camera Director build. First quit every tldraw Offline process. Then, from the repository root, reapply to the exact app you use.

For the app installed in `/Applications`:

```bash
./camera-upgrade/apply-camera-upgrade.sh \
  "/Applications/tldraw offline.app"
open "/Applications/tldraw offline.app"
```

For the recommended disposable build:

```bash
./camera-upgrade/apply-camera-upgrade.sh \
  "$HOME/Applications/tldraw Camera Director.app"
open "$HOME/Applications/tldraw Camera Director.app"
```

Reapplying preserves the first `app.asar.before-camera-upgrade` backup instead of replacing it. If the application itself has been updated to a new tldraw version, begin with a clean copy and complete the full verification checklist rather than treating it as a routine reapplication.

## How it works

The patcher:

1. Extracts the target app's `app.asar` to a temporary workspace.
2. Places `camera-tour.js` and `camera-tour.css` in the renderer's existing `assets/` directory.
3. Injects the assets into `out/renderer/index.html` behind an idempotent marker.
4. Extends both packaged and runtime-vendor copies of tldraw's native opacity stops with a validated `0%` option.
5. Repacks the ASAR while preserving the native-module unpack rules used by the app.
6. Saves the original ASAR once.
7. Updates Electron's ASAR integrity hash in `Info.plist`.
8. Ad-hoc signs and verifies the local app bundle.

### Package a local installer DMG

After applying and verifying the patch, create the polished local installer image:

```bash
./scripts/package-local-dmg.sh
```

The wrapper uses a `600x400` Finder window with the Retina `1200x800` background in `assets/` encoded at 144 DPI, positions the app and Applications link at `175,120` and `425,120`, verifies the staged app and disk image, and writes the artifact under `dist/`. The local patch uses an ad-hoc app signature; this DMG is intended for the same Mac unless you deliberately add a Developer ID signing and notarization release pass.

At runtime, the controller binds to the editor exposed by the desktop app as `window.editor`. It listens for document changes and treats ordinary `geo` shapes carrying `meta.cameraTour` as camera shots. Playback uses tldraw's native `editor.zoomToBounds` animation.

See [patch-instructions/architecture.md](./patch-instructions/architecture.md) for the full design.

## Camera-shot data

Each shot is an ordinary tldraw `geo` rectangle:

```js
meta: {
  cameraTour: {
    version: 1,
    order: 1,
    name: '01 — Context',
    createdAt: 1786865219890,
  },
}
```

Its page-space bounds are authoritative:

- `x` and `y` are the top-left focus-frame coordinates.
- `props.w` and `props.h` define the framing and zoom.
- The rectangle center becomes the focal point.
- The visible `richText` stays empty so labels do not leak into the presentation.

See [patch-instructions/camera-shot-contract.md](./patch-instructions/camera-shot-contract.md) before creating shots programmatically.

## Reapply, restore, and distribute

- Reapplying updates the injected source but does not overwrite the first ASAR backup.
- To return a local copy to its original runtime, follow [patch-instructions/restore.md](./patch-instructions/restore.md).
- Before publishing a release, follow [patch-instructions/release-checklist.md](./patch-instructions/release-checklist.md).
- Publish the patch source and instructions—not a third-party application bundle.

## Documentation

- [Patch guide index](./patch-instructions/README.md)
- [Architecture](./patch-instructions/architecture.md)
- [Apply the patch](./patch-instructions/apply.md)
- [Verify a build](./patch-instructions/verify.md)
- [Camera-shot contract](./patch-instructions/camera-shot-contract.md)
- [Restore the original runtime](./patch-instructions/restore.md)
- [Troubleshooting](./patch-instructions/troubleshooting.md)
- [Release checklist](./patch-instructions/release-checklist.md)

## Contributing

Keep the camera frame document-native, preserve the app's existing content and native-module layout, and test changes from a clean application copy. Include the target tldraw version, macOS version, reproduction steps, and whether the issue occurs after a full quit/relaunch.

Before opening a pull request:

```bash
node --check camera-upgrade/camera-tour.js
node --check camera-upgrade/patch-runtime.js
bash -n camera-upgrade/apply-camera-upgrade.sh
bash -n scripts/package-local-dmg.sh
```

Do not commit `.app` bundles, `app.asar` files, ASAR backups, Finder aliases, signing artifacts, or local Application Support data.

## Licensing and trademarks

Choose and add a repository license before public release. That license should cover only the original patch source and documentation. tldraw, Electron, and the patched application remain subject to their respective licenses and trademarks.
