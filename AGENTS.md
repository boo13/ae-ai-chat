# AE AI Chat

## What This Is

A macOS-only CEP panel for Adobe After Effects. Users type prompts; the panel sends them to an LLM (via Anthropic SDK, Claude CLI, or Codex CLI) along with AE project context. The model replies in natural language and can embed a temporary ExtendScript action that the panel runs inside AE.

## Architecture

```
src/js/         Svelte 5 + TypeScript panel UI
  components/   Svelte components (chat, header, provider picker, etc.)
  lib/          Core modules
    cep/        CEP bridge (csinterface, node, bolt)
    knowledge/  Effect catalog, gotchas, validators
    providers/  AI provider implementations
    utils/      Shared helpers
    actions.ts, ai-action.ts, auto-fix.ts, context.ts, error-log.ts, error-patterns.ts,
    expression-rewriter.ts, provider-config.ts, runtime-environment.ts
  main/         Vite entry point → dist/cep/main/index.html
src/jsx/        ExtendScript bridge (compiled for ES3)
  aeft/         AE evaluation helpers (aeft.ts, aeft-utils.ts)
  utils/        JSX utilities
  index.ts      Bridge entry
  lib/json2.js  ES3 JSON polyfill
src/shared/     Shared types and constants (shared.ts)
src/assets/     Icons
```

Build tooling: `vite-cep-plugin`, `vite.config.ts` + `vite.es.config.ts`. Dev extension ID: `com.ae-ai-chat.panel.dev` (menu: `AE AI Chat (dev)`). Prod/ZXP ID: `com.ae-ai-chat.panel` (menu: `AE AI Chat`). The `(dev)` suffix is applied in `vite.config.ts` at build time — `cep.config.ts` must stay static-literal only because it gets bundled into the panel JS (where `process.env` is undefined).

## Build and Dev Commands

```bash
pnpm install         # install dependencies
pnpm dev             # Vite dev server (port 3002) + hot reload
pnpm build           # production build to dist/cep/
pnpm symlink         # symlink dist/cep/ into AE's CEP extensions folder
pnpm zxp             # package a signed .zxp
pnpm debug           # open panel preview in the browser
pnpm typecheck       # type-check Svelte + TS without building
```

Run `pnpm build` before `pnpm symlink`. After build + symlink, restart AE and open via **Window → Extensions → AE AI Chat (dev)**. The packaged ZXP release appears as **AE AI Chat** — both can coexist.

## AI Action Protocol

The model can embed a single ExtendScript block in its reply:

```xml
<ai-action run="true">
// ExtendScript ES3 code here
</ai-action>
```

- The panel extracts the **first** `<ai-action>` block only; additional blocks are ignored.
- The script is saved to `.session/ai-action.jsx` and metadata to `.session/ai-action.json`.
- `run="true"` executes it immediately; omit or set to `false` to stage only.
- These session files are ephemeral — overwritten every response. Do not reference them as persistent artifacts.

Parsing and validation live in `src/js/lib/ai-action.ts`. The validator (`src/js/lib/knowledge/validator.ts`) checks generated scripts against the verified effect catalog before saving.

## Context Pipeline

How AE state reaches the model on every message (`src/js/lib/context.ts`):

