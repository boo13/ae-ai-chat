import assert from "node:assert/strict";
import test from "node:test";
import {
  EXPRESSION_FUNCTION_NAMES,
  EXPRESSION_INDEX,
  EXPRESSIONS_DETAIL,
} from "../src/js/lib/knowledge/data/expressions";
import {
  MAX_EXPRESSION_CONTEXT_CHARS,
  expressionsKnowledge,
  selectExpressionRecords,
} from "../src/js/lib/knowledge/expressions";

test("generated expression corpus has bounded static provenance-backed records", () => {
  assert.ok(EXPRESSIONS_DETAIL.length >= 100);
  assert.ok(EXPRESSION_FUNCTION_NAMES.length >= 100);
  assert.ok(EXPRESSION_INDEX.length <= 6000);
  for (const record of EXPRESSIONS_DETAIL) {
    assert.match(record.source, /docsforadobe\/after-effects-expression-reference@[0-9a-f]{40}/);
    assert.ok(record.signature.includes("("));
    assert.ok(record.verifiedStatus);
  }
});

test("expression prompts inject matching detailed records under budget", () => {
  const prompt = "Wiggle position and then loopOut the keyframes";
  const records = selectExpressionRecords(prompt);
  const names = records.map((record) => record.name);
  const context = expressionsKnowledge.getMessageContext?.(prompt) || "";
  assert.ok(names.includes("wiggle"));
  assert.ok(names.includes("loopOut"));
  assert.ok(context.length <= MAX_EXPRESSION_CONTEXT_CHARS);
  assert.match(context, /Requires at least two keyframes/);
});
