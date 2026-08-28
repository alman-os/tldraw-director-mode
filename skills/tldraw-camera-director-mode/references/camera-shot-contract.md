# Camera shot contract

Use this contract for every Director Mode board. It matches the camera-upgrade controller while remaining valid when shots are created directly through `/exec`.

## Canonical record

Create an ordinary `geo` rectangle. Keep the visible rectangle label empty; store Director data in `meta.cameraTour`.

```js
{
  id: 'shape:camera-shot-<stable-key>',
  type: 'geo',
  x: 120, // top-left page X
  y: 240, // top-left page Y
  opacity: 0.42,
  props: {
    geo: 'rectangle',
    w: 1280,
    h: 720,
    color: 'violet',
    fill: 'none',
    dash: 'dashed',
    size: 'm',
    font: 'sans',
    align: 'middle',
    verticalAlign: 'middle',
    richText: toRichText(''),
  },
  meta: {
    cameraTour: {
      version: 1,
      order: 1,
      name: '01 — Establish context',
      createdAt: 1786865219890,
    },
  },
}
```

Required fields are `version`, `order`, and `name`. `createdAt` is recommended for new shots. Preserve any other `shape.meta` keys during updates.

## Geometry semantics

- `x`, `y`: shot rectangle top-left in current-page coordinates.
- `props.w`, `props.h`: shot extent. Larger extent produces a wider view; smaller extent produces a closer view.
- focus: center of `editor.getShapePageBounds(shape)`.
- playback: `editor.zoomToBounds(bounds, { inset, animation })`.
- order: ascending numeric `meta.cameraTour.order`, then stable id as a tie-breaker.

Do not store a separate center or zoom in metadata. Moving or resizing the rectangle must immediately redefine the shot.

## Create a planned shot

Run inside the target document's `/exec` context:

```js
const { createShapeId, toRichText } = await import('tldraw')
const id = createShapeId('camera-shot-problem')

if (!editor.getShape(id)) {
  editor.createShape({
    id,
    type: 'geo',
    x: 120,
    y: 240,
    opacity: 0.42,
    props: {
      geo: 'rectangle',
      w: 1280,
      h: 720,
      color: 'violet',
      fill: 'none',
      dash: 'dashed',
      size: 'm',
      font: 'sans',
      align: 'middle',
      verticalAlign: 'middle',
      richText: toRichText(''),
    },
    meta: {
      cameraTour: {
        version: 1,
        order: 1,
        name: '01 — Problem',
        createdAt: Date.now(),
      },
    },
  })
}
```

Use stable semantic ids when generating a known plan. Use a time/random suffix only for genuinely ad-hoc captures.

## Read and sort shots

```js
const shots = editor
  .getCurrentPageShapes()
  .filter((shape) => shape.meta?.cameraTour?.version === 1)
  .sort((a, b) =>
    (Number(a.meta.cameraTour.order) || 0) -
      (Number(b.meta.cameraTour.order) || 0) ||
    a.id.localeCompare(b.id)
  )
```

Scope the list to the current page. A board may have a separate tour on each page.

## Update metadata safely

```js
const data = shape.meta.cameraTour
editor.updateShape({
  id: shape.id,
  type: shape.type,
  meta: {
    ...shape.meta,
    cameraTour: { ...data, name: '02 — Mechanism', order: 2 },
  },
})
```

Renumber all shots to `1..N` after reordering. Do not replace the entire `meta` object.

## Preview and control

Preview one shot directly:

```js
const bounds = editor.getShapePageBounds(shot)
if (bounds) {
  editor.zoomToBounds(bounds, {
    inset: 28,
    animation: {
      duration: 900,
      easing: (t) =>
        t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    },
  })
}
```

Probe and use the installed controller:

```js
const shell = document.querySelector('#camera-tour-shell')
if (shell) document.querySelector('.ct-capture')?.click()
```

The controller owns transition/hold/loop preferences locally and currently applies one transition and one hold value to the whole tour. Shot geometry, names, and order remain document-native. Do not add `duration` or `hold` fields to `cameraTour` v1 or claim per-shot timing unless the controller and contract are deliberately extended together.

## Verify

Check all of the following before reporting success:

1. Every shot is type `geo` and has `meta.cameraTour.version === 1`.
2. Orders are unique and contiguous from `1`.
3. Names are non-empty.
4. Bounds exist and have positive width and height.
5. `richText` is empty on the camera rectangles.
6. A direct `zoomToBounds` or installed-controller visit reaches the intended content.
7. `helpers.getLints()` has no actionable results.
