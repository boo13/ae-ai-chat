import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPresetPrompt,
  conversationMarkdown,
  createConversation,
  createPreset,
  createWorkspaceState,
  loadWorkspace,
  saveWorkspace,
  type ActionRecord,
} from "../src/js/lib/workspace-state";

const key = "ae-ai-chat.workspace.v1";

function memory(value: string | null = null) {
  return {
    value,
    writes: 0,
    getItem(name: string) { assert.equal(name, key); return this.value; },
    setItem(name: string, next: string) {
      assert.equal(name, key);
      this.value = next;
      this.writes++;
    },
  };
}

function action(status: ActionRecord["status"] = "staged"): ActionRecord {
  return { id: "action-1", script: "var x = 1;", summary: "Create treatment", prompt: "Make it blue", status, warnings: [], errors: [], changes: [] };
}

test("roundtrips project conversations and preferences without diagnostics or sessions", () => {
  const state = createWorkspaceState();
  const first = createConversation("/one/edit.aep", "edit", "codex", "model-one");
  const second = createConversation("/two/edit.aep", "edit", "claude", "model-two");
  first.messages.push({ role: "user", content: "Make it blue", timestamp: 1, diagnosticsRaw: "credential", action: action() });
  first.draft = "Unfinished prompt";
  Object.assign(first, { sessionId: "old-session", apiKey: "secret" });
  state.conversations = [first, second];
  state.activeConversationId = first.id;
  state.models = { codex: "model-one", claude: "model-two" };
  const storage = memory();
  assert.deepEqual(saveWorkspace(storage, state), {});
  const restored = loadWorkspace(storage);
  assert.equal(restored.error, undefined);
  assert.equal(restored.state.verifyActions, true);
  assert.equal(restored.state.activeConversationId, first.id);
  assert.equal(restored.state.conversations.find((item) => item.id === first.id)?.draft, first.draft);
  assert.equal(new Set(restored.state.conversations.map((item) => item.projectKey)).size, 2);
  assert.equal(restored.state.models.codex, "model-one");
  assert.doesNotMatch(storage.value!, /credential|diagnosticsRaw|old-session|apiKey|secret/);
});

test("invalid JSON, versions, and nested structures recover without overwriting storage", () => {
  for (const value of ["{", "null", "[]", '{"version":2}', JSON.stringify({ ...createWorkspaceState(), conversations: [null] }), JSON.stringify({ ...createWorkspaceState(), conversations: {} })]) {
    const storage = memory(value);
    const result = loadWorkspace(storage);
    assert.ok(result.error);
    assert.equal(result.state.conversations.length, 0);
    assert.equal(storage.value, value);
    assert.equal(storage.writes, 0);
  }
});

test("storage access and quota failures surface actionable errors and leave data intact", () => {
  const denied = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("quota"); } };
  assert.match(loadWorkspace(denied).error!, /storage|access/i);
  assert.match(saveWorkspace(denied, createWorkspaceState()).error!, /export|space|storage/i);
});

test("restored running actions become inconclusive and cannot claim completion", () => {
  const state = createWorkspaceState();
  const conversation = createConversation("project", "Project", "codex", "model");
  conversation.messages.push({ role: "assistant", content: "Working", timestamp: 1, action: action("running") });
  state.conversations.push(conversation);
  const storage = memory();
  saveWorkspace(storage, state);
  assert.equal(conversation.messages[0].action?.status, "running");
  const restored = loadWorkspace(storage).state.conversations[0].messages[0].action!;
  assert.equal(restored.status, "inconclusive");
  assert.match(restored.verification!, /interrupt|closed/i);
});

