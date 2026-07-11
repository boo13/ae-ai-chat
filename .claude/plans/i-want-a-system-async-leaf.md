# Closing the Loop: an agent-driven verification & context system

## Context

Today AE AI Chat already has most of a feedback loop *inside* the panel: pre-run validation
(`validator.ts`), before/after `RunSnapshot` diffing + expression-error capture (`aeft.ts`
`runScriptFile`, `src/shared/run-diff.ts`), a 3-attempt auto-fix loop (`main.svelte` +
`auto-fix.ts`), and dev-only failure logging (`error-log.ts` → `.session/error-log.jsonl`) with a
summarizer (`errors:summarize`). What's missing is the **outer** loop: every path to running
ExtendScript against AE funnels through `window.__adobe_cep__.evalScript`, which only exists when a
human has the panel open. So verifying a recipe/effect, promoting `pending → verified`, and turning
error clusters into new corpus entries are all **manual**. 14 of 37 recipes are stuck at `pending`
purely because nobody has run them in AE.

Goal: let an agent (Claude driving, Codex authoring) **operate the running panel programmatically**,
run verification against real AE, confirm end-to-end prompt behavior, and mine errors into new
verified context — closing the loop without a human clicking in AE.

### Reality check on "computer use"
Native AE-GUI screenshot-and-click is **not** available (Claude Code only has Claude-in-Chrome =
Chrome tabs; Codex has no GUI driver). The reliable substitute the user approved is: the dev panel is
a Chromium context on **CDP remote-debug port 8862**. An agent attaches over CDP and evaluates JS in
the *real* panel — calling the existing bridge (`runScriptFile`, `getContextSnapshot`) and a new
dev-only test hook — to run ExtendScript in live AE and read back the diffs the panel already
computes. Programmatic, not pixel-screenshotting; same outcome, far more reliable.

**Decisions (confirmed):** driver = **Both** (CDP into live panel + Claude-in-Chrome on the
`:5002` preview for UI-only checks); scope = **recipe/effect verification + end-to-end prompt tests +
error mining**; orchestration = **a Claude skill + `pnpm` scripts** (Pablo protocol: Claude drives,
Codex authors fixes).

## Approach

Build one reusable CDP primitive, a dev-only in-panel test hook, three verification harnesses on top,
and a skill that orchestrates them. Reuse the existing verification engine (`runScriptFile` already
returns `{success, stateDiff, expressionErrors, error}`) rather than re-implementing snapshotting.

### 1. CDP driver primitive — `scripts/ae-driver.mjs`
The single "operate the panel" module. Add `chrome-remote-interface` as a devDependency.
- Connects to `http://localhost:8862`, lists `/json`, selects the page target whose URL is the panel
  `index.html`. Fails fast with a clear message if AE/panel/debug-mode isn't up.
- Exposes:
  - `evalES(jsx)` → runs `window.__adobe_cep__.evalScript(jsx, cb)` (wrapped in a Promise via
    `Runtime.evaluate` `awaitPromise`), returns parsed JSON.
  - `runJsxFile(absPath)` → calls the existing bridge
    `$["com.ae-ai-chat.panel"].runScriptFile(absPath)` (ns from `src/shared/shared.ts`) → the same
    `{success, stateDiff, expressionErrors, error}` the panel uses.
  - `evalPanel(jsExpr)` → arbitrary JS in the panel page (used for the `__aeTest` hook below).
  - `screenshot(path)` → `Page.captureScreenshot` of the panel.
- Fallback note: if CRI can't attach, `osascript -e 'tell application id "com.adobe.AfterEffects" to
  DoScriptFile …'` runs a `.jsx` against AE with no panel (recipe runs only, no providers). Documented
  as backup, not primary.

### 2. Dev-only in-panel test hook — `src/js/lib/test-harness.ts`
Small module that, when `getRuntimeEnvironment().isDevInstall` is true, sets `window.__aeTest` in
`main.svelte`'s `onMount`. Gives the driver a stable API instead of DOM-poking:
- `runJsx(absPath)` → `evalTS("runScriptFile", path)`.
- `runPrompt(text)` → invokes the existing `handleSend(text)` path and resolves when the turn
  completes with `{ actionRan, stateDiff, expressionErrors, lastError }` (read from the same
  `lastActionResult` / `logFailure` state already tracked at `main.svelte:90`).
- `getContext()` / `getLastActionResult()`.
Gated so it never ships in the packaged ZXP.

### 3. Recipe/effect verification harness — `scripts/verify-recipes.mjs` (`pnpm recipes:verify`)
Closes the biggest gap (14 pending recipes).
- Reads recipes (default: `pending` only from `recipes/**/*.json`; `--all`; `--only <id>`).
- Reuse `wrapUndoGroup` from `scripts/export-recipe-scripts.mjs` (extract into a shared helper) to
  emit each recipe to a temp `.jsx`.