- **One snapshot call.** `getContextSnapshot()` (`src/jsx/aeft/aeft.ts`) collects project info, active comp (incl. playhead, work area, comp markers, layer in/out points, parents, lock/enable/3D flags), selected-layer details, and selected properties in a single `evalTS` call. The JSON is written to a temp file and read back via Node `fs`, bypassing the ~10KB CEP bridge return limit — keep new context fields inside the snapshot, not as extra bridge calls. If the file write fails, an inline pruned payload is the fallback.
- **Pinned chips resolve to data.** `getPinnedContextDetails()` turns pinned comp/layer/effect chips into actual layer stacks and effect property values (with name/matchName fallback when indices shift). Bare labels are only sent if resolution fails.
- **Static vs. dynamic context.** `buildContext()` returns `staticContext` (byte-stable knowledge corpus: effect index, gotchas, property trees, rules, constraints, action protocol) and `systemContext` (per-turn AE state + message-matched recipes/effect records). The Claude API provider sends the static part as the first system block with a `cache_control` breakpoint (prompt cache); the CLI providers send it only on a session's first turn. **Never put per-turn data in the static part** — any byte change invalidates the cache.
- **Present-effect records.** Verified effect records are injected not just for effects named in the user message, but for effects already present on selected/pinned layers (`getMessageKnowledgeContext` in `src/js/lib/knowledge/index.ts`).
- **Post-run verification.** `runScriptFile()` diffs a bounded `RunSnapshot` before/after execution: transforms, effect-parameter digests, expressions, keyframe counts, layer timing, and comp duration/work area for comps up to 60 layers, with a shallow fallback above that. Successful expression assignments are reported separately. The panel feeds this evidence into the next message as `## Last AI Action`; an empty diff is explicitly inconclusive.

## ExtendScript (ES3) Constraints

**Critical:** The panel generates scripts that run inside After Effects. AE's scripting host is based on ECMAScript 3.

- Use `var` — no `let` or `const`
- Function keyword syntax only — no arrow functions
- String concatenation with `+` — no template literals
- No destructuring, spread, or modern JS features
- Use `#include` directives to load libraries — not `import` or `require`
- Wrap all changes in `app.beginUndoGroup("Label")` / `app.endUndoGroup()`
- Access layer properties via full path: `layer.property("Transform").property("Position")` — do NOT use shortcuts like `layer.property("Position")`
- Use ADBE match-names for shape layer and effect properties — display names are unreliable
- File I/O: `new File(path)` and `new Folder(path)` — not Node.js APIs

**Expressions** (assigned to `.expression`) run in AE's ES6 engine since CC 2019 — but write them with `var` anyway for users on the legacy expression engine (Project Settings > Expressions > Expression Engine).

## TextDocument Rules

- Get TextDocument from the layer: `layer.property("Text").property("Source Text").value`
- Set `doc.applyFill = true` before `doc.fillColor = [r, g, b]` — AE throws otherwise
- Set `doc.justification = ParagraphJustification.LEFT_JUSTIFY` explicitly — default varies by AE version
- Reset anchor point after adding text layers: `layer.property("Transform").property("Anchor Point").setValue([0,0])`

## Common Gotchas

Full list in `src/js/lib/knowledge/data/gotchas.ts` (generated from the verified corpus). Key ones:

- **Non-ASCII in .jsx files** — ExtendScript's parser silently rejects any `.jsx` file containing characters outside ASCII. The script won't appear in File > Scripts at all.
- **Layer index shifting** — `addSolid()` / `addShape()` inserts at index 1, shifting all existing layers. Always look up layer indices by name *after* all layer creation is complete.
- **setValue() type mismatches** — RGBA properties need 4-element arrays `[r,g,b,a]`. Passing `[r,g,b]` may silently succeed but produce invisible output (alpha = 0).
- **Effect enum values are 1-indexed** — never assume 0-based.

## Verified Knowledge Corpus

### Effects, properties, and gotchas

The source of truth for AE effect match-names, property trees, and runtime gotchas is:

```
../ae-ai-starter/Scripts/verified/
  effects/     One JSON per verified effect (338 effects)
  properties/  Property trees: camera, light, mask, shape-layer, text-layer
  gotchas.md   Empirically verified runtime pitfalls
```

Generated into this repo via:

```bash
node scripts/generate-knowledge.mjs
# or if the sibling clone is elsewhere:
node scripts/generate-knowledge.mjs --source <path-to-verified>
```

Outputs to `src/js/lib/knowledge/data/`. **Commit the generated `.ts` files** — no runtime dependency on the corpus.

