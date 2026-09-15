# Task: author 5 glitch-effect recipe JSON files

Repo: /Users/randycounsman/Git/ae-ai-chat (branch feat/tutorial-mode, work directly on it, no new branch).

## Background

Recipes are composable ExtendScript (ES3) action snippets. Each lives as one JSON file in
`recipes/<category>/` with exactly this schema (5 keys, no more):

```json
{
  "id": "kebab-case-id",
  "description": "One sentence, present tense.",
  "keywords": ["lowercase", "keyword phrases", "for matching"],
  "script": "app.beginUndoGroup(\"Label\");\n... ES3 ExtendScript ...\napp.endUndoGroup();",
  "notes": "Explain the controls/defaults. End with the literal sentence 'Verification pending.' (this is required boilerplate for every new recipe until it's verified live in AE)."
}
```

Read these existing recipes as style/pattern references before writing anything:
- `recipes/effects/glow-treatment-stack.json` — simplest pattern: loop `comp.selectedLayers`, add
  effect, set values by matchName.
- `recipes/effects/effect-manipulation.json` — `addProperty` + `setValueAtTime` on an effect param.
- `recipes/effects/pixelate-transition-out.json` — expression assignment via `.expression = "..."`,
  a `quoteLayerName()` ES3-safe string-escaping helper, and `ADBE Slider Control` dial-in knobs.

## Hard ES3 / validator constraints (all of these are enforced by `src/js/lib/knowledge/validator.ts`
and WILL cause a build failure or rejection if violated — read that file if anything is unclear):

- `var` only. No `let`/`const`, no arrow functions (`=>`), no template literals (backticks), no
  spread/rest (`...`), no destructuring.
- File/script content must be **7-bit ASCII only** — no em-dashes, smart quotes, curly quotes,
  non-breaking spaces. Use straight quotes and plain hyphens everywhere, including in `notes` and
  `description`.
- `app.beginUndoGroup("Label")` ... `app.endUndoGroup()` must balance (exactly one pair per script,
  wrapping the whole body).
- Blend modes: use `BlendingMode.NORMAL`, `BlendingMode.ADD`, etc. (NEVER `BlendMode.*` — that
  global does not exist in the AE scripting API and will throw a ReferenceError).
- `.setValue([...])` arity must match the property's real type: COLOR props take **4** elements
  `[r,g,b,a]` each 0-1 (not 3); TwoD/TwoD_SPATIAL props take **2** elements `[x,y]`; ThreeD takes 3;
  OneD (sliders, checkboxes, enum dropdowns) takes a single number, never a string.
- Enum dropdown properties are **1-indexed integers** — never pass a UI label string like "Screen".
  Use the exact integer given in this spec.
- **`addProperty()` invalidates sibling property references on that same parade** — set each effect
  property's value (or grab it into a var) immediately after that effect's own `addProperty` call,
  before adding the next effect.
- **Layer index shifting**: `layer.duplicate()` inserts the new copy directly above the original and
  shifts every layer at/above that index. Never cache a layer by numeric index across a
  duplicate/addNull/addSolid/precompose call — always look the layer up by `comp.layer("Name")` (or
  keep the object reference returned directly by the call) after all such calls are done.
- Full property paths: to reach transform properties use
  `layer.property("ADBE Transform Group").property("ADBE Position")` — never a shortcut like
  `layer.property("Position")`.
- Guard preconditions and throw a clear `Error` message: `app.project.activeItem` must be a
  `CompItem`; `comp.selectedLayers.length >= 1` (throw "Select at least one layer." otherwise).
- Every script should loop over `comp.selectedLayers` (not just `selectedLayers[0]`) so it applies to
  every currently selected layer, except recipe 1 (RGB split) where the loop body itself creates 3
  duplicates per original selected layer.

## The 5 recipes to write