- Per recipe: `driver.evalES(<fixture>)` to reset a known scene (new `fixtures/verify-scene.jsx`:
  fresh comp + solid + text layer, solid selected) → `driver.runJsxFile(recipeJsx)`.
- Pass/fail policy on the returned result: `error` → FAIL(runtime); `expressionErrors.length` →
  FAIL(expression); empty `stateDiff` → FAIL(no-op/inconclusive); else PASS.
- Writes `.session/recipe-verification.json` + a console table.
- `--promote`: for PASSing `pending` recipes, rewrite the source JSON `notes` to drop
  "verification pending"; the skill then runs `generate-knowledge.mjs` + `recipes:check` so
  `verifiedStatus` flips to `verified`.

### 4. End-to-end prompt tests — `scripts/verify-e2e.mjs` (`pnpm verify:e2e`)
Exercises the *whole* pipeline (provider → action → validate → run → diff).
- Fixtures in `tests/e2e/*.json`: `{ prompt, expectDiffContains?: string[], expectNoErrors: true }`
  (small curated set, 3–5).
- Driver resets the fixture scene, calls `window.__aeTest.runPrompt(prompt)`, asserts the action ran,
  the diff matches, and no errors; `driver.screenshot()` on failure.
- Skips gracefully with a clear message if no provider is configured.

### 5. Error mining → new context (skill-orchestrated, minimal new code)
Reuse `pnpm errors:summarize`. Skill parses the "Zero-recipe failures" section, delegates candidate
recipe/gotcha authoring to **Codex** (`/codex:rescue`), then `pnpm recipes:verify --only <id>` against
live AE; on PASS → `generate-knowledge.mjs` + `recipes:check` → commit → PR.

### 6. UI-only visual check (Claude-in-Chrome, the "Both" half)
Skill step: `pnpm debug` (port 5002) in background, Claude-in-Chrome navigates to `localhost:5002`,
screenshots key UI states. Explicitly UI/layout only — the preview has no AE/provider backend
(`window.cep` undefined there).

### 7. Orchestration — `.claude/skills/verify-loop/` (SKILL.md + README.md)
Playbook the user invokes:
1. Preflight: driver pings `app.version` on :8862; ensure build/symlink fresh; corpus git-clean.
2. `pnpm recipes:verify` (pending) → report; `--promote` on green.
3. `pnpm verify:e2e` → report.
4. Mine errors → Codex authoring → verify → regenerate → `recipes:check`.
5. Optional Claude-in-Chrome preview visual check.
6. Summarize; optionally open a PR with promotions + new recipes.
Per the global "automated behavior dir needs a README" rule, include `README.md`.

## Critical files

- New: `scripts/ae-driver.mjs`, `scripts/verify-recipes.mjs`, `scripts/verify-e2e.mjs`,
  `fixtures/verify-scene.jsx`, `src/js/lib/test-harness.ts`,
  `.claude/skills/verify-loop/{SKILL.md,README.md}`, `tests/e2e/*.json`.
- Modify: `scripts/export-recipe-scripts.mjs` (extract shared `wrapUndoGroup`),
  `src/js/main/main.svelte` (mount `__aeTest` when dev), `package.json` (add
  `chrome-remote-interface` devDep + `recipes:verify` / `verify:e2e` scripts), `AGENTS.md`
  (point the "Error-log feedback loop" section at the new automated loop).
- Reuse (no change): `runScriptFile`/`buildRunSnapshot` (`src/jsx/aeft/aeft.ts`),
  `diffRunSnapshots` (`src/shared/run-diff.ts`), `errors:summarize`
  (`scripts/error-log-summary.mjs`), `generate-knowledge.mjs`, `check-recipes.mjs`.

## Prerequisites & risks
- **Live AE + dev panel + CEP debug mode** must be up for port 8862 to exist. Driver fails fast if not.
- CEF Chromium: raw CDP `Runtime.evaluate` + `Page.captureScreenshot` are broadly supported → low
  risk; osascript `DoScriptFile` is the documented fallback for headless recipe runs.
- E2E needs provider creds; loop skips e2e cleanly when absent.

## Verification (how to test this system end-to-end)
1. With AE + dev panel open: `pnpm recipes:verify --all` — confirm a known verified recipe PASSes and
   a deliberately broken `.jsx` (`--only` a temp bad recipe) FAILs with the right kind.
2. `pnpm recipes:verify --promote` on the pending set, then `generate-knowledge.mjs` +
   `pnpm recipes:check` + `pnpm test` — confirm promoted recipes flip to `verified` and checks pass.
3. `pnpm verify:e2e` with one fixture prompt — confirm the action runs and the diff assertion holds;
   confirm `driver.screenshot()` writes a PNG.
4. Confirm the `__aeTest` hook is absent in a packaged build (`pnpm zxp` → grep the bundle).
5. Run the `/verify-loop` skill through one full pass on the current pending recipes.
