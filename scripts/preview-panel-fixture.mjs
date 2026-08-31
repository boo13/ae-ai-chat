import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { compile } from "svelte/compiler";

const require = createRequire(import.meta.url);
const { build } = require(require.resolve("esbuild", { paths: [require.resolve("vite")] }));
const root = resolve(import.meta.dirname, "..");
const output = resolve(root, ".session/panel-preview");
mkdirSync(output, { recursive: true });

const fixture = `
export const state = { project: 'one', type: 'text', runs: 0, reviews: 0, script: '', failedScripts: new Set() };
export function report() { document.getElementById('fixture-evidence').textContent = 'Executions: ' + state.runs + ' · Reviews: ' + state.reviews; }
export function installControls() {
  document.getElementById('fixture-project').addEventListener('change', (event) => { state.project = event.target.value; window.dispatchEvent(new Event('focus')); });
  document.getElementById('fixture-selection').addEventListener('change', (event) => { state.type = event.target.value; window.dispatchEvent(new Event('focus')); });
  report();
}
export async function evalTS(name) {
  if (name === 'getProjectRoot') return undefined;
  if (name === 'getContextSnapshot') return { inline: {
    project: { projectName: state.project + '.aep', projectPath: '/fixture/' + state.project + '.aep', numItems: 1 },
    comp: { name: 'Fixture comp', width: 1920, height: 1080, fps: 30, duration: 5, numLayers: 1, layers: [], selectedLayers: state.type === 'none' ? [] : [{ name: 'Selected layer', index: 1, type: state.type }] },
    items: { items: [], total: 1 }, analysis: { summary: '', updatedAt: '' }, selectedLayers: { layers: [] }, selectedProperties: { properties: [] }
  } };
  return [];
}
export function openLinkInBrowser() {}
export function initBolt() {}
export async function sendMessage(prompt, options, history) {
  await new Promise(resolve => setTimeout(resolve, 250));
  if (options.signal?.aborted) return { result: 'Cancelled', is_error: true, cancelled: true, duration_ms: 250 };
  const marker = prompt.includes('empty') ? 'EMPTY' : prompt.includes('fail') ? 'FAIL' : 'OK';
  const code = 'app.beginUndoGroup("Fixture");\\n// ' + marker + '\\nvar comp = app.project.activeItem;\\ncomp.layers.addText("Hello");\\napp.endUndoGroup();';
  const result = 'Add a text treatment. History received: ' + history.length + '.\\n<ai-action run="' + !prompt.includes('stage') + '">' + code + '</ai-action>';
  options.onChunk?.(result);
  await new Promise(resolve => setTimeout(resolve, 250));
  if (options.signal?.aborted) { options.onChunk?.('LATE CANCELLED CHUNK'); return { result: 'Cancelled', is_error: true, cancelled: true, duration_ms: 500 }; }
  return { result, is_error: false, duration_ms: 250, sessionId: 'fixture-session' };
}
export async function reviewAction(prompt, options) {
  state.reviews++; report();
  await new Promise(resolve => setTimeout(resolve, 200));
  return { result: prompt.includes('unsafe review') ? '<ai-action run="true">app.quit()</ai-action>' : 'The evidence confirms the reported changes. Visual appearance still needs inspection.', is_error: Boolean(options.signal?.aborted), cancelled: options.signal?.aborted, duration_ms: 200 };
}
export const providerRegistry = [
  { id: 'claude', displayName: 'Claude', models: [{value:'haiku',label:'Haiku'},{value:'sonnet',label:'Sonnet'}], supportsImages: false, isAvailable: async () => ({available:true}), sendMessage, reviewAction },
  { id: 'codex', displayName: 'Codex', models: [{value:'gpt-5.4',label:'GPT-5.4'}], supportsImages:false, isAvailable:async () => ({available:true}), sendMessage }
];
`;
writeFileSync(resolve(output, "fixture.js"), fixture);
const actionFixture = `
import { state, report } from './fixture.js';
import { validateScript } from '${resolve(root, "src/js/lib/knowledge/validator.ts")}';
export function parseAiActionResponse(text) { const match = text.match(/<ai-action\\b([^>]*)>([\\s\\S]*?)<\\/ai-action>/i); return { displayText: text.replace(/<ai-action[\\s\\S]*?<\\/ai-action>/i,''), scriptContent: match?.[2], runImmediately: match?.[1].includes('true'), validation: match ? validateScript(match[2]) : undefined }; }
export function scanActionRisk() { return { risky: false, reasons: [] }; }
export function saveAiAction(root, script, summary) { state.script = script; return { summary }; }
export function clearAiAction() { state.script = ''; }
export function readAiActionScript() { return state.script; }
export function annotateScriptWithError(script) { return script; }
export function revealAiActionInFinder() { return { ok: true }; }
export async function runAiAction() { state.runs++; report(); if (state.script.includes('FAIL') && !state.failedScripts.has(state.script)) { state.failedScripts.add(state.script); return { error: 'Fixture execution error', stateDiff: ['Partial change'] }; } return { stateDiff: state.script.includes('EMPTY') ? [] : ['Added text layer: Hello'] }; }
`;
writeFileSync(resolve(output, "actions.js"), actionFixture);
writeFileSync(resolve(output, "entry.js"), `import { mount } from 'svelte'; import App from '${resolve(root, "src/js/main/main.svelte")}'; import { installControls } from './fixture.js'; installControls(); mount(App,{target:document.getElementById('app')});`);

