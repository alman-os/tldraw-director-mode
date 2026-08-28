# Release checklist

Use this checklist when publishing the patch, rebasing it onto a tldraw Offline update, or handing it to another maintainer.

## Scope and baseline

- [ ] Record the exact tldraw Offline version, macOS version, and CPU architecture tested.
- [ ] Start from a clean application copy rather than a previously patched bundle.
- [ ] Review upstream renderer paths and editor APIs for changes.
- [ ] Confirm the documented limitations still match the implementation.

## Source quality

- [ ] Run `node --check camera-upgrade/camera-tour.js`.
- [ ] Run `node --check camera-upgrade/patch-runtime.js`.
- [ ] Run `bash -n camera-upgrade/apply-camera-upgrade.sh`.
- [ ] Run `bash -n scripts/package-local-dmg.sh`.
- [ ] Confirm HTML injection remains marker-based and idempotent.
- [ ] Confirm the patch targets the existing `out/renderer/assets/` directory.
- [ ] Confirm native-module unpack patterns are preserved.
- [ ] Confirm `Resources/vendor-modules/tldraw.js` contains the six opacity stops beginning at `0`.
- [ ] Confirm the literal slash-containing plist key is updated with `PlistBuddy`.

## Camera-shot compatibility

- [ ] Captured markers are ordinary `geo` rectangles.
- [ ] Marker `richText` remains empty.
- [ ] Existing shape metadata survives shot edits.
- [ ] Movement and resizing change playback framing immediately.
- [ ] Orders persist as one-based integers, and gaps still sort correctly after deletion.
- [ ] Transition and hold timing remain global unless the contract is deliberately versioned.
- [ ] Documents containing camera markers still open without the patch.

## Package verification

- [ ] The ASAR contains `camera-tour.js`, `camera-tour.css`, and the injected index marker.
- [ ] The calculated ASAR SHA-256 equals the plist integrity hash.
- [ ] `codesign --verify --deep --strict` succeeds.
- [ ] The one-time backup is created and not silently overwritten.
- [ ] Restoration has been tested on a disposable app copy.

## Runtime acceptance

- [ ] Only the patched app copy is running during verification.
- [ ] Capture, rename, reorder, delete, previous, and next all work.
- [ ] Presentation entry, autoplay, pause, and exit all work.
- [ ] Manual pan or zoom cleanly interrupts automated movement.
- [ ] Save, close, and reopen preserves shot data.
- [ ] Light and dark appearances remain readable.
- [ ] The upper-left **Shots** launcher remains clear of tldraw's upper-right style panel.
- [ ] The opacity slider's first stop writes exactly `opacity: 0` and its accessible label reads `0%`.
- [ ] **Hide style palette** persists locally, and presentation hides the palette automatically.
- [ ] A multi-shot demo document completes without renderer errors.

## Repository hygiene

- [ ] No `.app`, `.asar`, `.asar.unpacked`, backup ASAR, Finder alias, log, or local user data is tracked.
- [ ] `git status --short` contains only intended source and documentation changes.
- [ ] All relative Markdown links resolve.
- [ ] README commands work when copied from the repository root.
- [ ] Screenshots or videos contain no private documents or account data.
- [ ] The repository declares an intentional source license before public distribution.
- [ ] The README identifies the project as an unofficial patch and handles tldraw trademarks accurately.

## Release handoff

- [ ] Add concise release notes describing changes and known limitations.
- [ ] Attach source archives or checksums only after the final verification pass.
- [ ] Tag the tested patch revision and record its supported tldraw baseline.
- [ ] Link maintainers to [Architecture](architecture.md), [Camera-shot contract](camera-shot-contract.md), and [Troubleshooting](troubleshooting.md).
