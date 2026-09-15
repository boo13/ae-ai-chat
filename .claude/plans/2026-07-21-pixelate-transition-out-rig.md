# Plan: Pixelate Transition-Out Rig

## Context

The user wants a reusable **"pixelate transition-out"** that can be applied to a comp, with every
key feature broken out as an easy-to-dial-in control on a single control layer. Deliverable (per
user's answers): **author it as a composable recipe in the corpus AND run it live once** on the
currently-open comp to verify. The disappearance mechanic is a **true chunky reveal via Block
Dissolve**, driven by a **single `Progress` (0–100) slider** the user keyframes.

### The one mechanic that shapes the whole design
Effects apply to **layers, not comps**, and **Block Dissolve only genuinely removes content when it
sits on a real content layer** — on an adjustment layer, the dissolved blocks would just reveal the
un-pixelated layers below (no transition out). Therefore the rig **precomposes the comp's content
into one layer** and stacks the effects on that precomp layer. Mosaic is added *on top of* Block
Dissolve so the result reads as real pixelation (growing pixel blocks) rather than plain rectangular
block removal.

## Rig Structure (what the script builds)

Two layers are created in the target comp:

1. **`PIXELATE OUT - CONTROLS`** — a non-rendering control layer (Null, `guideLayer = true`). Holds
   all dial-in knobs as expression controls (`ADBE Slider Control` / `ADBE Checkbox Control`):
   - `Progress` (Slider, 0–100) — **the master driver; user keyframes this** 0→100 over the out-window.
   - `Max Block Size` (Slider, px, default ~48) — chunkiness at full pixelation. Drives both Mosaic
     block count and Block Dissolve block W/H so the removed chunks match the pixel chunks.
   - `Sharp Colors` (Checkbox, default 0) — Mosaic hard-edge color toggle.
   - `Fade Out` (Checkbox, default 1) — optional opacity fade layered over the dissolve tail.

2. **`PIXELATE OUT - CONTENT`** — the precomp of all original layers (`precompose(..., moveAllAttributes=true)`).
   Carries two effects, added in this stack order (top-to-bottom render order):
   - **`ADBE Mosaic`** (chunkify): `Horizontal Blocks` / `Vertical Blocks` ramp from comp-native
     fineness down to few big blocks as Progress rises; `Sharp Colors` from the control.
   - **`ADBE Block Dissolve`** (remove): `Transition Completion` ramps 0→100 (staggered to start
     after the pixelation reads); `Block Width`/`Block Height` = `Max Block Size`; `Soft Edges` off,
     `Feather` 0 for hard pixel edges.
   - Optional **Opacity** expression for the `Fade Out` toggle.

All layer/effect names are **ASCII-only** (ES3 `.jsx` parser silently rejects non-ASCII files).

## Expressions (referenced by name, ES3-safe with `var`)

Expressions read the control layer by name. Reuse the `quoteLayerName()` escaping helper pattern
from `recipes/animation/expression-follow-delay.json` when emitting the layer reference.

- **Mosaic Horizontal Blocks** (Vertical analogous with `height`):
  ```
  var c = thisComp.layer("PIXELATE OUT - CONTROLS");
  var p = c.effect("Progress")("Slider");
  var endBlocks = Math.max(1, Math.round(thisComp.width / Math.max(1, c.effect("Max Block Size")("Slider"))));
  Math.round(linear(p, 0, 100, thisComp.width, endBlocks));
  ```
- **Block Dissolve Transition Completion** (staggered so it pixelates first, then dissolves):
  ```
  var p = thisComp.layer("PIXELATE OUT - CONTROLS").effect("Progress")("Slider");
  linear(p, 50, 100, 0, 100);
  ```
- **Block Dissolve Block Width / Height**: `thisComp.layer("PIXELATE OUT - CONTROLS").effect("Max Block Size")("Slider")`
- **Opacity** (precomp layer): if `Fade Out` checkbox > 0, `linear(Progress, 70, 100, 100, 0)`, else `100`.

Stagger points (0/50/70/100) are sensible defaults and can be tuned; document them in recipe `notes`.

## Files to Create / Modify

- **`recipes/effects/pixelate-transition-out.json`** (new) — the recipe. Schema `{id, description,
  keywords[], script, notes}`; `keywords` lowercase. Script is flat `app.beginUndoGroup(...)` …
  `app.endUndoGroup()` (generator auto-wraps in try/finally via `normalizeUndoGroup()`). Templates to
  copy: `recipes/animation/wiggle-with-slider-controls.json` (slider control + expression) and
  `recipes/effects/effect-manipulation.json` (add effect + set values by matchName).
- **`src/js/lib/knowledge/data/recipes.ts`** (regenerated, committed) — via
  `node scripts/generate-knowledge.mjs --recipes-source ./recipes`. `git diff` before committing so
  only the new recipe appears.
- **`tests/e2e/pixelate-transition-out.json`** (new) — E2E fixture:
  ```json
  { "prompt": "Build a pixelate transition-out rig on the active comp: precompose the content, add a control layer with a Progress slider, and drive Mosaic + Block Dissolve so it pixelates and dissolves away. Then run the AI Action immediately.",
    "expectDiffContains": ["Keyframes changed"], "expectNoErrors": true }
  ```
  (Default reset scene `fixtures/verify-scene.jsx` leaves a solid selected — enough content to precompose.)

## Script authoring notes / edge cases (ES3)

- **Precompose:** `comp.layers.precompose(indexArray, "PIXELATE OUT - CONTENT", true)`. Build
  `indexArray` from **all current layer indices** (`1..comp.numLayers`) captured *before* creating
  the control layer. Guard `comp.numLayers < 1`.
- **Layer-index shifting:** `addNull()` / precompose insert at index 1 and shift others. Look up both
  created layers **by name after all creation is done** — never cache indices across a create call.
- **`addProperty()` invalidates sibling references:** set each effect property's value immediately
  after its own `addProperty`, or re-fetch by matchName. Effect/property matchNames (verified,
  AE 26.0 · 2026-03-13):
  - `ADBE Mosaic` → `-0001` Horizontal Blocks, `-0002` Vertical Blocks, `-0003` Sharp Colors
  - `ADBE Block Dissolve` → `-0001` Transition Completion, `-0002` Block Width, `-0003` Block Height,
    `-0004` Feather, `-0005` Soft Edges (Best Quality)
  - `ADBE Slider Control` (value = `.property(1)` / "Slider"), `ADBE Checkbox Control` (value = "Checkbox")
- **Control layer as Null + `guideLayer = true`** so it never renders; rename controls via `.name`.
- The script is ~100+ lines and self-contained → per the Pablo Protocol, **delegate the ES3 script
  authoring to Codex** (`delegate-codex`), then review for ES3 compliance and validator pass.

## Verification

1. **Static:** `node scripts/generate-knowledge.mjs --recipes-source ./recipes` (must pass
   `validateRecipeScript` — var-only, no arrow/template-literal/spread, ASCII, balanced undo group),
   then `pnpm recipes:check` (keyword match + injection for the new id) and `pnpm typecheck`.
2. **Live run (the "run it once" deliverable):** requires AE open, CEP debug on, dev panel open,
   remote-debug port `localhost:8862` reachable. Use `scripts/ae-driver.mjs`:
   - `ping()` to confirm the panel, then `runJsxFile(<abs path to exported recipe script>)` (or
     `pnpm recipes:export` then run the emitted `recipe-scripts/pixelate-transition-out.jsx`) to build
     the rig directly on the open comp, OR `window.__aeTest.runPrompt("<pixelate-out prompt>")` to
     exercise the full provider→`<ai-action>`→`runScriptFile` loop.
   - `screenshot(path)` at Progress ≈ 0 / 50 / 100 (temporarily set the slider) to confirm: crisp →
     chunky pixels → dissolved-away.
3. **E2E:** `pnpm verify:e2e` picks up `tests/e2e/pixelate-transition-out.json`; asserts
   `stateDiff` contains "Keyframes changed" and no runtime/expression errors (failure PNG lands in
   `.session/e2e-failures/`).
4. **Commit** the new recipe JSON, regenerated `recipes.ts`, and the E2E fixture together.

## Precondition to flag before the live run
AE must be running with the dev panel open and CEP remote debugging on port 8862. If it isn't, the
recipe + static verification still complete; the live run is deferred until the panel is reachable.