test("bounds history while preserving the active conversation and newest messages", () => {
  const state = createWorkspaceState();
  state.conversations = Array.from({ length: 35 }, (_, i) => ({ ...createConversation(`project-${i}`, "Project", "codex", "model"), updatedAt: i }));
  const active = state.conversations[0];
  state.activeConversationId = active.id;
  active.messages = Array.from({ length: 205 }, (_, i) => ({ role: "user", content: String(i), timestamp: i }));
  const storage = memory();
  assert.deepEqual(saveWorkspace(storage, state), {});
  const restored = loadWorkspace(storage).state;
  assert.equal(restored.conversations.length, 30);
  assert.ok(restored.conversations.some((item) => item.updatedAt === 34));
  const savedActive = restored.conversations.find((item) => item.id === active.id)!;
  assert.equal(savedActive.messages.length, 200);
  assert.equal(savedActive.messages[0].content, "5");
  assert.equal(active.messages.length, 205);
});

test("oversized runnable scripts are omitted whole, and drafts and text are bounded", () => {
  const state = createWorkspaceState();
  const conversation = createConversation("project", "Project", "codex", "model");
  conversation.draft = "x".repeat(25000);
  conversation.messages = [{ role: "assistant", content: "x".repeat(60000), timestamp: 1, action: { ...action(), script: "x".repeat(150001) } }];
  state.conversations.push(conversation);
  const storage = memory();
  assert.deepEqual(saveWorkspace(storage, state), {});
  const restored = loadWorkspace(storage).state.conversations[0];
  assert.equal(restored.draft.length, 20000);
  assert.ok(restored.messages[0].content.length <= 50000);
  assert.equal(restored.messages[0].action, undefined);
});

test("total size errors preserve existing storage instead of silently dropping more history", () => {
  const state = createWorkspaceState();
  const conversation = createConversation("project", "Project", "codex", "model");
  conversation.messages = Array.from({ length: 200 }, () => ({ role: "user", content: "x".repeat(50000), timestamp: 1 }));
  state.conversations.push(conversation);
  const storage = memory("original");
  assert.match(saveWorkspace(storage, state).error!, /large|limit/i);
  assert.equal(storage.value, "original");
  assert.equal(storage.writes, 0);
});

test("model preference keys cannot modify object prototypes", () => {
  const state = createWorkspaceState();
  const storage = memory(JSON.stringify(state).replace('"models":{}', '"models":{"__proto__":"bad","constructor":"bad","codex":"good"}'));
  const restored = loadWorkspace(storage).state;
  assert.equal(Object.hasOwn(restored.models, "__proto__"), false);
  assert.equal(Object.hasOwn(restored.models, "constructor"), false);
  assert.equal(restored.models.codex, "good");
});

test("preset prompts target the current selection and validate parameters", () => {
  const preset = { ...createPreset("Blue treatment", "Add a soft blue glow"), color: "#3366FF", intensity: 75, duration: 2.5 };
  const prompt = buildPresetPrompt(preset);
  assert.match(prompt, /current selection/i);
  assert.match(prompt, /#3366FF/);
  assert.match(prompt, /75/);
  assert.match(prompt, /2.5/);
  for (const invalid of [{ color: "blue" }, { intensity: -1 }, { intensity: 101 }, { duration: 0 }, { duration: 601 }, { intensity: Number.NaN }]) {
    assert.throws(() => buildPresetPrompt({ ...preset, ...invalid }));
  }
  assert.doesNotThrow(() => buildPresetPrompt({ ...preset, color: "" }));
});

test("export includes action evidence and script with no diagnostics", () => {
  const conversation = createConversation("project", "Project", "codex", "model");
  conversation.messages.push({ role: "assistant", content: "Treatment ready", timestamp: 1, diagnosticsRaw: "private trace", action: { ...action("succeeded"), changes: ["Opacity changed"], verification: "Change observed" } });
  const markdown = conversationMarkdown(conversation);
  assert.match(markdown, /Assistant/);
  assert.match(markdown, /Treatment ready/);
  assert.match(markdown, /Opacity changed/);
  assert.match(markdown, /var x = 1;/);
  assert.doesNotMatch(markdown, /private trace|diagnosticsRaw/);
});
