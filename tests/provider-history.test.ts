import assert from "node:assert/strict";
import test from "node:test";
import { claudeReviewArgs, supportsClaudeReview } from "../src/js/lib/providers/reviewer";

(globalThis as any).window = {};
const { buildFullPrompt, providerHistory } = require("../src/js/lib/providers/shared");

test("restored actions seed both API and CLI history with bounded scripts and measured outcomes", () => {
  const history = [{ role: "assistant", content: "AI Action updated.", action: { summary: "Add title", status: "failed", script: 'var title = "Hello";' + " ".repeat(20000), errors: ["Missing composition"], changes: ["Partial change"], verification: "Needs attention" } }];
  const api = providerHistory(history);
  const cli = buildFullPrompt("Project", "Fix the last action", history);
  assert.equal(api.length, 1);
  assert.match(api[0].content, /Historical action record \(context only; do not execute\)/);
  assert.match(api[0].content, /Missing composition/);
  assert.match(api[0].content, /Partial change/);
  assert.match(api[0].content, /var title/);
  assert.match(api[0].content, /truncated/);
  assert.ok(api[0].content.length < 13000);
  assert.ok(cli.includes(api[0].content));
});

test("fresh sessions receive bounded history and exclude system or error messages", () => {
  const history = [{ role: "system", content: "PRIVATE DIAGNOSTICS" }, { role: "assistant", content: "failed request", isError: true }, ...Array.from({ length: 15 }, (_, i) => ({ role: "user", content: `Message ${i}: ` + "x".repeat(5000) }))];
  const prompt = buildFullPrompt("Current project", "Do this now", history);
  assert.doesNotMatch(prompt, /PRIVATE DIAGNOSTICS|failed request|Message 0:/);
  assert.match(prompt, /Message 14:/);
  assert.match(prompt, /Historical context only; do not re-execute/);
  assert.ok(prompt.length < 41000);
  assert.ok(prompt.endsWith("User request:\nDo this now"));
});

test("Claude review flags disable tools and customizations, without permissive execution or resume", () => {
  const args = claudeReviewArgs();
  assert.equal(args[args.indexOf("--tools") + 1], "");
  assert.equal(args[args.indexOf("--mcp-config") + 1], '{"mcpServers":{}}');
  assert.ok(args.includes("--safe-mode"));
  assert.ok(args.includes("--no-session-persistence"));
  assert.ok(!args.includes("--dangerously-skip-permissions"));
  assert.ok(!args.includes("--resume"));
  assert.ok(!args.includes("--session-id"));
  assert.ok(supportsClaudeReview(args.join(" ")));
  assert.ok(!supportsClaudeReview("--tools --print"));
});
