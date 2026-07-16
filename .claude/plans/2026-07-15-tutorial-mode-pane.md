# Tutorial Mode — `/tutorial` slash command + rich tutorial pane

## Context

The panel currently replies in plain markdown. The user wants a "learn AE while using it" mode: typing `/tutorial <topic>` produces a richly styled, step-by-step tutorial rendered in a dedicated pane (like ScriptViewer), with per-step "Do it for me" buttons that execute ExtendScript through the existing ai-action pipeline. An ActionBar button inserts `/tutorial ` into the input to teach discoverability.

The groundwork already exists: `ChatMessage.svelte` renders `marked` + `DOMPurify` HTML; `<ai-action>` is a proven in-band structured-block protocol (`src/js/lib/ai-action.ts`); ScriptViewer is the pane precedent; there's no CSP — DOMPurify is the security gate (Node is enabled in the panel, so the sanitizer allowlist matters).

**Decided:** trigger = `/tutorial` slash command + ActionBar button that prefills it; presentation = dedicated pane; interactivity = runnable steps via the ai-action pipeline.

## Implementation

### 1. New `src/js/lib/tutorial.ts` — pure parser + protocol text (no CEP imports, so it's unit-testable)

Imports only `validateScript` (`./knowledge/validator`) and `decodeHtmlEntities` (`./utils/html-entities`) — both already in the test-runner allowlist.

```ts
export interface TutorialStepAction {
  index: number; script: string; label: string;
  validation: ScriptValidationResult;
}
export interface ParsedTutorial { title: string; html: string; actions: TutorialStepAction[]; }
export interface ParsedTutorialResponse {
  displayText: string; tutorial?: ParsedTutorial; multipleBlocks?: boolean;
}
export function parseTutorialResponse(content: string): ParsedTutorialResponse;
export function outlineForHistory(t: ParsedTutorial): string;
export const TUTORIAL_MODE_INSTRUCTIONS: string;
```

