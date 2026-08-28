---
name: tldraw-camera-director-mode
description: Direct narrated camera tours in tldraw offline boards with editable XY shot frames stored as document-native `meta.cameraTour` geometry. Use when turning a .tldraw board into a slideshow, presentation, product-release walkthrough, or YouTube explainer; adding, placing, resizing, naming, reordering, previewing, or debugging camera markers and shots; composing pans and zooms between canvas regions; or operating boards made with the tldraw camera-upgrade build.
---

# tldraw Camera Director Mode

Treat the infinite canvas as a stage and each camera shot as editable page geometry. Build a coherent visual route that a narrator can follow without sacrificing normal tldraw editing.

## Compose with the canvas operator

Use this skill together with `$tldraw-offline`. Read and follow `/Users/tomriddle/.codex/skills/tldraw-offline/SKILL.md` for document targeting, ownership, LAN-sharing safety, `/exec`, saving, screenshots, lints, and recovery from closed windows. This skill adds directing decisions and the camera-shot contract; it does not replace those rules.

Before creating or changing shots, read [references/camera-shot-contract.md](references/camera-shot-contract.md). When designing a narrative path or deciding placement, also read [references/directing-grammar.md](references/directing-grammar.md).

## Use the Director mental model

- Represent a shot with an ordinary `geo` rectangle carrying `meta.cameraTour`.
- Interpret shape `x` and `y` as the shot frame's top-left page coordinates—not the tldraw camera record's translation.
- Derive focus from the shot frame's center.
- Derive zoom from the shot frame's live width and height.
- Let users drag a shot to refocus, resize it to reframe, and style it with native tldraw controls.
- A shot may use `opacity: 0` when the recording must hide its border; zero opacity does not remove its page bounds or `meta.cameraTour` geometry.
- Store name and sequence in the document. Keep playback state and transient UI outside document records.
- Treat the shot list as narration beats, not as duplicated slide pages.

The key invariant is: **the editable frame is the camera state**. Do not create a second hidden camera payload that can drift out of sync.

## Direct a board

1. **Target safely.** Resolve the intended document by name or captured id. Read ownership, sharing state, existing shapes, and existing `meta.cameraTour` shots before writing.
2. **Probe Director Mode.** In the document's `/exec` context, check `document.querySelector('#camera-tour-shell')`. If present, use its controller for capture and presentation. If absent, retain the same shot-shape contract and preview shots with `editor.zoomToBounds`; do not patch the app or install a document script unless the user asks.
3. **Find the story.** Turn the requested narration into beats: establish context, introduce the subject, explain details, show consequence, and land on a recap or call to action. Prefer the smallest number of shots that makes the story legible.
4. **Compose content first.** Arrange the board into readable visual islands. Preserve existing content and bindings. Add shot frames around content rather than moving unrelated content merely to satisfy a camera path.
5. **Place shots.** Capture the current viewport when it already has the desired composition, or create a planned frame from target bounds. Maintain the intended output aspect ratio and safe area. Allow intentional overlap for progressive zooms.
6. **Name and order.** Use concise beat-oriented names such as `01 — Problem`, `02 — How it works`, `03 — Result`. Keep `order` numeric and contiguous.
7. **Preview the route.** Visit every shot in sequence with the native controller or `zoomToBounds`. Look for clipped labels, sudden scale jumps, toolbar/panel occlusion, accidental empty space, and distracting frame text.
8. **Verify once.** Re-read shot records and bounds, run `helpers.getLints()`, and capture a window screenshot when UI or framing matters. Save only local documents; let remote changes sync to their host.

## Reuse the slide-expansion and spacing loop

Use this loop whenever slide-like cards need to become a camera-ready spatial story. It generalizes the lessons from the 14-sequence slideshow workflow to any topic, while keeping the board editable and the camera route legible.

### Apply the composition loop

