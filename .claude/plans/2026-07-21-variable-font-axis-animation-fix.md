# Fix: Variable Font Axis (weight/width) Animation Failures

## Context

The panel consistently fails when a user asks it to animate variable-font axes like
**Font Axis Weight** and **Font Axis Width**. Confirmed root cause from the dev error log
(`.session/error-log.jsonl`, most recent entry 2026-07-21T17:35:57, Codex/gpt-5.6):

> Prompt: *"animate Font Axis Weight and Font Axis Width from low values up to their current value"*
> Error: `Can not add a property with name "ADBE Text VF Axis 1" to this PropertyGroup.`

The model tried `animatorProps.addProperty("ADBE Text VF Axis 1")`. **Variable-font axes cannot
be added by match-name.** AE 26.0+ added a dedicated method:

```javascript
var axisProp = animatorProps.addVariableFontAxis("wght"); // "wdth","slnt","ital","opsz"
axisProp.setValueAtTime(0, 100);
axisProp.setValueAtTime(2, 900);   // axis property holds ABSOLUTE axis values (e.g. wght 100–900)
```
(Adobe scripting docs: `PropertyGroup.addVariableFontAxis(axisTag)`, callable only on
`"ADBE Text Animator Properties"`.)

**Why the model keeps guessing wrong:** the knowledge corpus actively misleads it.
`src/js/lib/knowledge/data/text-properties.ts` lists `ADBE Text VF Axis 1`–`8` as type
`UNKNOWN_161` with **blank display names** under Text Animator Properties, which reads as
"addable via match-name." There is **no recipe** and **no gotcha** covering variable fonts
(confirmed by exploration). So every provider reinvents the wrong `addProperty` call.

**Outcome intended:** the model reliably emits `addVariableFontAxis(tag)`, knows each axis is
absolute-valued, and — because the context snapshot now reports the layer's real axes and
ranges — stops guessing tags/values.

## The Fix (4 parts, per "Core + snapshot" scope)

### 1. New verified recipe — `recipes/text/variable-font-axis-animation.json`

The primary fix. Injected on keyword match so the correct API reaches the model whenever a
variable-font animation is requested. Schema `{id, description, keywords[], script, notes}`
(see `recipes/text/text-layer-creation.json` for format). ES3, wrapped in an undo group.

Keywords: `variable font, font axis, weight, width, wght, wdth, slnt, opsz, addVariableFontAxis, variable font animation`.

Script (final content authored in the JSON, ES3):

```javascript
app.beginUndoGroup("Animate Variable Font Axes");
var comp = app.project.activeItem;
if (!(comp instanceof CompItem)) { throw new Error("Open a composition first."); }

var layer = null;
var sel = comp.selectedLayers;
var i;
for (i = 0; i < sel.length; i++) {
  if (sel[i] instanceof TextLayer) { layer = sel[i]; break; }
}
if (!layer) { throw new Error("Select a text layer first."); }

var animators = layer.property("ADBE Text Properties").property("ADBE Text Animators");
var animator = animators.addProperty("ADBE Text Animator");
animator.name = "Variable Font Axes";
var animatorProps = animator.property("ADBE Text Animator Properties");

if (typeof animatorProps.addVariableFontAxis !== "function") {
  throw new Error("Variable font axis scripting requires After Effects 26.0 or later.");
}

var startTime = layer.inPoint;
var endTime = Math.min(layer.inPoint + 1, layer.outPoint);
var animatedCount = 0;

function animateAxis(tag) {
  var axis;
  try { axis = animatorProps.addVariableFontAxis(tag); }
  catch (e) { return; } // font does not expose this axis
  var target = axis.value;                 // absolute current axis value
  var low = (axis.hasMin ? axis.minValue : target * 0.5);
  if (low >= target) { low = target * 0.5; }
  axis.setValueAtTime(startTime, low);
  axis.setValueAtTime(endTime, target);
  animatedCount++;
  // NOTE: fully keyframe each axis BEFORE adding the next — addProperty()/addVariableFontAxis()
  // invalidates sibling references (see gotcha "addProperty() Invalidates Sibling References").
}

animateAxis("wght");
animateAxis("wdth");

if (animatedCount === 0) {
  throw new Error("The layer's font has no weight/width axes — apply a variable font first.");
}
app.endUndoGroup();
```

`notes`: axis properties hold **absolute** values (not offsets); use `addVariableFontAxis(tag)`
never `addProperty("ADBE Text VF Axis N")`; keyframe each axis before adding the next.

Regenerate the catalog (isolated, safe path):
```bash
node scripts/generate-knowledge.mjs --recipes-source ./recipes
```
Then `git diff` to confirm only `recipes.ts` changed.

### 2. New gotcha — variable font axes

Add a section to the gotchas source `../ae-ai-starter/Scripts/verified/gotchas.md` (the
generator input for `gotchas.ts`). Gotchas ship in *static* context (always present), so this
is the always-on reinforcement:

