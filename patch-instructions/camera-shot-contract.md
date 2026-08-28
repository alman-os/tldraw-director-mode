# Camera-shot contract

This contract is the compatibility boundary between saved `.tldraw` documents, Camera Director Mode, and any future agent or implementation.

## Canonical representation

A camera shot is an ordinary tldraw `geo` rectangle with empty visible text and this metadata:

```js
{
  meta: {
    ...existingMeta,
    cameraTour: {
      version: 1,
      order: 1,
      name: 'Opening',
      createdAt: 1786838400000,
    },
  },
}
```

Required semantics:

| Field | Meaning |
| --- | --- |
| `version` | Contract version. Currently `1`. |
| `order` | Numeric presentation order, ascending. |
| `name` | Director-panel label. It is not canvas text. |
| `createdAt` | Creation time in Unix milliseconds, used as stable provenance and a fallback tie-breaker. |

The rest of `shape.meta` must be preserved when adding or editing `cameraTour`.

## Geometry is the camera

The rectangle's page-space bounds define the shot:

- `x` and `y` locate the top-left of the framed region.
- Width and height determine the visible region and therefore the camera zoom.
- Moving or resizing the rectangle edits the shot directly.

Playback passes those page bounds to `editor.zoomToBounds(...)`. Do not introduce independent persisted `cameraX`, `cameraY`, or `zoom` values; they can drift away from the editable marker.

## Why `geo`, not `frame`

Camera markers must behave as lightweight visual guides, not semantic containers. tldraw frame shapes can adopt or influence nearby content. A plain rectangle avoids changing document hierarchy when a marker is moved or resized.

## Keep marker text empty

The shape's `richText` stays empty. The shot name is shown by the Director overlay, not centered inside the canvas marker. This keeps the drawing readable while recording and prevents label styling from becoming part of the framing contract.

## Ordering

Shots sort by `cameraTour.order` ascending. The current controller uses one-based values: the first captured shot is `1`, and a manual reorder rewrites the sequence as `1, 2, 3…`.

Order values only define relative position; gaps left after deletion are valid. Implementations should use a stable fallback for equal or malformed values. The current controller falls back to shape ID.

## Timing boundary

Transition duration and hold duration are global Director preferences. They are not part of `meta.cameraTour` version 1. A future per-shot timing feature requires a deliberate schema-version decision and backward-compatible defaults.

## Controller hooks

These selectors are the supported automation and UI-testing hooks:

| Selector | Purpose |
| --- | --- |
| `.ct-capture` | Capture the current camera as a new marker. |
| `.ct-present` | Enter presentation mode. |
| `.ct-play` | Start or pause playback from the Director panel. |
| `.ct-prev` | Go to the previous shot. |
| `.ct-next` | Go to the next shot. |
| `.ct-present-play` | Start or pause playback in presentation mode. |
| `.ct-exit` | Exit presentation mode. |

If the interface is restyled, preserve these hooks or update the verification tooling and this contract together.

## Compatibility rules

- Unknown metadata beside `cameraTour` must survive edits.
- Unknown future keys inside `cameraTour` should be preserved when practical.
- A malformed marker should be skipped or repaired without preventing the document from opening.
- Ordinary rectangles without `meta.cameraTour` are never shots.
- Shot data remains useful when the patch is absent: it is still a normal, editable rectangle in the document.