Create these 5 files. All match-names below are VERIFIED against the current AE effect catalog —
use them exactly as given (do not guess or "correct" a match-name; the suffixes are intentionally
non-sequential vs. UI order, e.g. Transform's Uniform Scale is `-0011` not `-0003`).

### 1. `recipes/effects/glitch-rgb-split.json`
id: `glitch-rgb-split`. Keywords should include phrases like "rgb split", "chromatic aberration",
"channel split glitch", "color fringe glitch".

For each layer currently in `comp.selectedLayers` (capture the list/count BEFORE duplicating anything,
since duplicating changes selection/indices):
1. `var original = <the layer>;`
2. `var green = original.duplicate();` then `var blue = original.duplicate();` — after both
   duplicates, rename: `original.name = original.name + " [R]"`; find the green/blue copies via the
   references already held (do NOT re-fetch by index) and name them `<baseName> + " [G]"` and
   `<baseName> + " [B]"` (compute baseName from the original layer's name before renaming it, or just
   use `original.name` prior to appending the suffix — pick one consistent approach, add a code
   comment only if the reasoning is non-obvious).
3. On the `[R]` layer (the original), add effect `ADBE Shift Channels` and set:
   - `-0001` (Take Alpha From) = `1` (Alpha)
   - `-0002` (Take Red From) = `2` (Red)
   - `-0003` (Take Green From) = `10` (Full Off)
   - `-0004` (Take Blue From) = `10` (Full Off)
4. On the `[G]` layer, add `ADBE Shift Channels` and set:
   - `-0001` = `1`, `-0002` = `10`, `-0003` = `3` (Green), `-0004` = `10`
5. On the `[B]` layer, add `ADBE Shift Channels` and set:
   - `-0001` = `1`, `-0002` = `10`, `-0003` = `10`, `-0004` = `4` (Blue)
6. Set blend modes via the layer's `blendingMode` property: `[B]` layer stays
   `BlendingMode.NORMAL` (it is the base/bottom of the stack); `[R]` and `[G]` layers get
   `blendingMode = BlendingMode.ADD`.
7. On `[R]` add effect `ADBE Geometry2` (the "Transform" effect) and set its Position property
   `-0002` (TwoD_SPATIAL, 2-element array) to `[comp.width / 2 + 8, comp.height / 2]`.
8. On `[G]` add `ADBE Geometry2` and set `-0002` Position to `[comp.width / 2 - 8, comp.height / 2]`.
9. Leave `[B]` with no Transform effect (it's the unshifted anchor).

Wrap the per-original-layer logic in a loop over the captured selected-layers array so it works for
multiple selected layers.

`notes`: explain this creates 3 layers per selected layer (R/G/B copies), recombined with ADD blend
modes; the Transform effect's Position on the [R]/[G] copies is the adjustable offset dial (drag it
in the Effect Controls panel to change the split distance); apply this recipe LAST if stacking with
other glitch recipes, since it works on layer duplicates, not the original layer's own effects stack.
End notes with "Verification pending."

### 2. `recipes/effects/glitch-block-tear.json`
id: `glitch-block-tear`. Keywords: "block tear", "datamosh", "digital tear", "glitch tear",
"pixel tear glitch".

For each layer in `comp.selectedLayers`, add (in this order, each via `addProperty` on
`layer.property("ADBE Effect Parade")`):
1. `ADBE Posterize Time` — set `-0001` (Frame Rate) = `12`.
2. `ADBE Slider Control` — name it `"Tear Amount"`, set its value property (`.property(1)`) = `40`.
3. `ADBE Turbulent Displace` — set:
   - `-0001` (Displacement) = `10` (this is the "Horizontal Displacement" enum value)
   - `-0002` (Amount): do NOT setValue directly — instead set
     `.expression = 'effect("Tear Amount")("Slider")'` (ES3-safe expression string, `var`-free is
     fine since it's a one-liner) so the slider drives it live.
   - `-0003` (Size) = `8`
   - `-0005` (Complexity) = `2`
   - `-0012` (Pinning) = `3` (Pin All)
   - `-0006` (Evolution): set `.expression = "time * 400"` for constant rolling motion.

Add the Slider Control BEFORE the Turbulent Displace effect so the expression can find it by name
immediately (matches AE's own effect-parade lookup by name at expression-eval time, order in the
parade doesn't actually matter for `effect("Name")`, but add it first anyway for readability).

`notes`: explain "Tear Amount" (0-100ish, default 40) is the one dial-in control, driving the
Turbulent Displace Amount via expression; Frame Rate 12 and Size 8 are fixed defaults tuned for a
blocky tear look, edit them directly on the effect if a different fps/block size is wanted. End with
"Verification pending."

### 3. `recipes/effects/glitch-time-stutter.json`
id: `glitch-time-stutter`. Keywords: "time stutter", "strobe glitch", "frame stutter",
"echo trail glitch", "choppy framerate".

For each layer in `comp.selectedLayers`:
1. `ADBE Slider Control` named `"Stutter FPS"`, value = `8`.
2. `ADBE Posterize Time`, set `-0001` (Frame Rate) via
   `.expression = 'effect("Stutter FPS")("Slider")'`.
3. `ADBE Echo`, set:
   - `-0001` (Echo Time (seconds)) = `-0.05`
   - `-0002` (Number Of Echoes) = `4`
   - `-0003` (Starting Intensity) = `1`
   - `-0004` (Decay) = `0.6`
   - `-0005` (Echo Operator) = `4` (Screen)

`notes`: "Stutter FPS" (default 8) is the dial-in control for how choppy the frame rate reads; Echo
adds 4 ghost-trail repeats decaying at 0.6, screen-blended. Lower Stutter FPS = choppier. End with
"Verification pending."

### 4. `recipes/effects/glitch-bad-tv.json`
id: `glitch-bad-tv`. Keywords: "bad tv", "vhs glitch", "analog glitch", "scanline glitch",
"tv static glitch".

For each layer in `comp.selectedLayers`:
1. `ADBE Wave Warp`, set:
   - `-0001` (Wave Type) = `1` (Sine)
   - `-0002` (Wave Height) = `6`
   - `-0003` (Wave Width) = `120`
   - `-0004` (Direction) = `90`
   - `-0007` (Phase): `.expression = "time * 180"`
2. `ADBE Slider Control` named `"Signal Noise"`, value = `15`.
3. `ADBE Noise HLS2`, set:
   - `-0001` (Noise) = `3` (Grain)
   - `-0003` (Lightness): `.expression = 'effect("Signal Noise")("Slider")'`
   - `-0004` (Saturation) = `5`
   - `-0005` (Grain Size) = `1.5`
   - `-0006` (Noise Phase): `.expression = "time * 48"`
4. `ADBE Venetian Blinds`, set:
   - `-0001` (Transition Completion) = `15`
   - `-0002` (Direction) = `0`
   - `-0003` (Width) = `4`
   - `-0004` (Feather) = `0`

`notes`: "Signal Noise" (default 15) is the dial-in control for HLS noise lightness; Wave Warp gives
the rolling analog warp, Venetian Blinds cuts thin scanline gaps (tune Transition Completion/Width or
delete that effect if scanlines read too strong/subtle). End with "Verification pending."

### 5. `recipes/effects/glitch-random-position.json`
id: `glitch-random-position`. Keywords: "random position glitch", "position jitter", "jitter glitch",
"random jump glitch", "position stutter".

For each layer in `comp.selectedLayers`:
1. `ADBE Slider Control` named `"Jitter"`, value = `24`.
2. Get `var position = layer.property("ADBE Transform Group").property("ADBE Position");` and set
   `position.expression` to exactly this ES3-safe multi-line string (build it with string
   concatenation or a template-literal-free multi-line JS string in the .json's `script` field —
   remember the JSON file itself just needs the string escaped with `\n`, the CONTENTS of the
   expression string are AE's expression-engine JS, which allows `var` freely but keep it ES3-style
   anyway for legacy-engine users):

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

Add the Jitter slider control BEFORE assigning the expression.

`notes`: "Jitter" (default 24px) controls the max random offset per jump; the expression gates jumps
to happen only ~35% of the time (`random() > 0.65`) via `posterizeTime(12)` so it reads as
intermittent snaps rather than continuous shake, not a smooth wiggle. End with "Verification pending."

## After writing the 5 files

Run these and fix anything they flag (do NOT proceed past a failure without fixing it):

```
node scripts/generate-knowledge.mjs --recipes-source ./recipes
git diff --stat src/js/lib/knowledge/data/recipes.ts
pnpm recipes:check
pnpm typecheck
```

`git diff --stat` on `recipes.ts` should show it changed (new recipes added) and nothing else in the
repo should have changed except that one generated file plus your 5 new JSONs. If
`generate-knowledge.mjs` reports a validation error (bad match-name, ASCII violation, unbalanced undo
group, non-lowercase keyword, etc.) fix the offending recipe JSON and rerun.

Do NOT create E2E fixture files (tests/e2e/*.json) — that will be handled separately. Do NOT run
`pnpm recipes:verify` (requires a live AE session that may not be available to you). Do NOT commit.

When done, report: which files you created, whether generate-knowledge/recipes:check/typecheck all
passed cleanly, and paste the exact `git diff --stat` output.
