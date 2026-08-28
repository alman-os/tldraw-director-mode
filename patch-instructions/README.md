# Patch instructions

This folder is the maintainer and contributor guide for applying, understanding, verifying, restoring, and releasing the tldraw Camera Director Mode patch.

## Start here

1. Read [architecture.md](./architecture.md) to understand the renderer injection and document model.
2. Follow [apply.md](./apply.md) against a clean, disposable copy of the app.
3. Complete both the static and runtime checks in [verify.md](./verify.md).
4. Use [troubleshooting.md](./troubleshooting.md) if the app, module, panel, or playback behaves unexpectedly.
5. Use [restore.md](./restore.md) to return the working copy to its original ASAR.

Anyone producing programmatic shot records must also follow [camera-shot-contract.md](./camera-shot-contract.md).

Before tagging or publishing the repository, complete [release-checklist.md](./release-checklist.md).

## Supported baseline

The current patch was built and verified against tldraw offline 1.13.2 for macOS. Treat other versions as unverified until the full checklist passes.

## Non-negotiable safety rule

Quit every tldraw offline process before patching or verifying a build. Multiple copies use the same bundle identifier and normally share the same user-data directory. A second copy can open a window owned by another runtime, which makes successful or failed checks misleading.

