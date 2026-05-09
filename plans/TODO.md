# TODO

## Few-Shot Examples

Plan source: `plans/few-shot-examples.md`.

### Phase 1 — Infrastructure + First 3-5 Examples
- [x] Add examples generation to `scripts/generate-knowledge.mjs`
- [x] Generate `src/js/lib/knowledge/data/examples.ts`
- [x] Add `src/js/lib/knowledge/examples.ts`
- [x] Register `examplesKnowledge` last in `src/js/lib/knowledge/index.ts`
- [x] Add and AE-verify the initial 5 examples
- [x] Verify injection behavior with `pnpm few-shot:check`

### Error Capture — Phase 2 Prerequisite
- [x] Add a dev-only append-only failure log at `.session/error-log.jsonl`
- [x] Capture injected example IDs without changing knowledge source string return values
- [x] Log validation, warning-blocked auto-run, runtime, and expression failures from auto-run paths
- [x] Log runtime and expression failures from manual AI Action runs
- [x] Add `pnpm errors:summarize` to group observed failures for example selection
- [ ] Collect enough dev failures to identify repeat patterns before adding examples

### Phase 2 — Expanded Example Set (Blocked)
Blocked until Error Capture has observed failures. Do not add examples based on intuition alone.

- [ ] Review `pnpm errors:summarize` output and choose repeat failure categories
- [ ] Add 10-15 more examples in `../ae-ai-starter/Scripts/verified/examples/` based on observed failure patterns
- [ ] AE-verify each new example script
- [ ] Regenerate knowledge with `node scripts/generate-knowledge.mjs`
- [ ] Confirm all new examples appear in `src/js/lib/knowledge/data/examples.ts`
- [ ] For each new example category, send a representative chat prompt and verify the expected example is injected
