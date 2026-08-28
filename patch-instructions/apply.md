# Apply the patch

The safest workflow patches a disposable copy of tldraw Offline. Keep the downloaded application pristine so it can be used as a clean baseline for restoration and future rebases.

## Prerequisites

- macOS
- tldraw Offline 1.13.2 for the currently tested baseline
- Node.js with `npx`
- Xcode command-line signing tools (`codesign`)
- `/usr/libexec/PlistBuddy`, `plutil`, and `shasum`

The ASAR command may download `@electron/asar` through `npx` if it is not already cached.

## 1. Quit every tldraw copy

Close all tldraw Offline windows and quit every copy of the application before modifying or testing a bundle. Copies share the same bundle identifier and may share user data, renderer state, and local services.

Do not leave the original app running while opening the patched copy.

## 2. Create a disposable app copy

From the repository root:

```bash
mkdir -p "$HOME/Applications"
ditto "/Applications/tldraw offline.app" \
  "$HOME/Applications/tldraw Camera Director.app"
```

`ditto` preserves the macOS bundle structure and metadata more reliably than copying individual contents.

## 3. Apply the patch

Pass the app path explicitly:

```bash
./camera-upgrade/apply-camera-upgrade.sh \
  "$HOME/Applications/tldraw Camera Director.app"
```

On success, the script prints the patched app path, backup path, and calculated ASAR hash.

## 4. Launch only the patched copy

```bash
open "$HOME/Applications/tldraw Camera Director.app"
```

Continue with [Verification](verify.md) before using the patched app for important documents.

## What the script changes

Inside the target app bundle, it modifies:

- `Contents/Resources/app.asar`
- `Contents/Resources/app.asar.unpacked/` for the preserved native dependencies
- `Contents/Info.plist` for the new ASAR integrity hash
- The application code signature

It also creates this one-time backup:

```text
Contents/Resources/app.asar.before-camera-upgrade
```

The backup is intentionally not overwritten on later runs. If the target bundle has already been modified by another patch, use a new copy of the original application rather than assuming that backup is pristine.

## Reapplying

The HTML injection is marker-based and idempotent. Reapplying updates the injected JavaScript and CSS without duplicating their tags. Still, use a clean application copy when testing a new Offline release so old bundle state cannot hide a packaging regression.

To update the currently installed `/Applications` build after changing this repository:

```bash
./camera-upgrade/apply-camera-upgrade.sh \
  "/Applications/tldraw offline.app"
```

To update the recommended user-owned disposable build:

```bash
./camera-upgrade/apply-camera-upgrade.sh \
  "$HOME/Applications/tldraw Camera Director.app"
```

In either case, quit every copy first, pass the absolute application path, and relaunch only that target after the script completes.
