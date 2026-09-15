# Plan: Glitch Effects Recipe Set

## Context

The user wants a **set of glitch effects they can apply to a layer**, built either by prompting the
in-app panel or by driving the plugin directly. Per their answers, the deliverable is: **five
separate, stackable recipes** (not one master control rig) authored in the corpus, regenerated into
the knowledge data, and **verified live once in AE** — the same author→regenerate→live-verify
pattern already used for `pixelate-transition-out`. Each recipe applies to the **currently selected
layer(s)** with sensible baked defaults plus one or two dial-in controls, and any combination can be
stacked.

The five looks the user chose:

1. **RGB / chromatic split** — signature color-fringe (channels offset apart).
2. **Digital block / datamosh tear** — horizontal torn bands.
3. **Time stutter / strobe** — choppy framerate + echo trails.
4. **Bad-TV / VHS analog** — wavy warp + chroma noise + scanlines.
5. **Random positioning** — jittery position jumps.

All effects below are **[VERIFIED]** (AE 26.0, 2026-03-13) with match-names/enums pulled from
`src/js/lib/knowledge/data/effects-detail.ts` + `property-matchnames.ts`. No third-party
(Mettle/other) effects are used — everything is built-in AE or Cycore-standard, so the recipes are
portable. Match-name suffixes are **non-sequential** vs. UI order (e.g. `ADBE Geometry2` Position is
`-0002`, Uniform Scale is `-0011`) — the exact suffixes are listed per-recipe below; do not construct
`-000N` from index.

## Deliverable pattern (mirrors pixelate-transition-out)

For each of the 5 looks:
- A recipe JSON in **`recipes/effects/glitch-<look>.json`** — schema `{id, description, keywords[],
  script, notes}`, `keywords` all-lowercase. Script is flat `app.beginUndoGroup("…")` …
  `app.endUndoGroup()` (the generator auto-normalizes the undo group).
- `notes` ends with the phrase **"Verification pending."** so `verifiedStatus` derives to `pending`;
  `pnpm recipes:verify` promotes it (strips the phrase) after a live PASS.
- An E2E fixture in **`tests/e2e/glitch-<look>.json`** — `{prompt, expectDiffContains[], expectNoErrors}`.

Then regenerate the corpus and verify (see Verification).

## The five recipes (concrete match-names + enum values)

Common preamble for every recipe: guard active comp is a `CompItem` with `comp.selectedLayers.length
>= 1` (throw a clear error otherwise), then loop over `comp.selectedLayers`. ES3 only (`var`, no
arrow/template/spread), ASCII-only, blend modes via `BlendingMode.*` (never `BlendMode.*`). Add each
effect via `layer.property("ADBE Effect Parade").addProperty("<matchName>")`, and **set each
property immediately after its own `addProperty`** (addProperty invalidates sibling references).

### 1. `glitch-rgb-split`
For each selected layer, build a 3-instance channel-split group (the reliable, fully adjustable
chromatic-aberration technique — a single-effect alternative like `ADBE 3D Glasses2` or
`CC Color Offset` is noted in `notes` but the duplicate method gives independent R/G/B control):
- `layer.duplicate()` twice → 3 instances; look up by name after all duplication (duplicate inserts
  directly above the original — never cache indices across a duplicate call). Name them
  `<name> [R]`, `<name> [G]`, `<name> [B]`.
- Each copy gets **`ADBE Shift Channels`** to isolate one channel. Enum map (all four props share it):
  `{Alpha:1, Red:2, Green:3, Blue:4, Luminance:5, Hue:6, Lightness:7, Saturation:8, Full On:9, Full Off:10}`.
  - `[R]`: `-0002` Take Red From = Red(2); `-0003` Take Green From = Full Off(10); `-0004` Take Blue From = Full Off(10); `-0001` Take Alpha From = Alpha(1).
  - `[G]`: `-0003`=Green(3), `-0002`=Full Off(10), `-0004`=Full Off(10), `-0001`=Alpha(1).
  - `[B]`: `-0004`=Blue(4), `-0002`=Full Off(10), `-0003`=Full Off(10), `-0001`=Alpha(1).
