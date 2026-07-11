# Finish the expression-verifier quality pass (Codex-implemented, reviewed)

## Context

Codex `gpt-5.6-sol` completed both briefs; I reviewed the diffs and they are correct:

- **ae-ai-starter (uncommitted):** `verify_expressions.jsx` gained real fixtures (mask "Mask 1" + rect shape, comp/layer markers, scale keyframes, "Fast Blur"-renamed Gaussian Blur, Bulge, layer comment "Control"), a genuine mask-path host, universal `value;` probe suffix, `probe`-field support, footage-data skip classification, and per-status count alert. 41 probes authored across 12 function JSONs (all spot-checked against the fixtures), mangled `rgbToHsl` example fixed, README documents the probe field. 64/119 records now runnable (was 48).
- **ae-ai-chat (uncommitted):** `generate-knowledge.mjs` now promotes ONLY sidecar `verified` status (all else stays `pending`; `[failed]` can never reach the catalog); `probe` accepted but never emitted; catalog regenerated (22 verified / 97 pending); new `tests/generate-knowledge.test.ts`; 51/51 tests pass, typecheck clean.

**One defect found in review:** `EXPRESSION_INDEX` is capped at 6,000 chars and written in corpus-file order — only 65/119 lines fit and one of the 22 verified records is cut off. Verified records must sort ahead of pending before the cap applies.

## Remaining steps

1. **Codex micro-fix (gpt-5.6-sol, ae-ai-chat):** in `scripts/generate-knowledge.mjs`, sort index emission verified-first (stable within groups, corpus order preserved otherwise) before applying the 6,000-char cap; regenerate; confirm all 22 `[verified]` lines present; re-run `node scripts/run-unit-tests.mjs` + `pnpm typecheck`.
2. **Review + commit + push (Claude):**
   - ae-ai-starter: commit `Scripts/verified/tools/verify_expressions.jsx`, `Scripts/verified/expressions/` (functions, README, verification sidecar) — message "Add probe-based expression verification fixtures". Push.
   - ae-ai-chat: commit `scripts/generate-knowledge.mjs`, `src/js/lib/knowledge/data/expressions.ts`, `tests/generate-knowledge.test.ts` — message "Promote only verified expression records". Push.
   - Exclude unrelated local edits: `.claude/settings.json`, `src/js/lib/providers/codex.ts`, starter `AGENTS.md`/`README.md`, untracked docs/tools files.
3. **Manual AE checkpoint (user):** re-run `verify_expressions.jsx` (File > Scripts). The completion alert now reports verified/failed/skipped counts. Expect verified to jump from 22 toward ~60. Report any `failed` entries — each now carries a per-record error in the sidecar.
4. **After the new sidecar:** regenerate + commit the catalog (`node scripts/generate-knowledge.mjs`), which will promote the newly verified records.

## Verification

- Generator prints "N verified, M pending"; grep confirms 22 `[verified]` lines in `EXPRESSION_INDEX` and zero `[failed]`/`probe` occurrences.
- `node scripts/run-unit-tests.mjs` 51/51; `pnpm typecheck` clean.
- Final proof is step 3's AE run — the harness is now self-diagnosing per record.
