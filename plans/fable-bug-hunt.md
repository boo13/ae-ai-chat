# Fable: Bug Hunt — ae-ai-chat

> Plan authored by Fable (parallel-reviewer bug hunt), handed to Claude Code for
> implementation. This file is the single source of truth for progress — update the
> **Handoff Status** section at the bottom whenever work stops so the next agent (human
> or LLM) can resume without re-deriving context.

## Context

Real-bug search: fan out parallel reviewers, adversarially verify each finding, rank by
severity, and produce a fix plan. Three parallel reviewers covered
(1) core panel libs, (2) providers + knowledge/validator, (3) ExtendScript bridge + Svelte UI.
Every candidate was re-verified against the source (and, where possible, reproduced with Node).
Result: **8 confirmed bugs, 3 candidates dismissed as unreachable/latent.**

## Confirmed findings, ranked by severity

### 1. HIGH — expression rewriter corrupts multi-line expression assignments
- **Where:** `src/js/lib/expression-rewriter.ts:14` (`EXPR_ASSIGN_RE`) via `rewriteExpressionAssignments`.
- **Bug:** The line-based regex matches the *first physical line* of a multi-line
  string-concatenation assignment. `prop.expression = "var f = 2;" +` (continued next line)
  becomes `$.global.__aiSetExpr(prop, "var f = 2;" +, N);` — a hard ES3 syntax error, so the
  **entire generated AI action fails to parse in AE**. Long expressions are routinely emitted as
  multi-line concats (template literals are banned, so the model concatenates).
- **Verified:** reproduced the regex match and broken output with Node. No test covers it.
- **Fix:** in `rewriteExpressionAssignments`, only rewrite when the captured RHS is a
  syntactically complete expression — add a small `isCompleteExpression(rhs)` helper that strips
  string literals then checks: balanced `()[]{}`, no unterminated quote, and doesn't end with a
  binary operator/comma (`+ - * / % && || , = ? :`). If incomplete, leave the line untouched
  (the assignment still runs normally; we merely skip error-capture for it — strictly better
  than corrupting the script). Add regression tests: multi-line concat untouched; single-line
  with `+` inside strings still rewritten.

### 2. HIGH — `ES3_TEMPLATE_LITERAL` validator check is dead code
- **Where:** `src/js/lib/knowledge/validator.ts:302` (`checkEs3Syntax`) + `validator-utils.ts:60-72`.
- **Bug:** `checkEs3Syntax` runs on `codeOnlyView(content)`, but the tokenizer classifies
  backtick regions as `string` tokens and blanks them, so a backtick can never appear in
  `codeOnly` — the `/`/g` check **can never fire**. Template-literal scripts pass validation
  (advertised in `VALIDATOR_REJECTIONS` as blocked), get saved/run, and die at AE runtime with
  a SyntaxError.
- **Verified:** traced tokenizer + call site (`validateScript` at validator.ts:485). No test exists
  for template literals (consistent with it going unnoticed).
- **Fix:** detect template literals from tokens instead: walk `tokenizeJsx(content)` keeping a
  running offset (tokens concatenate back to `content`); for each `string` token starting with
  `` ` ``, emit `ES3_TEMPLATE_LITERAL` with `getLineColumn(content, offset)`. Remove the dead
  backtick regex from the `codeOnly` checks. Add tests: backtick template flagged; `"` + `` ` ``
  inside a normal quoted string NOT flagged (token starts with `"`, so no false positive).

### 3. MEDIUM-HIGH — catch block deletes the finalized assistant reply
- **Where:** `src/js/main/main.svelte:650-652` (catch of `handleSend`).
- **Bug:** the catch does `messages.splice(streamingIdx, 1)` assuming the slot still holds a
  partial stream. But `streamingIdx` stays set after line 464 finalizes the streamed message to
  the real reply, and later awaits can throw: `saveAiAction` (line 485, throws on fs errors),
  `runAiAction` (line 567, throws "No AI Action is currently loaded" / session-dir guard /
  evalTS rejection), or errors bubbling out of the recursive `triggerAutoFix → handleSend`.
  The catch then removes the **finalized assistant answer**, leaving orphaned system messages
  ("AI Action ready: …") and a misaligned transcript.
- **Verified:** by code trace of main.svelte:400-668; `streamingIdx` has no other use after
  finalization, and the error branch (line 450) already resets it to -1.
- **Fix:** one line — after finalizing the streamed message in the success branch
  (main.svelte:462-470), set `streamingIdx = -1;` (mirrors the error branch at line 450).
  The catch then only removes genuinely partial streams.