- Recombine via blend mode: `[B]` copy stays `BlendingMode.NORMAL` (base); `[R]` and `[G]` set to
  `BlendingMode.ADD`.
- Offset via the **Transform effect `ADBE Geometry2`** on `[R]` and `[G]`: set Position `-0002`
  (TwoD_SPATIAL, arity 2) to `[thisComp.width/2 + dx, thisComp.height/2]` and `[… - dx, …]`
  respectively (default `dx = 8`). Baked numeric values (`comp.width/2 ± 8`) so no cross-layer
  expression is needed; the user tweaks the Transform Position to taste.
- `notes`: explain it creates 3 layers, ADD-blends them, apply this look **last** when stacking; and
  the one-effect alternatives.

### 2. `glitch-block-tear`
On each selected layer, add (top-to-bottom effect order):
- **`ADBE Posterize Time`** — `-0001` Frame Rate = 12 (so tears jump in discrete steps).
- **`ADBE Turbulent Displace`** — `-0001` Displacement = **Horizontal Displacement (10)**;
  `-0002` Amount = 40; `-0003` Size = 8 (small = fine bands); `-0005` Complexity = 2;
  `-0012` Pinning = Pin All(3); `-0006` Evolution = expression `time*400` for constant motion.
- One dial-in: add an `ADBE Slider Control` named `Tear Amount` (default 40) on the layer and drive
  Turbulent Displace `-0002` Amount via expression `effect("Tear Amount")("Slider")`.

### 3. `glitch-time-stutter`
On each selected layer, add:
- **`ADBE Posterize Time`** — `-0001` Frame Rate driven by an `ADBE Slider Control` `Stutter FPS`
  (default 8): expression `effect("Stutter FPS")("Slider")`.
- **`ADBE Echo`** — `-0001` Echo Time (sec) = -0.05; `-0002` Number Of Echoes = 4;
  `-0003` Starting Intensity = 1; `-0004` Decay = 0.6; `-0005` Echo Operator = **Screen(4)**
  (enum `{Add:1, Maximum:2, Minimum:3, Screen:4, Composite In Back:5, Composite In Front:6, Blend:7}`).

### 4. `glitch-bad-tv`
On each selected layer, add:
- **`ADBE Wave Warp`** — `-0001` Wave Type = Sine(1); `-0002` Wave Height = 6; `-0003` Wave Width = 120;
  `-0004` Direction = 90; `-0007` Phase = expression `time*180` (rolling signal).
- **`ADBE Noise HLS2`** — `-0001` Noise = Grain(3); `-0003` Lightness driven by an `ADBE Slider
  Control` `Signal Noise` (default 15); `-0004` Saturation = 5; `-0005` Grain Size = 1.5;
  `-0006` Noise Phase = expression `time*48` (animated static).
- **`ADBE Venetian Blinds`** (subtle scanlines) — `-0001` Transition Completion = 15; `-0002`
  Direction = 0 (horizontal lines); `-0003` Width = 4; `-0004` Feather = 0. `notes`: this cuts thin
  transparent scanline gaps; on a transparent layer it reads as thin lines — tune Completion/Width,
  or delete it if unwanted.

### 5. `glitch-random-position`
On each selected layer: add an `ADBE Slider Control` named `Jitter` (default 24), then set a
Position expression on `layer.property("ADBE Transform Group").property("ADBE Position")`
(full path per ES3 rules). ES3-safe, 2D/3D-safe, with a burst gate so it jumps intermittently:
```
seedRandom(index, true);
posterizeTime(12);
var amp = effect("Jitter")("Slider");
var p = value;
if (random() > 0.65) {
  var nx = p[0] + random(-amp, amp);
  var ny = p[1] + random(-amp, amp);
  p.length > 2 ? [nx, ny, p[2]] : [nx, ny];
} else {
  value;
}
```
(Add the `Jitter` slider *before* assigning the expression that references it.)

