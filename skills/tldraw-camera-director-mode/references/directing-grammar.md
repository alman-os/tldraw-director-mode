# Directing grammar for tldraw camera tours

Use this reference when inventing or revising the shot sequence, not for routine metadata edits.

## Plan narration beats

Write a compact internal shot plan before drawing frames:

| Order | Beat | Visual target | Shot scale | Narration purpose |
|---:|---|---|---|---|
| 1 | Establish | whole system | wide | orient the viewer |
| 2 | Problem | pain point | medium | create tension |
| 3 | Mechanism | key interaction | close | explain the change |
| 4 | Result | before/after or output | medium | demonstrate value |
| 5 | Recap | complete flow or CTA | wide | land the story |

Adapt the beats to the content. Three strong shots are better than eight repetitive ones.

## Place XY shot frames

Treat page coordinates as a spatial storyboard:

- Place separate scenes left-to-right when the narrative is sequential.
- Place supporting details below their parent scene when the narration drills down.
- Reuse the same center with progressively smaller rectangles for a deliberate zoom-in.
- Return to a wider rectangle after a close-up to restore context.
- Keep a consistent dominant movement direction. Avoid alternating long left/right jumps without narrative reason.

For a target content bounds `B` and desired aspect ratio `r`:

1. Expand `B` by 8–12% on every side for safe area.
2. Increase width or height—never shrink—to reach `r`.
3. Center the resulting rectangle on `B`.
4. Add more bottom safe area when captions or the presentation bar may cover content.

For 16:9 output, use `r = 16 / 9`. Capture the live viewport instead when the final recording will use the app window's actual aspect ratio.

## Compose for narration

- Keep one dominant idea per shot.
- Make essential labels readable at the shot's final zoom, not only when editing close-up.
- Keep the subject away from extreme edges and reserve breathing room for the cursor or pointer.
- Prefer camera movement between stable content islands over animating many shapes during narration.
- Preserve connector continuity. When a close shot clips an arrow, either include its meaningful endpoint or remove the partial connector from that composition.
- Use repeated visual anchors—title position, color, or a persistent overview—to help the viewer track spatial movement.

## Choose movement rhythm

The current Director Mode controller uses one global transition and one global hold value for the entire tour. Use the ranges below to choose that global rhythm. Treat beat-specific timing as narration notes only; do not present it as implemented per-shot behavior.

- **Cut-like move:** 200–450 ms for nearby variations or stepwise demos.
- **Standard glide:** 700–1100 ms for most explainer transitions.
- **Long travel:** 1200–1800 ms for distant canvas islands; use sparingly.
- **Hold:** roughly match the spoken beat. Start near 1.2 seconds for silent review, then adjust to narration.

Avoid extreme zoom ratios in consecutive shots. Insert a medium bridge shot when the viewer would otherwise lose orientation.

## Use reliable shot patterns

### Establish → detail → return

Open wide, zoom into the mechanism, then return wide with the mechanism's role now understood.

### Problem → intervention → result

Frame the undesirable state, travel to the new interaction, and finish on the changed output.

### Spatial walkthrough

Move consistently across several canvas islands as if following a map. Keep scale relatively stable so movement communicates sequence rather than importance.

### Progressive reveal

Use overlapping or nested frames around one composition. Each shot exposes a more specific relationship without moving the underlying shapes.

### Hero close

End on the product name, finished workflow, or call to action with fewer competing elements than the middle shots.

## Name shots as beats

Prefer names that explain why the camera stops there:

- `01 — Context`
- `02 — Friction`
- `03 — New interaction`
- `04 — Result`
- `05 — Try it`

Avoid generic labels such as `Camera 1`, coordinate strings, or names copied from shape ids. The list should be readable as a miniature narrative outline.