Parsing order (safety-critical):
1. Strip an optional wrapping ```` ```html ```` fence, then regex the first `<tutorial title="...">…</tutorial>` block (flag `multipleBlocks` if more). No block → passthrough.
2. **Extract `<step-script label="...">…</step-script>` elements first**, replacing each with trusted marker markup we generate (`<div class="tutorial-step__action" data-tutorial-action="N"><button …>▶ label</button><span data-tutorial-status="N"></span></div>`) — script text never re-enters the HTML. Decode entities, run `validateScript` per snippet.
3. `displayText` = response with tutorial blocks removed; fallback `"Tutorial ready: " + title`.

`TUTORIAL_MODE_INSTRUCTIONS` (per-turn only) tells the model to emit: a 1–3 sentence plain summary, then exactly one `<tutorial>` block of constrained HTML — allowed tags only (`section/h2/h3/p/ul/ol/li/strong/em/code/pre/kbd/br/hr/div/span`), 3–7 `<section class="step">` steps with `<h3>` titles, `callout callout--tip|warning|note` divs, `<kbd>` keycaps, `<pre><code>` for expressions; per-step optional `<step-script label="…">` with self-contained ES3 ExtendScript wrapped in undo groups; no `<ai-action>` in tutorial responses; no other attributes/inline styles/links/images.

### 2. `src/js/lib/context.ts` — mode injection (prompt-cache-safe)

- `export type ChatMode = "tutorial";`
- `buildContext(userMessage?, pinnedContexts?, lastAction?, mode?: ChatMode)` — after the `knowledgeContext.text` push (~line 777), `if (mode === "tutorial") lines.push("", TUTORIAL_MODE_INSTRUCTIONS)`.
- `STATIC_PRELUDE` / `getStaticContext()` untouched → API prompt cache stays byte-stable; CLI resumed sessions still get instructions (systemContext ships every turn).

Knowledge matching needs no changes: `getMessageKnowledgeContext` keys off the raw message, so `/tutorial camera shake` already pulls camera-shake recipes/effects.

### 3. `src/js/main/main.svelte` — slash command, threading, response handling, run wiring

- **Slash detection** in `handleUserSend` (line 375): `/^\/(\w+)(?:\s+([\s\S]+))?$/`. `/tutorial` with no topic → system usage hint, don't send. `/tutorial <topic>` → `handlePromptSend(text, ctxs, "tutorial")`. Any other leading-slash text passes through as a normal message.
- Thread `mode` through `handlePromptSend` (381) → `handleSend` (396) → `buildContext(text, pinned, lastActionResult ?? undefined, mode)` (422). Auto-fix retries do not carry the mode.
- **Response handling** (after `parseAiActionResponse` at 476): run `parseTutorialResponse(parsed.displayText)`; attach `tutorial` to the message (extend `addMessage` extras + `ChatMessage` interface); auto-open the viewer. Append `outlineForHistory()` to the stored message content so follow-ups ("explain step 3") stay grounded on the API provider (history = contents only).
- **Viewer state** next to the ScriptViewer trio (lines 71–73): `tutorialViewerOpen`, `activeTutorial`. Close ScriptViewer when the tutorial opens.
- **Step execution** `handleTutorialStepRun(action)`: block on `validation.errors`; `saveAiAction(sessionProjectRoot, action.script, "Tutorial step N: label")` → `runAiAction()` → mirror the manual-run branch (~816–860): success → `recordActionSuccess` + RunSnapshot diff system message; failure → system error message + `logAiActionFailure`. Manual-click semantics: no `scanActionRisk` gate, no auto-fix trigger for v1. Side effect (accepted): running a step overwrites `.session/ai-action.jsx`, consistent with protocol.

### 4. `src/js/lib/providers/provider.ts` — add `tutorial?: ParsedTutorial` to `ChatMessage`. History mappers only read role/content (verified), so it's inert.

### 5. New `src/js/components/TutorialViewer.svelte`

Props: `{ tutorial, onRunStep, onclose }`. Rendered in main.svelte's markup beside ScriptViewer's slot (~line 1007).

- **Sanitization**: `DOMPurify.sanitize(tutorial.html, { ALLOWED_TAGS: [...above list, "button"], ALLOWED_ATTR: ["class","type","data-tutorial-action","data-tutorial-status"], ALLOW_DATA_ATTR: false })` into `{@html}`. No `style`/`a`/`img`/`iframe`/`script`.
- **Styling**: fixed component `<style>` with `:global()` selectors under a wrapper class, using existing `--ae-*` tokens: numbered steps via CSS counters with `--accent` markers, tinted callouts (`--accent` / `--ae-warn` / `--ae-line-2`), keycap-styled `kbd`, `pre` matching ChatMessage code styling. Body `max-height: min(360px, 45vh); overflow: auto`. Left-aligned text throughout.
- **Run buttons**: delegated container click handler → look up `data-tutorial-action` index → `onRunStep(action)`; component-local `stepStatus` record; an `$effect` writes status text into `[data-tutorial-status]` spans and disables buttons whose action failed validation (tooltip lists errors).

### 6. `src/js/components/ChatMessage.svelte`

- Optional props `tutorialTitle` / `onOpenTutorial` → "📖 Open tutorial: {title}" button under the content.
- Streaming cosmetic: in `renderedContent`, replace partial/complete `<tutorial …` runs with `*…building tutorial…*` (display-only; authoritative parse is post-completion).

### 7. ActionBar button (insert, don't send)

- `ChatInput.svelte`: instance export `prefill(value)` — sets the private `text` $state, focuses `textareaEl`, resizes, cursor to end.
- main.svelte: `bind:this={chatInputRef}`; in `handleAction`, `handler === "startTutorial"` → `chatInputRef?.prefill("/tutorial ")`.
- `src/js/lib/actions.ts`: add `{ label: "Tutorial", icon: "tutorial", handler: "startTutorial" }`; add the icon branch in `ActionIcon.svelte`.

### 8. Tests

- Add `"src/js/lib/tutorial.ts"` to `sourceFiles` in `scripts/run-unit-tests.mjs`.
- `tests/tutorial.test.ts`: passthrough, title default, step extraction + entity decoding, marker substitution (script text absent from html), bad-snippet validation errors, multiple blocks → first + flag, unclosed block → passthrough, fenced block, coexistence with `<ai-action>` text, `outlineForHistory`.

## Files touched

New: `src/js/lib/tutorial.ts`, `src/js/components/TutorialViewer.svelte`, `tests/tutorial.test.ts`.
Modified: `src/js/main/main.svelte`, `src/js/lib/context.ts`, `src/js/lib/providers/provider.ts`, `src/js/components/ChatMessage.svelte`, `src/js/components/ChatInput.svelte`, `src/js/lib/actions.ts`, `src/js/components/ActionIcon.svelte`, `scripts/run-unit-tests.mjs`.

## Verification

1. `pnpm typecheck` and `pnpm test` (new parser suite green).
2. `pnpm debug` browser preview: seed a fixture tutorial message to check viewer styling, callouts/kbd/steps, disabled-on-validation-error buttons, ActionBar prefill focusing input with `/tutorial `.
3. `pnpm build && pnpm symlink`, restart AE, dev panel:
   - `/tutorial ` alone → usage hint, nothing sent.
   - `/tutorial camera shake with expressions` → summary bubble + "Open tutorial" button; pane auto-opens; topic recipes influence content.
   - "Do it for me" → Running → Done, RunSnapshot diff system message, single Cmd-Z undo; next turn carries "Last AI Action".
   - Follow-up "explain step 2" grounded via stored outline.
   - Regressions: plain messages, `<ai-action>` auto-run, Fix/Screenshot buttons unaffected.

## Risks

- Model wraps block in fences or escapes scripts → defensive fence-strip + entity decode (mirrors ai-action).
- DOMPurify stripping run buttons → explicitly allowlisted; confirm in `pnpm debug` (unit tests can't cover DOM).
- Step scripts assuming prior-step state → instruction text mandates self-contained steps; failures land in existing error plumbing regardless.