await build({
  entryPoints: [resolve(output, "entry.js")], outfile: resolve(output, "panel.js"),
  bundle: true, format: "iife", platform: "browser", conditions: ["browser"],
  define: { __AE_TEST_HARNESS__: "false" },
  plugins: [{ name: "panel-fixture", setup(builder) {
    builder.onResolve({ filter: /(?:utils\/bolt|provider-config)$/ }, () => ({ path: resolve(output, "fixture.js") }));
    builder.onResolve({ filter: /\/ai-action$/ }, () => ({ path: resolve(output, "actions.js") }));
    builder.onResolve({ filter: /\/update-check$/ }, () => ({ path: "update-check", namespace: "fixture" }));
    builder.onResolve({ filter: /cep\/node$/ }, () => ({ path: "node", namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path }) => ({ contents: path === "node" ? "export const fs={},path={},os={},child_process={},crypto={};" : "export async function checkForUpdate(){return null} export function dismissUpdate(){}", loader: "js" }));
    builder.onLoad({ filter: /\.svelte$/ }, ({ path }) => ({ contents: compile(readFileSync(path, "utf8"), { filename: path, generate: "client", css: "injected" }).js.code, loader: "js", resolveDir: dirname(path) }));
  } }],
});

writeFileSync(resolve(output, "index.html"), `<!doctype html><html><head><meta charset="utf-8"><title>AE AI Chat — isolated UI fixture</title><style>html,body{height:100%;}#fixture{height:80px;padding:8px 12px;font:12px sans-serif;text-align:left;background:#161616;color:#ccc}#fixture label{margin-right:12px}#fixture select{background:#242424;color:#ccc}#fixture p{margin:6px 0}#app .app{height:calc(100vh - 80px)}</style></head><body><div id="fixture"><label>Fixture project <select id="fixture-project"><option value="one">one.aep</option><option value="two">two.aep</option></select></label><label>Fixture selection <select id="fixture-selection"><option value="text">Text</option><option value="av">Footage</option><option value="shape">Shape</option><option value="none">None</option></select></label><p id="fixture-evidence"></p><small>Mock providers and AE. No scripts or model requests leave this fixture.</small></div><div id="app"></div><script src="panel.js"></script></body></html>`);
console.log(resolve(output, "index.html"));
