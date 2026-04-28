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
    actions.ts, ai-action.ts, context.ts, error-patterns.ts, provider-config.ts
  main/         Vite entry point → dist/cep/main/index.html
src/jsx/        ExtendScript bridge (compiled for ES3)
  aeft/         AE evaluation helpers (aeft.ts, aeft-utils.ts)
  utils/        JSX utilities
  index.ts      Bridge entry
  lib/json2.js  ES3 JSON polyfill
src/shared/     Shared types and constants (shared.ts)
src/assets/     Icons
```

Build tooling: `vite-cep-plugin`, `vite.config.ts` + `vite.es.config.ts`. Extension ID: `com.ae-ai-chat.panel`. Panel name: `AE AI Chat`.

## Build and Dev Commands

```bash
pnpm install         # install dependencies
pnpm dev             # Vite dev server (port 3002) + hot reload
pnpm build           # production build to dist/cep/
pnpm symlink         # symlink dist/cep/ into AE's CEP extensions folder
pnpm zxp             # package a signed .zxp
pnpm debug           # open panel preview in the browser
```

Run `npm run build` before `npm run symlink`. After build + symlink, restart AE and open via **Window → Extensions → AE AI Chat**.

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

Outputs to `src/js/lib/knowledge/data/`. **Commit the generated `.ts` files** — no runtime dependency on the corpus. Re-run and commit whenever the upstream corpus changes.

Trust provenance tags in the upstream effect JSON: `[VERIFIED]` and `[DOCS]` are reliable; verify `[LLM-GENERATED]` before relying on it.

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
