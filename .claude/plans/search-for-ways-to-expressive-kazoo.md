# Fix: verify_expressions.jsx fails in AE at line 41

## Context

The 5-phase context-improvement plan was implemented (ae-ai-chat `77e7311`, ae-ai-starter `4b73d28`; typecheck + 50 unit tests pass locally). The first manual AE checkpoint — running `Scripts/verified/tools/verify_expressions.jsx` via File > Scripts — fails with "unable to execute script at line 41".

**Root cause (diagnosed):** property-reference invalidation in `buildHosts()` (`ae-ai-starter/Scripts/verified/tools/verify_expressions.jsx:21-60`). Line 39 stores `pathGroup` (rect shape group), line 40 adds a sibling (`ADBE Vector Filter - Trim`) to the same `groupContents`, which invalidates the `pathGroup` reference; line 41 (`pathGroup.property("ADBE Vector Rect Size")`) then throws "Object is invalid". Same latent bug for `hosts.scalar`/`hosts.point` (slider ref captured at line 23, Point Control added to the same Effect Parade at line 26, ref used at line 107) and the text/camera/light control refs. This is the same reference-invalidation family as the repo's documented layer-index-shifting gotcha: capture references only *after* all creation is complete. Secondary: trailing commas in the `hosts` object literal (lines 51-58) are ES5 — risky in ExtendScript's ES3 parser.

**Execution mode (user-directed): Codex `gpt-5.6-sol` implements; Claude orchestrates and verifies only.**

## Plan

1. **Delegate to Codex** (`codex exec -m gpt-5.6-sol` in `/Users/randycounsman/Git/ae-ai-starter`) with this brief:
   - In `Scripts/verified/tools/verify_expressions.jsx`, restructure `buildHosts()` into two passes: pass 1 creates all layers, effects, and shape operators (no property references retained); pass 2 freshly looks up every host property (by layer → `ADBE Effect Parade` → effect name → `property(1)`, and shape group re-walk) and applies the `setValueAtTime` keyframes, then returns `hosts`. No stale references may survive an intervening `addProperty` on the same parent.
   - Remove trailing commas in object literals; keep the file strictly ES3 + ASCII (matching `discover_effect.jsx` conventions).
   - Add a `step` string updated before each build stage, and wrap the main body so failures alert `step + ": " + e.toString()` — the remaining manual AE checkpoints become self-diagnosing instead of "line 41".
   - Audit the two other new tools from commit `4b73d28` (`verify_corpus.jsx`, `discover_global_enums.jsx`) for the same stale-reference-after-addProperty pattern and trailing commas; fix if present.
2. **Verify (Claude, cheap static checks only — ExtendScript can't run outside AE):** `LC_ALL=C grep -n '[^ -~]'` for non-ASCII, grep for ES3 violations and trailing commas, read the diff for correctness of the two-pass structure.
3. **Commit + push** in ae-ai-starter (Codex sandbox may not push; Claude finishes the push per git rules).
4. **Manual checkpoint (user):** re-run `verify_expressions.jsx` in AE. On success it writes `Scripts/verified/expressions/verification/verify-<version>.json` and alerts a record count; then regenerate (`node scripts/generate-knowledge.mjs` in ae-ai-chat) to fold verification results into `data/expressions.ts`.

## Files

- `ae-ai-starter/Scripts/verified/tools/verify_expressions.jsx` (primary fix)
- `ae-ai-starter/Scripts/verified/tools/verify_corpus.jsx`, `discover_global_enums.jsx` (audit)

## Verification

- Static: ASCII/ES3/trailing-comma greps clean; diff review confirms no property reference is used after a sibling `addProperty` on its parent.
- Runtime: user re-runs the script in AE — expect the completion alert with record count, and a `verify-*.json` sidecar written.
