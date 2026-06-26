import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import {
  EXPRESSION_HELPER_MARKER,
  EXPRESSION_HELPER_PREAMBLE,
  prepareExpressionCapture,
  rewriteExpressionAssignments,
} from "../src/js/lib/expression-rewriter";

test("rewrites direct expression assignments through the global helper", () => {
  const input = [
    'opacity.expression = "wiggle(2, 20)"; // preserve this comment',
    'var url = "https://example.com";',
  ].join("\n");
  const result = rewriteExpressionAssignments(input);

  assert.equal(result.rewriteCount, 1);
  assert.match(
    result.content,
    /\$\.global\.__aiSetExpr\(opacity, "wiggle\(2, 20\)", 1\); \/\/ preserve this comment/
  );
  assert.match(result.content, /https:\/\/example\.com/);
});

test("leaves line and block comments unchanged", () => {
  const input = [
    '// opacity.expression = "bad";',
    "/*",
    'position.expression = "also bad";',
    "*/",
    'scale.expression = "value";',
  ].join("\n");
  const result = rewriteExpressionAssignments(input);

  assert.equal(result.rewriteCount, 1);
  assert.match(result.content, /^\/\/ opacity\.expression/m);
  assert.match(result.content, /^position\.expression/m);
  assert.match(result.content, /\$\.global\.__aiSetExpr\(scale, "value", 5\)/);
});

test("preparation is byte-stable and does not rewrite the helper", () => {
  const first = prepareExpressionCapture('opacity.expression = "value";');
  const second = prepareExpressionCapture(first.content);

  assert.equal(first.rewriteCount, 1);
  assert.equal(second.rewriteCount, 0);
  assert.equal(second.content, first.content);
  assert.equal(
    second.content.split(EXPRESSION_HELPER_MARKER).length - 1,
    1
  );
  assert.match(second.content, /prop\.expression = expr;/);
});

test("the marker comment alone does not disable rewriting", () => {
  // A legitimate, unprepared script that happens to contain the marker comment
  // but not the injected helper must still be rewritten.
  const input = [
    EXPRESSION_HELPER_MARKER,
    'opacity.expression = "wiggle(2, 20)";',
  ].join("\n");
  const result = rewriteExpressionAssignments(input);

  assert.equal(result.rewriteCount, 1);
  assert.match(result.content, /\$\.global\.__aiSetExpr\(opacity, "wiggle\(2, 20\)", 2\)/);
});

test("helper initializes independently and collects expression errors", () => {
  const context = {
    $: {
      global: {
        __aiExprErrors: [] as Array<Record<string, unknown>>,
      },
    },
  };

  vm.runInNewContext(EXPRESSION_HELPER_PREAMBLE, context);

  const helper = (
    context.$.global as typeof context.$.global & {
      __aiSetExpr: (
        prop: Record<string, unknown> | null,
        expr: string,
        line: number
      ) => void;
    }
  ).__aiSetExpr;
  assert.equal(typeof helper, "function");

  helper(null, "value", 4);
  helper(
    {
      name: "Opacity",
      canSetExpression: true,
      expressionError: "undefined identifier",
      valueAtTime() {
        return 100;
      },
    },
    "missingName",
    8
  );

  assert.deepEqual(
    context.$.global.__aiExprErrors.map((error) => ({
      line: error.line,
      error: error.error,
    })),
    [
      { line: 4, error: "property is null/undefined" },
      { line: 8, error: "undefined identifier" },
    ]
  );
});