> **Variable Font Axes Are Not Added by Match-Name.** `addProperty("ADBE Text VF Axis 1")`
> throws `Can not add a property with name ... to this PropertyGroup`. Use AE 26.0+
> `animatorProps.addVariableFontAxis(tag)` on `"ADBE Text Animator Properties"`, where `tag`
> is a 4-char axis tag (`wght`, `wdth`, `slnt`, `ital`, `opsz`). The returned property holds
> the **absolute** axis value. The layer's font must be a variable font. (Verified via the
> ae-ai-chat panel error log, 2026-07-21.)

Regenerate and stage **only** `gotchas.ts` (a bare regen reverts newer effect/property work,
per CLAUDE.md — review `git diff` and stage selectively):
```bash
node scripts/generate-knowledge.mjs   # then: git add -p src/js/lib/knowledge/data/gotchas.ts
```

### 3. Validator rule — reject the bad pattern pre-execution

`src/js/lib/knowledge/validator.ts` already has a generic `addProperty(...)` regex (line ~79)
and a `VALIDATOR_REJECTIONS` table. Add a check: if a script calls `addProperty` with a
match-name matching `/ADBE Text VF Axis \d/`, emit a **validation error** (blocks save) whose
message names the fix: *"Variable font axes cannot be added via addProperty. Use
animatorProps.addVariableFontAxis(\"wght\") (AE 26.0+)."* This catches the exact failure before
it ever reaches AE. Add a unit assertion alongside the existing validator tests.

### 4. Context-snapshot enrichment — report real axes to the model

`src/jsx/aeft/aeft.ts`, `getTextSummary()` (line 690). Currently reports `font`, `size`,
`justify`, `fill`, `text`. Extend it to append the font's variable-font axes so the model sees
exact tags/ranges/current values up front and never guesses. Resolution path (verified against
docsforadobe):

```javascript
// after reading `doc`:
try {
  var fontObj = doc.fontObject;                       // AE 24.0+
  if (!fontObj && app.fonts && app.fonts.getFontsByPostScriptName) {
    var matches = app.fonts.getFontsByPostScriptName(doc.font);
    if (matches && matches.length) fontObj = matches[0];
  }
  if (fontObj && fontObj.hasDesignAxes && fontObj.designAxesData) {
    var ax = fontObj.designAxesData;                  // [{name,tag,min,max,default}]
    var descs = [];
    for (var a = 0; a < ax.length; a++) {
      descs.push(ax[a].tag + "(" + ax[a].min + "-" + ax[a].max + ", def " + ax[a]["default"] + ")");
    }
    if (descs.length) parts.push("variableAxes=[" + descs.join(", ") + "]");
  }
} catch (e) {}
```

Guarded in try/catch so older AE / non-variable fonts degrade silently. This flows through the
single `getContextSnapshot()` call (no new bridge round-trip, per CLAUDE.md context rules).

## Files

| File | Change |
|------|--------|
| `recipes/text/variable-font-axis-animation.json` | **New** recipe (part 1) |
| `src/js/lib/knowledge/data/recipes.ts` | Regenerated (`--recipes-source ./recipes`) |
| `../ae-ai-starter/Scripts/verified/gotchas.md` | New gotcha section (part 2) |
| `src/js/lib/knowledge/data/gotchas.ts` | Regenerated; stage selectively |
| `src/js/lib/knowledge/validator.ts` | New rejection rule + unit test (part 3) |
| `src/jsx/aeft/aeft.ts` | `getTextSummary()` reports variable-font axes (part 4) |

Optional follow-up (not required for the fix): correct the misleading `UNKNOWN_161` / blank-name
`ADBE Text VF Axis N` rows in `text-properties.ts`. Sourced from the sibling `text-layer.json`;
leave for a deliberate corpus pass — the recipe + gotcha already override the bad signal.

## Verification

1. `pnpm typecheck` — types clean (aeft.ts + validator changes).
2. `pnpm recipes:check` — smoke-test keyword match + injection for the new recipe id.
3. Validator unit test: a script with `addProperty("ADBE Text VF Axis 1")` produces the new
   error; one with `addVariableFontAxis("wght")` does not.
4. `pnpm build && pnpm symlink`, restart AE, open the dev panel with a variable font
   (e.g. Shantell Sans / Inter variable) applied to a text layer.
5. Re-run the exact failing prompt: *"add a second Text Animator … animate Font Axis Weight and
   Font Axis Width from low values up to their current value."* Confirm it now runs, creates an
   animator with `wght`/`wdth` keyframes, and the post-run `## Last AI Action` diff shows the new
   keyframes. Confirm the context snapshot line shows `variableAxes=[wght(...), wdth(...)]`.
6. Optionally drive via the `/verify-loop` skill to promote the recipe once it passes live AE.