1. **Treat the latest user-edited draft as authoritative.** Preserve the exact copy, styles, live card proportions, and meaningful edits already present. If a reference slide establishes the visual language, measure its current page bounds and reuse those dimensions instead of inventing a new card system.
2. **Find the primary camera line.** Place the main beats in a dominant left-to-right sequence on a shared baseline. Keep a generous, consistent horizontal gap between primary cards so the camera can travel without clipping neighboring content or creating accidental visual noise.
3. **Expand the scene before directing it.** Give each card a visible breathing-room margin: the outer box should be materially larger than its text bounds, with consistent internal insets on every side. Preserve the established card ratio; when a card must grow, expand it evenly before changing typography. As a starting point, leave roughly 8–12% of the scene bounds as camera-safe breathing room, then verify against the actual text and UI.
4. **Split long cards by narration beat.** When a slide contains more than one logical paragraph or beat, keep the first paragraph with the primary card and create a subsequent continuation card below it. Align continuations to the parent card's x-position, or use a small deliberate offset; do not scatter them into an unrelated grid. Keep short, inseparable sentence pairs together, and keep a cohesive list together unless each item is intentionally its own narrated beat.
5. **Direct the camera through the local stack.** Order a parent card before its continuation cards, then move to the next primary card. The resulting route should feel like: establish the beat, move down for detail, return to the horizontal line, and advance. Prefer this predictable vertical drop-and-return over arbitrary zigzags.
6. **Preserve orientation across continuations.** Reuse the same visual system, title treatment, text scale, and box proportions. A small visible continuation cue is useful when it improves orientation, but keep camera shot names in `meta.cameraTour` rather than leaking them into the narrated card unless the user explicitly wants them visible.
7. **Reserve intentional empty space.** Leave room for video placeholders, captions, annotations, or UI-safe margins before adding shots. Empty space should support the next camera move; do not fill it with decorative shapes that compete with the narrated beat.
8. **Create shots around scenes, not hidden slide copies.** A continuation card is justified when it separates content into a clearer narrated beat. Do not duplicate all content for every camera shot. Use stable semantic shape ids, add a shot frame around the finished scene, and let the frame's bounds provide the actual focus and zoom.
9. **Use the smallest route that remains readable.** Split only when paragraph length, scale, or camera movement would otherwise make the scene hard to follow. A short slide can remain one scene; a dense slide can become a small vertical stack. The goal is narration clarity, not a fixed number of cards.
10. **Preview the whole rhythm.** Check the opening wide view, each primary-to-continuation move, each return to the anchor line, and the final recap or call to action. Look for clipped text, overly tight edges, excessive dead space, abrupt scale changes, and a camera path that crosses unrelated cards.

### Use this placement pattern

For a measured card width `cardW`, height `cardH`, horizontal gap `gapX`, and vertical gap `gapY`:

```text
primary(i)       = (cursorX, baselineY)
continuation(j)  = (primaryX + continuationOffsetX,
                    baselineY + cardH + gapY + j * (cardH + gapY))
next primary     = (cursorX + cardW + gapX, baselineY)
```

Choose gaps relative to the measured card rather than using arbitrary world units. A modest horizontal gap (often about 10–20% of `cardW`) and a clearly visible vertical gap (often about 10–25% of `cardH`) are useful starting points; adjust them whenever the card's actual content, output aspect ratio, or camera-safe area demands more room. Never let a continuation overlap the parent or make the next primary card ambiguous.

### Make the loop reusable across topics

- Derive the scene hierarchy from the narration: context, subject, example, mechanics, product, features, walkthrough, files, workflow fit, origin, offer, and related tools are examples—not a required topic-specific template.
- Keep exact user-provided wording when the board is being formatted. Reflow paragraphs spatially before rewriting them.
- Keep titles and body copy comfortably inside the expanded outer box. If text no longer fits, split the paragraph or grow the card before shrinking it below the established reading scale.
- Maintain a consistent baseline, card rhythm, and continuation offset across the presentation. Introduce a new layout pattern only when it communicates a deliberate change of chapter or emphasis.
- Give video or live-demo scenes visibly larger reserved space and avoid placing explanatory text where the recording will appear.
- Use shot names such as `01 — Establish`, `02 — Detail`, or `03 — Result` for the camera route, while keeping the canvas readable without relying on metadata.
- After editing, re-read the actual shape bounds and shot records, run lints, and inspect a screenshot. The route is complete only when both the document geometry and the narrated camera rhythm are coherent.

### Apply the section-intro cleanup pass

When a presentation has section headings or subtitle text repeated at the top of several cards, run this pass after the skeleton has been prepared. The visual goal is one clean, enlarged section-intro scene followed by content scenes that begin naturally with their actual narration.

