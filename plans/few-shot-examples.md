# Plan: Few-Shot Examples

## Context

The knowledge layer gives the LLM reference data — effect matchNames, property schemas, gotchas. This tells the LLM *what exists*. Few-shot examples show it *how to combine things into working scripts*. They're especially valuable for multi-step patterns that property tables alone don't fully specify: `TextDocument` mutation semantics, shape operator animation combos, keyframe easing API, expression-vs-script engine distinctions.

**This plan should start only after Corpus Expansion, Richer Context, and Error Feedback Loop (Phase 1 of each) are tested.** The example set should target whatever gaps remain after those plans close — writing examples before testing those improvements would mean writing examples for problems that may already be solved.

---

## Phase 1: Infrastructure + First 3-5 Examples

**Goal:** Build the injection system and validate that examples improve output quality on 1-2 target patterns.

### ae-ai-starter

**`Scripts/verified/examples/`** — CREATE directory

Each example is a JSON file:

```json
{
  "id": "text-layer-creation",
  "description": "Create a text layer and set font, size, and fill color",
  "keywords": ["text layer", "addtext", "textdocument", "font", "fontsize", "tracking", "justification"],
  "script": "app.beginUndoGroup('Create Text');\nvar comp = app.project.activeItem;\nvar textLayer = comp.layers.addText('Hello World');\nvar textProp = textLayer.property('ADBE Text Properties').property('ADBE Text Document');\nvar textDoc = textProp.value;\ntextDoc.fontSize = 72;\ntextDoc.font = 'Arial-BoldMT';\ntextDoc.fillColor = [1, 1, 1];\ntextDoc.applyFill = true;\ntextDoc.justification = ParagraphJustification.CENTER_JUSTIFY;\ntextProp.setValue(textDoc);\napp.endUndoGroup();",
  "notes": "TextDocument must be read via .value, modified locally, then written back via .setValue(). You cannot set properties directly on the live TextDocument."
}
```

Required fields: `id`, `description`, `keywords` (array of lowercase strings), `script` (verified-in-AE ExtendScript), `notes` (optional). All scripts must be run in AE before committing.

**Initial examples to write and verify:**
1. `text-layer-creation.json` — TextDocument read/modify/setValue pattern
2. `trim-paths-animation.json` — Trim Paths with keyframed Start/End on a shape layer
3. `keyframe-temporal-ease.json` — KeyframeEase constructor + setTemporalEaseAtKey()
4. `expression-on-property.json` — assigning an expression string vs setting a value (ES6 OK in expressions)
5. `effect-manipulation.json` — addProperty() + access multiple properties + setValueAtTime()

### ae-ai-chat

**`scripts/generate-knowledge.mjs`** — MODIFY

Add a section at the end that:
1. Reads all `*.json` files from `examples/` in the corpus
2. Validates each has `id`, `description`, `keywords`, `script`
3. Writes `src/js/lib/knowledge/data/examples.ts` as an exported array constant:
   ```typescript
   export interface ExampleEntry {
     id: string;
     description: string;
     keywords: string[];
     script: string;
     notes?: string;
   }
   export const EXAMPLES: ExampleEntry[] = [...];
   ```

**`src/js/lib/knowledge/data/examples.ts`** — GENERATED

**`src/js/lib/knowledge/examples.ts`** — CREATE

`KnowledgeSource` implementation:
- `getStaticContext()` — returns empty string. Examples are always message-triggered, never static.
- `getMessageContext(userMessage)` — keyword matching following the same pattern as `effects.ts`:
  - Build regex patterns at module load time from each example's keywords array: `\b<keyword>\b` (case-insensitive)
  - On each call, collect matching example IDs (deduplicated)
  - Cap at **2 examples** per message to manage token budget
  - Format each matched example:
    ```
    ## Verified Working Examples

    ### Create a text layer and set font, size, and fill color
    ```jsx
    app.beginUndoGroup('Create Text');
    ...
    ```
    Note: TextDocument must be read via .value, modified locally, then written back via .setValue().
    ```
  - Return empty string if no examples match

**`src/js/lib/knowledge/index.ts`** — MODIFY

Register `examplesKnowledge` **last** in the sources array so examples appear after reference data in the system prompt.

### Verification

1. `node scripts/generate-knowledge.mjs` — confirm `examples.ts` generated with all 5 entries.
2. Chat: `"Create a text layer that says Welcome at 48pt"` → system prompt includes the `text-layer-creation` example. Generated script uses the read/modify/setValue pattern.
3. Chat: `"Add a Gaussian Blur"` → NO example injected (no examples match effect-only requests — they have their own reference data). Confirms token efficiency.
4. Chat: `"Animate trim paths on a shape layer"` → `trim-paths-animation` example injected. Generated script uses correct keyframing pattern.
5. Check system prompt total size stays under a reasonable ceiling (e.g., 25KB) with 2 examples + full knowledge layer.

---

## Phase 2: Expanded Example Set

**Goal:** Add 10-15 more examples based on Phase 1 results and observed failure patterns post-corpus-expansion and richer-context.

**Candidate categories** (prioritize by observed failures, not this list):

- Shape layer with multiple operators (Repeater + Trim Paths combo, transform offset)
- Keyframe spatial tangents: `setSpatialTangentsAtKey()` for smooth paths
- Expression linking: comp-based references, `comp().layer().effect()` patterns
- Pre-comp creation: `precompose()` with layer index array
- Track matte: `trackMatteType`, `trackMatteLayer` (2023+ API)
- Multi-layer parenting: `layer.parent = otherLayer` with index safety
- Marker creation: `MarkerValue` constructor, setting comment/duration
- Null object rig: create null, parent multiple layers, animate null

No code changes in `ae-ai-chat` for Phase 2 — the infrastructure from Phase 1 automatically picks up new example files when `generate-knowledge.mjs` runs.

Only `ae-ai-starter` work: write and AE-verify additional JSON files in `Scripts/verified/examples/`.

### Verification

1. Regenerate knowledge. Confirm all new examples in data module.
2. For each new example category, send a representative chat message. Verify the example is injected and the generated script matches the example pattern.

---

## Critical Files

| File | Repo | Role |
|---|---|---|
| `Scripts/verified/examples/*.json` | ae-ai-starter | Hand-written, AE-verified examples |
| `scripts/generate-knowledge.mjs` | ae-ai-chat | Add examples generation section |
| `src/js/lib/knowledge/data/examples.ts` | ae-ai-chat | GENERATED |
| `src/js/lib/knowledge/examples.ts` | ae-ai-chat | CREATE — new KnowledgeSource |
| `src/js/lib/knowledge/index.ts` | ae-ai-chat | Register examplesKnowledge last |

## Dependency Note

Start this plan only after Corpus Expansion Phase 1, Richer Context Phase 1, and Error Feedback Phase 1 are verified in AE. The examples should target whatever the LLM still gets wrong after those improvements, not patterns that better reference data or context already fixes.
