import assert from "node:assert/strict";
import test from "node:test";
import { summarizeActionResult, reviewActionResult } from "../src/js/lib/action-evidence";
import type { ActionRecord } from "../src/js/lib/workspace-state";
import type { ProviderDefinition } from "../src/js/lib/providers/provider";

const action: ActionRecord = { id: "a", script: "var x = 1;", summary: "Fade text", prompt: "Fade in the text", status: "succeeded", changes: ["Opacity keys: 0 -> 2"], warnings: [], errors: [] };
const provider: ProviderDefinition = { id: "test", displayName: "Test", models: [], supportsImages: false, isAvailable: async () => ({ available: true }), sendMessage: async () => { throw new Error("Normal provider must never run during review"); } };

test("execution evidence distinguishes changes, failures, and empty diffs", () => {
  assert.equal(summarizeActionResult({ stateDiff: ["Added text layer"] }).status, "succeeded");
  assert.equal(summarizeActionResult({ stateDiff: [] }).status, "inconclusive");
  assert.equal(summarizeActionResult(undefined).status, "inconclusive");
  const failed = summarizeActionResult({ stateDiff: ["Added text layer"], error: "Bad value", errorLine: 7 });
  assert.equal(failed.status, "failed");
  assert.deepEqual(failed.changes, ["Added text layer"]);
  assert.deepEqual(failed.errors, ["Bad value"]);
  assert.equal(failed.errorLine, 7);
  assert.equal(summarizeActionResult({ expressionsSet: [{ name: "Opacity" }] }).status, "succeeded");
  assert.equal(summarizeActionResult({ expressionErrors: [{ name: "Opacity", error: "Undefined" }] }).status, "failed");
});

test("review makes exactly one isolated call, preserving execution state", async () => {
  let calls = 0;
  const reviewProvider = { ...provider, reviewAction: async (prompt: string, options: object) => {
    calls++;
    assert.match(prompt, /Opacity keys/);
    assert.doesNotMatch(JSON.stringify(options), /sessionId|projectRoot|staticContext/);
    return { result: "Two opacity keys were added; timing is not established by this diff.", is_error: false, duration_ms: 1 };
  } };
  const result = await reviewActionResult(action, reviewProvider, "test-model");
  assert.match(result, /Two opacity/);
  assert.equal(calls, 1);
  assert.equal(action.status, "succeeded");
});

test("review rejects executable markup, handles failure and never falls back to normal chat", async () => {
  assert.match(await reviewActionResult(action, provider, "test"), /unavailable/i);
  const malicious = { ...provider, reviewAction: async () => ({ result: '<ai-action run="true">danger()</ai-action>', is_error: false, duration_ms: 0 }) };
  assert.match(await reviewActionResult(action, malicious, "test"), /discarded/i);
  const failed = { ...provider, reviewAction: async () => { throw new Error("Disconnected"); } };
  assert.match(await reviewActionResult(action, failed, "test"), /Disconnected/);
  const abort = new AbortController();
  abort.abort();
  assert.match(await reviewActionResult(action, malicious, "test", abort.signal), /cancelled/i);
});