### 4. MEDIUM — `claude.ts` uses the browser global `crypto.randomUUID()` instead of the Node wrapper
- **Where:** `src/js/lib/providers/claude.ts:287`; import list at line 1 lacks `crypto`.
- **Bug:** the project ships a Node crypto wrapper (`src/js/lib/cep/node.ts:4`), but `claude.ts`
  never imports it, so `crypto.randomUUID()` resolves to WebCrypto. `Crypto.randomUUID` only
  exists in Chromium ≥92; CEP 11 hosts (and the "v74 era" runtime this file's own comment at
  line 113 assumes) don't have it → **every new (non-resumed) Claude-CLI session throws** a
  TypeError before spawning the process on those AE versions.
- **Verified:** import list and wrapper export confirmed in source. Runtime impact depends on the
  host's CEP version, but the missing import is unambiguous either way.
- **Fix:** add `crypto` to the `../cep/node` import (Node ≥15.6 has `randomUUID`, which covers
  CEP 11/12 Node runtimes); keep a tiny Math.random-based UUID fallback for the `pnpm debug`
  browser context where the wrapper is `{}` (`typeof crypto.randomUUID !== "function"`).

### 5. LOW-MEDIUM — Enter submits mid-IME-composition
- **Where:** `src/js/components/ChatInput.svelte:58-63`; same pattern in `ApiKeySettings.svelte:36`.
- **Bug:** the keydown handler submits on bare Enter with no composition guard, so CJK/IME users
  confirming an input-method candidate with Enter fire a premature send (and the textarea is
  cleared).
- **Fix:** first line of both handlers: `if (e.isComposing || e.keyCode === 229) return;`.

### 6. LOW — `diffRunSnapshots` corrupts the change diff for layers named after `Object.prototype` members
- **Where:** `src/jsx/aeft/aeft.ts:1253-1291`.
- **Bug:** `counts`/`beforeEffects` are plain-object maps keyed by user-controlled layer names.
  A layer named `constructor` (or `toString`, `valueOf`, …) hits the prototype chain:
  `(counts["constructor"] || 0) + 1` → `Function + 1` → `NaN`; the after-loop's
  `if (counts[al.name])` is falsy → the unchanged layer is reported as **added** in the post-run
  diff, which is shown to the user and fed back to the model as `## Last AI Action`.
- **Fix:** prefix all map keys (`var key = "k:" + name;` on write and lookup; strip the prefix
  with `name.slice(2)` when building `removed` from the `for-in`). ES3-safe, no Map needed.

### 7. LOW — `compareVersions` ignores prerelease identifiers
- **Where:** `src/js/lib/update-check.ts:79-80` (`compareVersions` / `parseVersion`).
- **Bug:** only the `isPrerelease` boolean is compared, so `1.2.0-beta.1` vs `1.2.0-beta.2`
  compare equal → `toAvailableUpdate` treats `<= 0` as no update → newer prereleases of the same
  numeric version are never offered.
- **Fix:** have `parseVersion` keep the prerelease identifier string; when both sides are
  prereleases of equal numbers, compare identifiers segment-wise per semver (numeric segments
  numerically, else string compare). Extend the existing version tests.

### 8. LOW — `checkEnumValues` scans raw lines, mis-handling comments and `//` in strings
- **Where:** `src/js/lib/knowledge/validator.ts:411-478`.
- **Bug:** unlike the other checks it splits raw `content` and strips only `//` line comments
  with a regex, so (a) matchNames in block comments produce false-positive warnings, and
  (b) a `//` inside a string literal truncates the line and hides real values. Warning-only,
  so low severity.
- **Fix:** build the scan text from `tokenizeJsx(content)`: blank only `line-comment` /
  `block-comment` tokens (keep code AND strings — the matchNames live in strings), then drop the
  naive `//.*$` strip. Reuses the existing tokenizer; newlines preserved so line/col stay right.

## Dismissed candidates (adversarially rejected)