> **This repo is authoritative.** `../ae-ai-starter` is now behind — the committed `.ts` in `src/js/lib/knowledge/data/` are the source-of-truth product data. A bare `generate-knowledge.mjs` regenerates every catalog from the outdated sibling and would revert newer work, so regenerate only deliberately and `git diff` the result before committing. Recipes are authored in this repo and always regenerated with `--recipes-source ./recipes` (see Action recipes).

Trust provenance tags in the upstream effect JSON: `[VERIFIED]` and `[DOCS]` are reliable; verify `[LLM-GENERATED]` before relying on it.

### Action recipes

Recipes are **composable action building blocks** — not reference-then-forget examples. Generated entries carry a runtime verification status; verified recipes are authoritative primitives, while pending recipes must be promoted after their AE checkpoint. Do not use the word "examples" to describe them.

### Expression language

Expression methods and pitfalls come from `../ae-ai-starter/Scripts/verified/expressions/`. Records retain docsforadobe commit provenance and a `verifiedStatus`; do not describe a docs-sourced record as AE-verified until a `verify_expressions.jsx` sidecar promotes it. `scripts/generate-knowledge.mjs` emits the bounded static index and full message-matched detail catalog in `src/js/lib/knowledge/data/expressions.ts`.

Recipes are authored as individual JSON files with schema `{id, description, keywords[], script, notes?}`. The `script` field must be ES3-compliant ExtendScript wrapped in `app.beginUndoGroup / endUndoGroup`.

**Authoring:** The `recipes/` directory at the repo root is the authoritative corpus. Regenerate with:

```bash
node scripts/generate-knowledge.mjs --recipes-source ./recipes
```

This repo is the source of truth for recipes — the committed `recipes/` JSONs plus the generated `src/js/lib/knowledge/data/recipes.ts`. There is no `ae-ai-starter` copy-back: that sibling is outdated, and its old `Scripts/recipes/` path now holds unrelated `.jsxinc` modules. Always pass `--recipes-source ./recipes`; a bare `generate-knowledge.mjs` targets a default recipe path (`Scripts/verified/recipes`) that no longer exists.

**Tooling:**
- `pnpm recipes:check` — smoke-tests keyword matching and injection for all recipe IDs
- `pnpm recipes:export` — exports all recipe scripts to `recipe-scripts/*.jsx` for AE runtime testing

### Error-log feedback loop

Dev installs log every AI Action failure (validation, runtime, expression) with the script and the injected recipe IDs to `.session/error-log.jsonl` (`src/js/lib/error-log.ts`). This corpus is the raw material for improving the knowledge base — mine it periodically:

1. Run the `/verify-loop` skill with AE and the dev panel open. It verifies pending recipes against live AE, runs prompt E2E fixtures, and invokes `pnpm errors:summarize` to cluster failures.
2. Use `pnpm recipes:verify --only <id>` while iterating on a specific recipe; add `--promote` after it passes to remove its pending marker.
3. A repeated runtime pitfall → add it to the upstream `gotchas.md` and regenerate.
4. A repeated zero-recipe failure → author a composable recipe, verify it in live AE, regenerate the corpus, and run `pnpm recipes:check`.
5. A failure that should have been caught before execution → add a validator rule (`src/js/lib/knowledge/validator.ts`).

## Providers

| Name | Mechanism | Images |
|------|-----------|--------|
| Claude API | `@anthropic-ai/sdk` — requires `ANTHROPIC_API_KEY` | Yes |
| Claude | `claude` CLI via child process | No |
| Codex | `codex` CLI via child process | No |

Provider logic lives in `src/js/lib/providers/`. Shared utilities (git root detection, session path resolution) in `src/js/lib/providers/shared.ts`.

## Where User-Facing Docs Live

The prompt-writing guide (imperative voice, layer spec format, anti-patterns) is in README under **Writing Prompts**. Do not put prompt-writing guidance here — this file is for contributors and AI agents working on the codebase.

## After Effects Scripting References

- Community Scripting Guide: <https://ae-scripting.docsforadobe.dev/>
- Adobe AE User Guide: <https://helpx.adobe.com/after-effects/user-guide.html>