## Files to create / modify

- **`recipes/effects/glitch-rgb-split.json`**, **`glitch-block-tear.json`**,
  **`glitch-time-stutter.json`**, **`glitch-bad-tv.json`**, **`glitch-random-position.json`** — new.
  Templates to copy: `recipes/effects/glow-treatment-stack.json` (add-effect + setValue-by-matchName
  over `selectedLayers`) and `recipes/effects/pixelate-transition-out.json` (expression assignment +
  slider controls + `quoteLayerName` pattern if any cross-layer reference is needed).
- **`tests/e2e/glitch-*.json`** (5 new) — e.g. block-tear:
  `{"prompt":"Add a digital block/datamosh glitch tear to the selected layer, then run the AI Action immediately.","expectDiffContains":["Effects on"],"expectNoErrors":true}`.
  RGB split asserts `["Layers added"]`; random-position asserts `["Expressions changed"]`; stutter and
  bad-tv assert `["Effects on"]`. The default `fixtures/verify-scene.jsx` leaves a solid selected —
  enough content for every recipe (RGB split duplicates it; the others just add effects/expressions).
- **`src/js/lib/knowledge/data/recipes.ts`** — regenerated (committed) via
  `node scripts/generate-knowledge.mjs --recipes-source ./recipes`; `git diff` to confirm only the 5
  new recipes appear.

Per the Pablo Protocol, the bulk ES3 script authoring across these 5 files is a self-contained
multi-file change → **delegate the script bodies to Codex** (`delegate-codex`), then I review each
for ES3/ASCII compliance, correct match-names/enums, and validator pass before regenerating.

## Verification

1. **Static:** `node scripts/generate-knowledge.mjs --recipes-source ./recipes` (must pass
   `validateRecipeScript`: var-only, no arrow/template/spread, ASCII, balanced undo group, known
   effect + property match-names, correct setValue arity, valid enum integers). Then
   `pnpm recipes:check` (keyword match + injection for the 5 new ids) and `pnpm typecheck`.
2. **Live verify + promote (the "verify live" deliverable):** requires AE running, the **AE AI Chat
   (dev)** panel open, and CEP debug mode on (remote-debug port `localhost:8862` reachable). Run
   `pnpm recipes:verify` (drives pending recipes against `fixtures/verify-scene.jsx` via
   `scripts/ae-driver.mjs`; PASS = no runtime/expression error + a real state change; it auto-strips
   "Verification pending." from `notes` on pass). Iterate a single one with
   `pnpm recipes:verify --only glitch-block-tear`. For a visual check, `pnpm recipes:export` then
   `scripts/ae-driver.mjs` `runJsxFile(recipe-scripts/glitch-*.jsx)` and `screenshot()`.
3. **E2E:** `pnpm verify:e2e` picks up the new `tests/e2e/glitch-*.json`, running each prompt through
   the real provider→`<ai-action>`→`runScriptFile` loop and asserting `stateDiff`/no-errors (failure
   PNGs land in `.session/e2e-failures/`).
4. **Regenerate + commit** the 5 recipe JSONs (with pending phrases stripped by the verify step), the
   regenerated `recipes.ts`, and the 5 E2E fixtures together.

## Precondition to flag before the live step
AE must be running with the dev panel open and CEP debug on port 8862, and a provider configured in
the panel (for the E2E prompt path). If it isn't reachable, steps 1 (static) and the recipe authoring
still complete fully; the live verify/promote (step 2) and E2E (step 3) are deferred until the panel
is up, and the recipes ship as `pending` until then.

## Applying it right now (alternative fast path)
If the user just wants the glitch applied to their currently-selected layer immediately (no corpus
work), the same scripts can be pushed straight into live AE via `scripts/ae-driver.mjs`
(`connect()` → `runJsxFile(absPath)`), or handed over as a pasteable `<ai-action run="true">` block.
The recipe route above is the durable/product path and is what this plan executes.
