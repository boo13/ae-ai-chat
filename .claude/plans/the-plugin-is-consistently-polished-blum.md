# Reapply the lost VF-axis text animator (safely), then harden

## Context

While verifying the variable-font fix, the panel ran the `variable-font-axis-animation`
recipe against the user's **real** "Catherine" text layer. Shortly after, when the user went
to adjust the resulting keyframes, After Effects crashed and lost that last set of animator
changes. The user wants those changes **reapplied first**.

I could not find a written AE crash report (checked macOS `DiagnosticReports`, Adobe
`CrashPadDumps`, the pending crash queue, and today's AE session log — none contained an AE
crash), so the cause is unconfirmed. But two mechanisms we introduced are plausible triggers,
and one must not be repeated on reapply:

- **Out-of-range axis value (primary suspect).** The recipe sets the low keyframe as
  `axis.hasMin ? axis.minValue : target * 0.5`. For the **width** axis, halving the current
  value (100 → 50) falls below most fonts' `wdth` minimum (~75–87.5), writing a keyframe
  outside the font's design range. AE re-instantiates the variable font on every keyframe
  edit/scrub, and invalid instances can crash the text engine.
- **Stacked duplicate animators.** Repeated verify runs left multiple identical
  "Variable Font Axes" animators on one layer; editing a keyframe recomposes the stack.

**Intended outcome:** restore one clean weight+width animator on "Catherine" using values
clamped to the font's real axis ranges (no out-of-range keyframes, no duplicate stacking), then
harden the shipped recipe so the panel never writes out-of-range values again.

## Step 1 — Reapply, clamped and single (do this first)

Run a **one-shot hardened script** (not the current recipe) via the dev panel over the CDP
driver (`scripts/ae-driver.mjs` `runJsxFile`/`evalES`), targeting the selected "Catherine"
layer. Logic (ES3, wrapped in one undo group):

1. Resolve the layer's font axes: read `Source Text` `.value`, get the `FontObject` via
   `doc.fontObject` (AE 24+) with `app.fonts.getFontsByPostScriptName(doc.font)[0]` fallback —
   the exact pattern already in `src/jsx/aeft/aeft.ts` `getVariableFontAxesSummary()`. Build a
   `tag -> {min, max, default}` map from `fontObject.designAxesData`.
2. **Before adding**, read existing animators; if a "Variable Font Axes" animator already
   exists, report it and do **not** blindly add another (avoid re-stacking). Only add one.
3. Add a single `ADBE Text Animator` named "Variable Font Axes".
4. For `wght` then `wdth`: `addVariableFontAxis(tag)`; `target = clamp(axis.value, min, max)`;
   `low = clamp(min, min, target)` (the font's real minimum — guaranteed in range, reads as
   "from low up to current"); if `low >= target`, nudge `low` toward `min` but never below it.
   `setValueAtTime(start, low)` / `setValueAtTime(end, target)`, then set **linear**
   interpolation explicitly. Fully keyframe each axis before adding the next (sibling-ref
   gotcha).
5. Guard the FontObject lookup in try/catch; if `designAxesData` is unavailable, fall back to
   the axis property's own `minValue`/`maxValue` and, only as a last resort, `target` itself
   (never a blind `* 0.5`).

Before running, verify the panel is reachable on CDP port 8862 (AE was likely relaunched after
the crash). Report the before/after animator + keyframe state to the user; do not stack.

## Step 2 — Harden the shipped recipe

Update `recipes/text/variable-font-axis-animation.json` to use the same clamp-to-`designAxesData`
logic (replace the `target * 0.5` fallback), set explicit linear interpolation, and guard against
adding a second identically-named animator when one already exists. Regenerate the corpus:

```bash
node scripts/generate-knowledge.mjs --recipes-source ./recipes   # then git diff recipes.ts
```

Optionally add a gotcha note: variable-font axis keyframes must stay within the font's
`designAxesData` [min,max] — out-of-range instances can crash AE's text engine on edit/scrub.

## Step 3 — Process fix (verification hygiene)

Future live verification must run against a throwaway comp/layer via the E2E harness
(`scripts/verify-e2e.mjs` + `fixtures/verify-scene.jsx`), never the user's real selected layer —
this is what caused edits to land on "Catherine" and left the stacked animators.

## Verification

- After Step 1: confirm exactly one "Variable Font Axes" animator on "Catherine", with
  `wght`/`wdth` keyframes whose values all sit within the font's `designAxesData` range; read
  them back and print min/max vs written values. Ask the user to adjust a keyframe and confirm
  AE stays stable.
- After Step 2: `pnpm test`, `pnpm typecheck`, `pnpm recipes:check`; re-run the prompt against a
  **scratch** layer and confirm no out-of-range values are written.
