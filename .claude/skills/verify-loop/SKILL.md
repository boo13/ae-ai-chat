---
name: verify-loop
description: Drive the live After Effects dev panel to verify recipes, run prompt E2E fixtures, mine failures, and promote verified context.
---

# Verify Loop

Run the outer verification loop against a real After Effects session. Keep all authoring and generated files inside this repository.

## 1. Preflight

1. Confirm After Effects is running, CEP debug mode is enabled, and **AE AI Chat (dev)** is open.
2. Build and refresh the dev install when sources are newer than `dist/cep`:

   ```bash
   pnpm build
   pnpm symlink
   ```

   Restart After Effects after changing the symlink or ExtendScript bundle.
3. Ping live AE through the driver:

   ```bash
   node --input-type=module -e 'import { connect, ping, close } from "./scripts/ae-driver.mjs"; try { await connect(); console.log(await ping()); } finally { await close(); }'
   ```

4. Check `git status --short`. Stop before promotion or regeneration if recipe sources or the generated knowledge corpus have unrelated changes.

## 2. Verify recipes

Run pending recipes:

```bash
pnpm recipes:verify
```

Investigate every runtime, expression, and no-op failure. Re-run one recipe with `pnpm recipes:verify --only <id>`. When the pending set is green, promote passing recipes:

```bash
pnpm recipes:verify --promote
node scripts/generate-knowledge.mjs --recipes-source ./recipes
pnpm recipes:check
```

Never promote a no-op result. An empty state diff is inconclusive.

The base fixture (`fixtures/verify-scene.jsx`) leaves a solid selected. Recipes with other preconditions supply `fixtures/recipe-setup/<id>.jsx`, run after the reset to adjust selection/scene: the text recipes select the text layer, `track-matte-setup`/`expression-follow-delay` select two layers, and the keyframe recipes (`loop-keyframes`, `bounce-overshoot-expression`, `easy-ease-preset`) add Position keyframes and select that property. Add one when a recipe fails only because its precondition is unmet in the base scene.

Recipes that call `alert()` (e.g. `expression-error-scan`) are reported as `SKIP` — a modal dialog would block the driver, and a read-only diagnostic has no state diff to verify. Its job (surfacing expression errors) is already covered by the harness's own `expressionErrors` capture. Verify such recipes manually if needed.

## 3. Verify prompts end to end

Run the provider-to-AE fixtures:

```bash
pnpm verify:e2e
```

The command skips when the dev panel is unreachable or no provider is configured. Treat fixture failures as actionable; inspect the PNG in `.session/e2e-failures/` and the panel error log.

## 4. Mine failures into context

1. Run `pnpm errors:summarize`.
2. Review the **Zero-recipe failures** cluster first.
3. Delegate each bounded recipe or gotcha candidate to Codex with `/codex:rescue`. Give it the failure cluster, relevant generated knowledge, ES3 constraints, and acceptance criteria.
4. Verify new or changed recipes with `pnpm recipes:verify --only <id>`.
5. On PASS, use `--promote` if needed, regenerate with `node scripts/generate-knowledge.mjs --recipes-source ./recipes`, then run `pnpm recipes:check` and `pnpm test`.

Do not describe recipes as examples. They are composable action building blocks.

## 5. Optional UI preview

For layout-only validation, run `pnpm debug` and use Claude-in-Chrome at `http://localhost:5002`. Capture the provider picker, active chat, and error/action states that changed. The preview has no AE or provider backend, so do not use it to judge ExtendScript execution.

## 6. Finish

Summarize recipe passes, failures, promotions, E2E outcomes, new context, generated files, and test results. If requested, create one logical commit per corpus change and open a PR. Include `.session` reports only as local evidence; do not commit them.
