#!/usr/bin/env node
/**
 * Smoke-check the actual few-shot implementation.
 *
 * The app sources are TypeScript ESM. To keep this dependency-light and avoid
 * adding a test runner, this script transpiles the knowledge modules to a
 * temporary CommonJS tree, imports the real implementation, and verifies the
 * contract from plans/few-shot-examples.md.
 */

import { createRequire } from "module";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { dirname, join, relative, resolve } from "path";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const repoRoot = resolve(".");
const knowledgeRoot = resolve("src/js/lib/knowledge");
const maxExamples = 2;

function fail(message) {
  console.error("FAIL: " + message);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function listTypeScriptFiles(directory) {
  const files = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listTypeScriptFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      files.push(entryPath);
    }
  }

  return files;
}

function formatDiagnostic(diagnostic) {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
  if (!diagnostic.file || diagnostic.start === undefined) return message;
  const pos = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
  return `${diagnostic.file.fileName}:${pos.line + 1}:${pos.character + 1} ${message}`;
}

function transpileKnowledgeModules() {
  const outRoot = mkdtempSync(join(tmpdir(), "ae-ai-chat-few-shot-"));
  writeFileSync(join(outRoot, "package.json"), '{"type":"commonjs"}\n');

  for (const sourcePath of listTypeScriptFiles(knowledgeRoot)) {
    const relativePath = relative(repoRoot, sourcePath);
    const outputPath = join(outRoot, relativePath).replace(/\.ts$/, ".js");
    mkdirSync(dirname(outputPath), { recursive: true });

    const result = ts.transpileModule(readFileSync(sourcePath, "utf-8"), {
      fileName: sourcePath,
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: false,
        verbatimModuleSyntax: false,
      },
      reportDiagnostics: true,
    });

    const errors = (result.diagnostics || []).filter(
      (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error
    );
    assert(errors.length === 0, "transpile failed:\n" + errors.map(formatDiagnostic).join("\n"));

    writeFileSync(outputPath, result.outputText);
  }

  return createRequire(join(outRoot, "package.json"));
}

function validateExampleShape(examples) {
  const requiredIds = [
    "effect-manipulation",
    "expression-on-property",
    "keyframe-temporal-ease",
    "text-layer-creation",
    "trim-paths-animation",
  ];
  const ids = new Set();

  for (const example of examples) {
    assert(typeof example.id === "string" && example.id, "example id must be a non-empty string");
    assert(!ids.has(example.id), "duplicate example id: " + example.id);
    ids.add(example.id);
    assert(
      typeof example.description === "string" && example.description,
      example.id + " description must be a non-empty string"
    );
    assert(Array.isArray(example.keywords) && example.keywords.length > 0, example.id + " needs keywords");
    assert(typeof example.script === "string" && example.script, example.id + " script must be non-empty");
  }

  for (const id of requiredIds) {
    assert(ids.has(id), "missing required initial example: " + id);
  }
}

function validateKnowledgeSourceOrder() {
  const source = readFileSync(resolve("src/js/lib/knowledge/index.ts"), "utf-8");
  const match = source.match(/const sources: KnowledgeSource\[\] = \[([\s\S]*?)\];/);
  assert(match, "could not find knowledge sources array");

  const names = match[1]
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  assert(names[names.length - 1] === "examplesKnowledge", "examplesKnowledge should be the last source");
}

function countFormattedExamples(context) {
  return (context.match(/^### /gm) || []).length;
}

const requireKnowledge = transpileKnowledgeModules();
const { EXAMPLES } = requireKnowledge("./src/js/lib/knowledge/data/examples.js");
const { examplesKnowledge } = requireKnowledge("./src/js/lib/knowledge/examples.js");
const { getKnowledgeContext } = requireKnowledge("./src/js/lib/knowledge/index.js");

validateExampleShape(EXAMPLES);
validateKnowledgeSourceOrder();

assert(examplesKnowledge.getStaticContext() === "", "examples should not add static context");

const textPrompt = "Create a text layer that says Welcome at 48pt";
const textContext = examplesKnowledge.getMessageContext(textPrompt);
const textExample = EXAMPLES.find((example) => example.id === "text-layer-creation");
assert(textExample, "text-layer-creation example is missing");
assert(textContext.includes("## Verified Working Examples"), "text prompt should inject examples block");
assert(textContext.includes(textExample.description), "text prompt should inject text-layer-creation");
assert(textContext.includes("textProp.value"), "text example should include TextDocument .value read");
assert(textContext.includes("textProp.setValue(textDoc)"), "text example should include TextDocument setValue");

const fullTextContext = getKnowledgeContext(textPrompt);
const effectsIndex = fullTextContext.indexOf("## Verified Effects");
const examplesIndex = fullTextContext.indexOf("## Verified Working Examples");
const rulesIndex = fullTextContext.indexOf("## Rules for Script Generation");
assert(effectsIndex !== -1 && examplesIndex !== -1, "full context should include effects and examples");
assert(effectsIndex < examplesIndex, "examples should appear after reference data");
assert(examplesIndex < rulesIndex, "examples should appear before final generation rules");

const effectPrompt = "Add a Gaussian Blur effect to the selected layer";
assert(
  examplesKnowledge.getMessageContext(effectPrompt) === "",
  "effect-only Gaussian Blur prompt should not inject few-shot examples"
);
assert(
  !getKnowledgeContext(effectPrompt).includes("## Verified Working Examples"),
  "full effect-only context should not include few-shot examples"
);

const trimPrompt = "Animate trim paths on a shape layer so it draws on over 2 seconds";
const trimContext = examplesKnowledge.getMessageContext(trimPrompt);
const trimExample = EXAMPLES.find((example) => example.id === "trim-paths-animation");
assert(trimExample, "trim-paths-animation example is missing");
assert(trimContext.includes(trimExample.description), "trim paths prompt should inject trim-paths-animation");
assert(trimContext.includes("ADBE Vector Filter - Trim"), "trim paths example should include Trim Paths matchName");
assert(trimContext.includes("setValueAtTime"), "trim paths example should include keyframing pattern");

const manyMatchesContext = examplesKnowledge.getMessageContext(
  "Create a text layer, animate trim paths, add an expression, and apply keyframe ease"
);
assert(
  countFormattedExamples(manyMatchesContext) === maxExamples,
  "few-shot injection should be capped at two examples"
);

console.log("OK: actual few-shot implementation injects for targeted prompts and stays out of effect-only prompts.");