- `auto-fix.ts:79` `expressionErrors?.length === 0` drops the script error when undefined —
  **unreachable**: the only caller (`triggerAutoFix`, main.svelte:290) types it as a required
  array and always passes `[]`. (Optionally tighten to `!input.expressionErrors?.length` while
  in the file, but it's not a live bug.)
- `context.ts:600` unguarded `compInfo.duration.toFixed(1)` — snapshot always sets numeric
  `duration` (aeft.ts:470/885) and the pruned inline fallback only pops arrays, never comp fields.
- `bolt.ts:240` malformed hex color (no zero-padding) — real defect but the `hex` field has
  **zero consumers** in the repo; dead code today. Not scheduled.

## Implementation order & files

Fix in severity order; each is independent:
1. `src/js/lib/expression-rewriter.ts` + `tests/expression-rewriter.test.ts`
2. `src/js/lib/knowledge/validator.ts` (+ token-offset helper use of `validator-utils.ts`) + `tests/validator.test.ts`
3. `src/js/main/main.svelte` (one line)
4. `src/js/lib/providers/claude.ts` (import + fallback)
5. `src/js/components/ChatInput.svelte`, `src/js/components/ApiKeySettings.svelte`
6. `src/jsx/aeft/aeft.ts` (`diffRunSnapshots`)
7. `src/js/lib/update-check.ts`
8. `src/js/lib/knowledge/validator.ts` (`checkEnumValues`)

## Verification

- `pnpm install` (node_modules is absent in this container), then:
- `pnpm test` — extend `tests/expression-rewriter.test.ts` (multi-line concat left intact,
  single-line rewrites unchanged, byte-stability test still passes) and `tests/validator.test.ts`
  (template literal now errors; backtick inside a quoted string doesn't; enum-value warning no
  longer fires from a block comment). Add a small `update-check` prerelease comparison test if a
  test file exists or is trivial to add alongside.
- `pnpm typecheck` — covers the Svelte + jsx TS changes (aeft.ts is type-checked; ES3 output is
  Babel-transpiled, and the fix uses only ES3-safe constructs).
- Manual notes for the user (needs AE on macOS, not runnable here): multi-line expression action
  runs and reports expression errors; Claude CLI provider starts a fresh session; IME Enter no
  longer sends.

Commit per-fix or as one commit ("fix: …").

---

## Handoff Status

_Updated by the implementing agent each time work stops. Read this section first before
picking up any task above._

**Last updated:** 2026-07-03, by Codex (GPT-5), on branch `security/untrusted-ae-context-001`.

| # | Fix | Status |
|---|-----|--------|
| 1 | expression-rewriter multi-line corruption | **Done** — `isCompleteExpression()` guard added in `src/js/lib/expression-rewriter.ts`; 4 new tests in `tests/expression-rewriter.test.ts` |
| 2 | ES3_TEMPLATE_LITERAL dead code | **Done** — new `checkTemplateLiterals()` in `src/js/lib/knowledge/validator.ts` using `tokenizeJsx`; dead backtick regex removed from `checkEs3Syntax`; 2 new tests in `tests/validator.test.ts` |
| 3 | catch deletes finalized reply | **Done** — one-line fix, `streamingIdx = -1` added after finalizing the streamed message in `src/js/main/main.svelte` (success branch) |
| 4 | claude.ts WebCrypto vs Node crypto | **Done** — `crypto` now imported from `../cep/node` in `src/js/lib/providers/claude.ts`; added `generateSessionId()` helper with Math.random UUID fallback for the browser-preview context |
| 5 | IME Enter submits early | **Done** — composition guards added to `ChatInput.svelte` and `ApiKeySettings.svelte` (`e.isComposing || e.keyCode === 229`) before Enter handling |
| 6 | diffRunSnapshots prototype pollution | **Done** — snapshot diff maps now use prefixed keys (`k:`) and strip the prefix only when reporting removed layers |
| 7 | compareVersions ignores prerelease id | **Done** — prerelease identifiers are now retained and compared segment-wise; new `tests/update-check.test.ts` covers beta ordering and release-vs-prerelease ordering |
| 8 | checkEnumValues raw-line scan | **Done** — enum scanning now blanks tokenizer comment tokens while preserving code/string text; tests cover block comments and `//` inside strings |

**Verification run (fixes 1-8):**
- `pnpm test` — 37/37 passing (adds update-check prerelease tests and enum scanner regressions).
- `pnpm typecheck` — 0 errors, 0 warnings across Svelte + TS.
- Nothing committed yet — working tree has related bug-hunt edits plus this plan file; unrelated
  dirty files still present (`prompts/TextureLabs_FilmDamage.md`, `offline/`).

**Notes for next agent:**
- All 8 confirmed findings in this plan are implemented and covered by automated checks where
  practical. The IME and AE diff behaviors still need manual runtime validation in their real hosts.
- None of the fixes have been manually verified inside After Effects (requires macOS + AE, not
  available in this environment) — the plan's "Manual notes for the user" section still applies
  once AE is available.
