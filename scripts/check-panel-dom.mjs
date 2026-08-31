import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Window } from "happy-dom";

execFileSync(process.execPath, ["scripts/preview-panel-fixture.mjs"], { stdio: "pipe" });
const directory = resolve(".session/panel-preview");
const html = readFileSync(resolve(directory, "index.html"), "utf8").replace('<script src="panel.js"></script>', "");
const code = readFileSync(resolve(directory, "panel.js"), "utf8");
let window;
const errors = [];

async function until(predicate, description) {
  const deadline = Date.now() + 5000;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error("Timed out: " + description + "\n" + window.document.body.textContent.slice(-3500));
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

function button(text, scope = window.document) {
  const found = Array.from(scope.querySelectorAll("button")).find((item) => item.textContent.trim() === text);
  assert.ok(found, "Button exists: " + text);
  assert.equal(found.disabled, false, "Button enabled: " + text);
  return found;
}

function field(label) {
  const element = window.document.querySelector(`[aria-label="${label}"]`);
  assert.ok(element, "Field exists: " + label);
  return element;
}

function fill(element, value) {
  element.value = value;
  element.dispatchEvent(new window.Event("input", { bubbles: true }));
}

function select(element, value) {
  element.value = value;
  element.dispatchEvent(new window.Event("change", { bubbles: true }));
}

function latestCard() {
  return Array.from(window.document.querySelectorAll(".action-card")).at(-1);
}

async function boot(saved = {}) {
  window = new Window({ url: "https://panel.invalid", settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } });
  window.fetch = () => { throw new Error("Network requests are forbidden in the panel DOM test"); };
  window.addEventListener("error", (event) => errors.push(event.message));
  for (const [key, value] of Object.entries(saved)) window.localStorage.setItem(key, value);
  window.document.write(html);
  window.eval(code);
  await until(() => window.document.querySelector(".picker") || window.document.querySelector(".workspace-bar"), "panel initialization");
}

async function send(text) {
  fill(field("Message"), text);
  await until(() => !window.document.querySelector(".send-btn").disabled, "composer becomes ready");
  button("Send").click();
  await until(() => window.document.querySelector(".stop-btn"), "request starts");
  await until(() => !window.document.querySelector(".stop-btn"), "request finishes");
}