1. **Choose geometry authorities in order.** Use the latest user-edited cards created while preparing the concept from the skeleton as the primary dimensions-and-position reference. Use the current section-01 and section-02 intro/content cards and their continuation cards as the live visual reference. If those disagree with older shapes, trust the latest edited reference and measure its page bounds; do not average dimensions from stale versions.
2. **Model each section as an intro plus a content stack.** Create or reuse exactly one `section-intro` card before the section's primary content card. Keep the intro on the horizontal camera line, use the reference card's outer dimensions, baseline, color, and breathing room, and derive the intro-to-content gap from the measured reference rather than arbitrary world units.
3. **Move the section heading, do not repeat it.** Take the exact section title or subtitle from the first card of the section and place it on the enlarged intro scene. Preserve the wording unless the user asks for copy editing. The intro may use a dedicated text shape or the card's visible text, but the section heading must appear only once in the narrated route.
4. **Remove heading text from content scenes.** Clear or remove the section title, subtitle, and slide-introduction text from the primary content card and every continuation card in that section. Preserve body paragraphs, bullets, video placeholders, annotations, and user-authored content. If a heading and body are fused into one rich-text shape, split the heading into the intro shape and rebuild the remaining body text without changing its wording.
5. **Keep continuation cards clean.** Continuations inherit the section's visual system but should not repeat the section heading at their top. Use spatial placement, paragraph flow, or a small non-heading continuation cue only when orientation truly needs it; keep the camera shot name in metadata/UI.
6. **Make the transformation idempotent.** Mark intro cards and titles with `meta.role: "section-intro"` and `directorScene.kind: "section-intro"`. Use stable semantic ids such as `bmks-section-03-intro-card`, `bmks-section-03-intro-title`, and `camera-shot-03-intro`. On a rerun, update the existing intro and clean existing content headings instead of creating duplicates.
7. **Normalize Director Mode at the same time.** Map each section as `section-intro → primary content → continuations`, assign contiguous numeric `cameraTour.order` values, and remove duplicate frames created by earlier partial passes. Set `directorTarget.index` to `0` for the intro, `1` for primary content, and `2+` for continuations. Move existing shot geometry whenever its target scene moves.
8. **Verify the visible result, not just metadata.** Confirm that every section has one enlarged intro, no content/continuation card carries the repeated section heading, the intro and content use the measured reference spacing, and the next section begins after the content stack. Run `helpers.getLints()` and inspect a screenshot at both an intro-to-content transition and a continuation-to-next-section transition.

Use this geometry pattern when the reference has measured bounds `(introX, introY, introW, introH)` and `(contentX, contentY, contentW, contentH)`:

```text
intro             = (introX, introY, introW, introH)
primary content   = (introX + introW + introGapX, baselineY, contentW, contentH)
next intro        = (contentX + contentW + sectionGapX, baselineY, introW, introH)
continuation(j)   = (contentX + continuationOffsetX,
                     baselineY + contentH + gapY + j * (continuationH + gapY))
```

Treat these as relationships, not fixed constants. Measure the reference cards and recompute the route so the same formatting system can be applied to another presentation topic, another card size, or another output aspect ratio.

## Operate the installed controller

When `#camera-tour-shell` exists, prefer its public UI contract rather than reimplementing playback:

- `.ct-launcher` — keep the persistent **Shots** launcher at the upper-left canvas edge (`top: 52px; left: 12px`) so it does not collide with tldraw's native upper-right style panel. The expanded Director panel remains right-anchored.
- `.ct-capture` — create a shot from the current viewport.
- `.ct-present` — enter presentation at the active shot.
- `.ct-play` — play from the first shot.
- `.ct-style-palette` — toggle tldraw's native right-side style palette without changing canvas selection or document state. Presentation hides that palette automatically.
- `.ct-prev` / `.ct-next` — navigate during presentation.
- `.ct-present-play` — toggle autoplay.
- `.ct-exit` — leave presentation.

Use `.click()` from `/exec` for deterministic operation. Read the resulting records instead of assuming the click succeeded. During interactive use, `Cmd/Ctrl+Shift+K` toggles the panel; arrows or Page Up/Page Down navigate; Space toggles playback; Escape exits.

## Preserve these guardrails

- Do not use a tldraw `frame` shape for a camera shot; frames can adopt or reparent enclosed content. Use `geo`.
- Do not persist raw `editor.getCamera().x/y` as the focus marker; those values are viewport translations, not page-space focal coordinates.
- Do not store shots only in `localStorage`; they must travel with the `.tldraw` document.
- Do not put the shot name in the rectangle's `richText`; centered text leaks into the narrated view. Keep `richText` empty and the name in metadata/UI.
- Do not replace a zero-opacity shot with text-only camera targeting. The invisible `geo` frame retains the intended aspect ratio and live bounds; text bounds usually produce an unintended close crop.
- Do not promise per-shot duration or hold settings with the current `cameraTour` v1 controller. Transition and hold are global tour preferences unless the user separately asks to extend the schema and player.
- Do not clear and redraw a page to regenerate shots. Create stable shot ids, update existing records, and preserve unrelated metadata.
- Do not duplicate all canvas content once per shot unless the user explicitly wants slide-like duplicates. Prefer one spatial story with camera movement.
- Do not silently add durable scripts or patch the app when the controller is absent. A direct preview is reversible; app/script installation is a separate request.

## Report the result

Name the document and page, report created or changed shot ids in order, summarize the camera path in one sentence, and give one verification result. Mention whether the installed controller was available or whether only document-native shot frames/direct preview were used.