try {
  await boot();
  await until(() => Array.from(window.document.querySelectorAll(".provider-card")).some((item) => item.textContent.includes("Ready")), "providers available");
  const claude = Array.from(window.document.querySelectorAll("button")).find((item) => item.textContent.includes("Claude"));
  assert.ok(claude);
  claude.click();
  await until(() => window.document.querySelector(".workspace-bar"), "provider selected");

  fill(field("Message"), "Unfinished draft");
  button("New chat").click();
  await until(() => field("Message").value === "", "new chat clears composer");
  const chats = field("Conversation");
  const originalId = Array.from(chats.options).find((item) => item.value !== chats.value).value;
  select(chats, originalId);
  await until(() => field("Message").value === "Unfinished draft", "switch restores draft");
  console.log("PASS: independent conversations retain drafts");

  await send("stage a text treatment");
  assert.match(latestCard().textContent, /Ready to run/);
  assert.match(window.document.getElementById("fixture-evidence").textContent, /Executions: 0/);
  button("Review script", latestCard()).click();
  await until(() => latestCard().querySelector("textarea"), "script visible");
  assert.match(latestCard().querySelector("textarea").value, /beginUndoGroup/);
  button("Run", latestCard()).click();
  button("Run", latestCard()).click();
  await until(() => latestCard().textContent.includes("Visual appearance"), "action evidence reviewed");
  await until(() => !window.document.querySelector(".stop-btn"), "manual run finishes");
  assert.match(window.document.getElementById("fixture-evidence").textContent, /Executions: 1 · Reviews: 1/);
  console.log("PASS: staged action review and explicit run, one model review");

  button("Save preset", latestCard()).click();
  button("Presets").click();
  await until(() => window.document.querySelector(".preset-editor"), "preset editor opens");
  fill(field("Preset color"), "#C84A24");
  fill(field("Preset intensity"), "75");
  fill(field("Preset duration"), "2");
  window.document.querySelector(".preset-editor").dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
  await until(() => field("Message").value.includes("#C84A24"), "preset prepares composer");
  assert.match(field("Message").value, /Intensity: 75%/);
  assert.match(field("Message").value, /Duration: 2 seconds/);
  assert.match(window.document.getElementById("fixture-evidence").textContent, /Executions: 1/);
  button("Presets").click();
  console.log("PASS: preset parameters prepare a prompt without execution");

  window.document.querySelector(".model-menu__trigger").click();
  await until(() => window.document.querySelector(".model-menu__list"), "model menu opens");
  button("Sonnet", window.document.querySelector(".model-menu__list")).click();
  await until(() => window.document.querySelector(".model-menu__trigger").textContent.trim() === "Sonnet", "model selected");

  button("Copy").click();
  await until(() => window.document.body.textContent.includes("Conversation copied."), "conversation copies");
  assert.match(await window.navigator.clipboard.readText(), /stage a text treatment/);
  let exported;
  window.URL.createObjectURL = (blob) => { exported = blob; return "blob:fixture-export"; };
  window.URL.revokeObjectURL = () => {};
  window.HTMLAnchorElement.prototype.click = function () {};
  button("Export").click();
  assert.ok(exported);
  assert.match(await exported.text(), /Status: succeeded/);
  assert.match(await exported.text(), /beginUndoGroup/);
  console.log("PASS: copy and Markdown export include conversation and action evidence");

  const savedDraft = field("Message").value;
  window.dispatchEvent(new window.Event("beforeunload"));
  const saved = Object.fromEntries(Array.from({ length: window.localStorage.length }, (_, i) => { const key = window.localStorage.key(i); return [key, window.localStorage.getItem(key)]; }));
  await window.happyDOM.close();
  await boot(saved);
  await until(() => window.document.querySelector(".workspace-bar"), "saved provider restored");
  assert.equal(field("Message").value, savedDraft);
  assert.equal(window.document.querySelector(".model-menu__trigger").textContent.trim(), "Sonnet");
  assert.match(latestCard().textContent, /Added text layer/);
  assert.match(window.document.getElementById("fixture-evidence").textContent, /Executions: 0/);
  console.log("PASS: reload restores conversation, draft, and action without rerunning");

  window.document.querySelector('[title="Switch provider"]').click();
  await until(() => window.document.querySelector(".provider-menu__list"), "provider menu opens");
  const codex = Array.from(window.document.querySelectorAll('[role="menuitemradio"]')).find((item) => item.textContent.includes("Codex"));
  codex.click();
  await until(() => window.document.querySelector(".panel-header__title").textContent === "Codex", "provider switches");
  assert.match(latestCard().textContent, /Added text layer/);
  assert.equal(field("Message").value, savedDraft);
  console.log("PASS: provider switch preserves transcript and draft");

  select(window.document.getElementById("fixture-project"), "two");
  await until(() => window.document.querySelector(".workspace-bar__project").textContent === "two.aep", "project switches");
  assert.equal(window.document.querySelectorAll(".action-card").length, 0);
  select(window.document.getElementById("fixture-selection"), "av");
  await until(() => window.document.querySelector(".suggestions").textContent.includes("footage"), "footage suggestions");
  select(window.document.getElementById("fixture-project"), "one");
  await until(() => window.document.querySelector(".action-card"), "project conversation restores");
  assert.equal(field("Message").value, savedDraft);
  console.log("PASS: project separation and selection-aware suggestions");

  window.document.querySelector('[title="Switch provider"]').click();
  await until(() => window.document.querySelector(".provider-menu__list"), "provider menu opens");
  Array.from(window.document.querySelectorAll('[role="menuitemradio"]')).find((item) => item.textContent.includes("Claude")).click();
  await until(() => window.document.querySelector(".panel-header__title").textContent === "Claude", "Claude selected");
  assert.equal(window.document.querySelector(".model-menu__trigger").textContent.trim(), "Sonnet");
  await send("empty result");
  assert.match(latestCard().textContent, /Result inconclusive/);
  await send("fail once");
  assert.match(latestCard().textContent, /Fixture execution error/);
  assert.match(window.document.getElementById("fixture-evidence").textContent, /Executions: 2 · Reviews: 2/);
  button("Run again", latestCard()).click();
  await until(() => latestCard().textContent.includes("Added text layer") && !window.document.querySelector(".stop-btn"), "explicit retry succeeds after precondition is fixed");
  assert.match(window.document.getElementById("fixture-evidence").textContent, /Executions: 3 · Reviews: 3/);
  await send("unsafe review output");
  assert.match(latestCard().textContent, /discarded/);
  assert.match(window.document.getElementById("fixture-evidence").textContent, /Executions: 4 · Reviews: 4/);
  console.log("PASS: inconclusive/partial failures and executable review rejection, no repeat mutation");

  const completedReplies = window.document.querySelectorAll(".message--assistant").length;
  fill(field("Message"), "cancel this request");
  await until(() => !window.document.querySelector(".send-btn").disabled, "cancel prompt ready");
  button("Send").click();
  await until(() => window.document.querySelector(".stop-btn"), "cancel request starts");
  await until(() => window.document.querySelectorAll(".message--assistant").length > completedReplies, "partial reply is streamed before cancellation");
  button("Stop").click();
  await until(() => Array.from(window.document.querySelectorAll("button")).some((item) => item.textContent === "New chat" && !item.disabled), "cancel settles");
  assert.match(window.document.getElementById("fixture-evidence").textContent, /Executions: 4 · Reviews: 4/);

  assert.equal(window.document.querySelectorAll(".message--assistant").length, completedReplies);
  window.dispatchEvent(new window.Event("beforeunload"));
  assert.doesNotMatch(window.localStorage.getItem("ae-ai-chat.workspace.v1"), /LATE CANCELLED CHUNK|<ai-action/);

  fill(field("Message"), "project switch during request");
  await until(() => !window.document.querySelector(".send-btn").disabled, "project switch prompt ready");
  button("Send").click();
  await until(() => Array.from(window.document.querySelectorAll(".message--user")).some((item) => item.textContent.includes("project switch during request")), "request captured original context");
  select(window.document.getElementById("fixture-project"), "two");
  await until(() => !window.document.querySelector(".stop-btn"), "stale action settles");
  assert.match(latestCard().textContent, /Nothing was run/);
  assert.match(window.document.getElementById("fixture-evidence").textContent, /Executions: 4 · Reviews: 4/);
  console.log("PASS: cancellation and project changes prevent action execution");
  const storageKey = "ae-ai-chat.workspace.v1";
  const quotaState = JSON.parse(saved[storageKey]);
  const active = quotaState.conversations.find((item) => item.id === quotaState.activeConversationId);
  active.messages = [];
  active.draft = "";
  const large = { ...active, id: "large-chat", title: "Large archived chat", projectKey: "/fixture/older.aep", projectName: "older.aep", messages: Array.from({ length: 32 }, (_, i) => ({ role: "user", content: "x".repeat(i === 31 ? 5000 : 50000), timestamp: i })) };
  quotaState.conversations = [active, large];
  await window.happyDOM.close();
  await boot({ [storageKey]: JSON.stringify(quotaState) });
  fill(field("Message"), "d".repeat(20000));
  window.dispatchEvent(new window.Event("beforeunload"));
  await until(() => window.document.body.textContent.includes("3 MB limit"), "quota error surfaced");
  button("Manage chats").click();
  await until(() => window.document.querySelector('[aria-label="Manage conversation"]'), "chat manager opens");
  select(field("Manage conversation"), large.id);
  await until(() => !button("Remove selected chat").disabled, "managed chat selected");
  button("Remove selected chat").click();
  await until(() => window.document.body.textContent.includes("Confirm removal"), "removal confirmation shown");
  assert.equal(JSON.parse(window.localStorage.getItem(storageKey)).conversations.length, 2);
  button("Confirm removal").click();
  await until(() => !window.document.body.textContent.includes("3 MB limit"), "removing old chat restores persistence");
  assert.equal(JSON.parse(window.localStorage.getItem(storageKey)).conversations.length, 1);
  assert.equal(JSON.parse(window.localStorage.getItem(storageKey)).conversations[0].draft.length, 20000);
  console.log("PASS: confirmed removal across projects recovers from storage quota");

  await window.happyDOM.close();
  await boot({ [storageKey]: "unreadable original data", "ae-ai-chat-provider": "claude" });
  if (window.document.querySelector(".picker")) {
    await until(() => Array.from(window.document.querySelectorAll(".provider-card")).some((item) => item.textContent.includes("Ready")), "recovery provider ready");
    Array.from(window.document.querySelectorAll("button")).find((item) => item.textContent.includes("Claude")).click();
  }
  await until(() => window.document.querySelector(".workspace-bar"), "recovery workspace ready");
  window.dispatchEvent(new window.Event("beforeunload"));
  assert.equal(window.localStorage.getItem(storageKey), "unreadable original data");
  window.URL.createObjectURL = (blob) => { exported = blob; return "blob:fixture-backup"; };
  window.URL.revokeObjectURL = () => {};
  window.HTMLAnchorElement.prototype.click = function () {};
  button("Back up saved data").click();
  assert.equal(await exported.text(), "unreadable original data");
  button("Replace saved data").click();
  await until(() => window.document.body.textContent.includes("Confirm replacement"), "replacement confirmation shown");
  assert.equal(window.localStorage.getItem(storageKey), "unreadable original data");
  button("Confirm replacement").click();
  await until(() => !window.document.querySelector('[role="alert"]'), "storage recovery succeeds");
  assert.equal(JSON.parse(window.localStorage.getItem(storageKey)).version, 1);
  console.log("PASS: unreadable data stays untouched until backed up and explicitly replaced");
  assert.deepEqual(errors, []);
  console.log("Panel DOM checks passed. Visual layout and live After Effects are not covered.");
} finally {
  await window?.happyDOM.close();
}
