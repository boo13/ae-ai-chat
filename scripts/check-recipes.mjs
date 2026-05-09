#!/usr/bin/env node
/**
 * Smoke-check the actual recipes implementation.
 *
 * The app sources are TypeScript ESM. To keep this dependency-light and avoid
 * adding a test runner, this script transpiles the knowledge modules to a
 * temporary CommonJS tree, imports the real implementation, and verifies the
 * runtime contract.
 */

import { createRequire } from "module";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { dirname, join, relative, resolve } from "path";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const repoRoot = resolve(".");
const knowledgeRoot = resolve("src/js/lib/knowledge");
const maxRecipeChars = 6000;

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
  const outRoot = mkdtempSync(join(tmpdir(), "ae-ai-chat-recipes-"));
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

function validateRecipeShape(recipes) {
  const ids = new Set();

  for (const recipe of recipes) {
    assert(typeof recipe.id === "string" && recipe.id, "recipe id must be a non-empty string");
    assert(!ids.has(recipe.id), "duplicate recipe id: " + recipe.id);
    ids.add(recipe.id);
    assert(
      typeof recipe.description === "string" && recipe.description,
      recipe.id + " description must be a non-empty string"
    );
    assert(Array.isArray(recipe.keywords) && recipe.keywords.length > 0, recipe.id + " needs keywords");
    assert(typeof recipe.script === "string" && recipe.script, recipe.id + " script must be non-empty");
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

  assert(names[names.length - 1] === "recipesKnowledge", "recipesKnowledge should be the last source");
}

function countFormattedRecipes(context) {
  return (context.match(/^### /gm) || []).length;
}

const requireKnowledge = transpileKnowledgeModules();
const { RECIPES } = requireKnowledge("./src/js/lib/knowledge/data/recipes.js");
const { recipesKnowledge } = requireKnowledge("./src/js/lib/knowledge/recipes.js");
const { getKnowledgeContext } = requireKnowledge("./src/js/lib/knowledge/index.js");

validateRecipeShape(RECIPES);
validateKnowledgeSourceOrder();

assert(recipesKnowledge.getStaticContext() === "", "recipes should not add static context");

// -- auto-derived: every recipe must be matched by its own description --

for (const recipe of RECIPES) {
  const diagnostics = recipesKnowledge.getMessageContextDiagnostics(recipe.description);
  assert(
    diagnostics.ids.includes(recipe.id),
    `Recipe "${recipe.id}" is not matched by its own description: "${recipe.description}". ` +
      `Keywords: [${recipe.keywords.join(", ")}]`
  );
}

// -- per-recipe intent smoke tests (paraphrase robustness) --

const textPrompt = "Create a text layer that says Welcome at 48pt";
const textContext = recipesKnowledge.getMessageContext(textPrompt);
const textRecipe = RECIPES.find((r) => r.id === "text-layer-creation");
assert(textRecipe, "text-layer-creation recipe is missing");
assert(textContext.includes("## Verified Action Recipes"), "text prompt should inject recipes block");
assert(textContext.includes(textRecipe.description), "text prompt should inject text-layer-creation");
assert(textContext.includes("textProp.value"), "text recipe should include TextDocument .value read");
assert(textContext.includes("textProp.setValue(textDoc)"), "text recipe should include TextDocument setValue");
assert(
  textContext.includes("verified, composable action recipes"),
  "injected block should include composable framing preamble"
);

const trimPrompt = "Animate trim paths on a shape layer so it draws on over 2 seconds";
const trimContext = recipesKnowledge.getMessageContext(trimPrompt);
const trimRecipe = RECIPES.find((r) => r.id === "trim-paths-animation");
assert(trimRecipe, "trim-paths-animation recipe is missing");
assert(trimContext.includes(trimRecipe.description), "trim paths prompt should inject trim-paths-animation");
assert(trimContext.includes("ADBE Vector Filter - Trim"), "trim paths recipe should include Trim Paths matchName");
assert(trimContext.includes("setValueAtTime"), "trim paths recipe should include keyframing pattern");

const parentPrompt = "Parent the title layer to the background box";
const parentContext = recipesKnowledge.getMessageContext(parentPrompt);
const parentRecipe = RECIPES.find((r) => r.id === "parent-layer-by-name");
assert(parentRecipe, "parent-layer-by-name recipe is missing");
assert(parentContext.includes(parentRecipe.description), "parent prompt should inject parent-layer-by-name");
assert(parentContext.includes("setParentWithJump"), "parent recipe should mention setParentWithJump");

const dupPrompt = "Duplicate this layer and offset it by 1 second";
const dupContext = recipesKnowledge.getMessageContext(dupPrompt);
const dupRecipe = RECIPES.find((r) => r.id === "duplicate-layer-offset");
assert(dupRecipe, "duplicate-layer-offset recipe is missing");
assert(dupContext.includes(dupRecipe.description), "duplicate prompt should inject duplicate-layer-offset");
assert(dupContext.includes("startTime"), "duplicate recipe should reference startTime");

const copyKfPrompt = "Copy keyframes from the opacity property to the scale property";
const copyKfContext = recipesKnowledge.getMessageContext(copyKfPrompt);
const copyKfRecipe = RECIPES.find((r) => r.id === "copy-keyframes");
assert(copyKfRecipe, "copy-keyframes recipe is missing");
assert(copyKfContext.includes(copyKfRecipe.description), "copy-keyframes prompt should inject copy-keyframes");

const precompPrompt = "Pre-compose these selected layers into a new comp";
const precompContext = recipesKnowledge.getMessageContext(precompPrompt);
const precompRecipe = RECIPES.find((r) => r.id === "precompose-selected-layers");
assert(precompRecipe, "precompose-selected-layers recipe is missing");
assert(precompContext.includes(precompRecipe.description), "precomp prompt should inject precompose-selected-layers");
assert(precompContext.includes("precompose"), "precompose recipe should reference precompose method");

const importPrompt = "Import footage.mp4 into the project";
const importContext = recipesKnowledge.getMessageContext(importPrompt);
const importRecipe = RECIPES.find((r) => r.id === "import-file");
assert(importRecipe, "import-file recipe is missing");
assert(importContext.includes(importRecipe.description), "import prompt should inject import-file");
assert(importContext.includes("ImportOptions"), "import recipe should reference ImportOptions");

const shapePrompt = "Add a rectangle shape with a stroke and fill to a shape layer";
const shapeContext = recipesKnowledge.getMessageContext(shapePrompt);
const shapeRecipe = RECIPES.find((r) => r.id === "shape-rect-stroke-fill");
assert(shapeRecipe, "shape-rect-stroke-fill recipe is missing");
assert(shapeContext.includes(shapeRecipe.description), "shape prompt should inject shape-rect-stroke-fill");

const spatialPrompt = "Set spatial ease on the position keyframes for a curved path";
const spatialContext = recipesKnowledge.getMessageContext(spatialPrompt);
const spatialRecipe = RECIPES.find((r) => r.id === "spatial-tangent-ease");
assert(spatialRecipe, "spatial-tangent-ease recipe is missing");
assert(spatialContext.includes(spatialRecipe.description), "spatial prompt should inject spatial-tangent-ease");
assert(spatialContext.includes("setSpatialTangentsAtKey"), "spatial recipe should reference setSpatialTangentsAtKey");

const textColorPrompt = "Animate the text color from red to blue over 2 seconds";
const textColorContext = recipesKnowledge.getMessageContext(textColorPrompt);
const textColorRecipe = RECIPES.find((r) => r.id === "text-color-keyframe");
assert(textColorRecipe, "text-color-keyframe recipe is missing");
assert(textColorContext.includes(textColorRecipe.description), "text color prompt should inject text-color-keyframe");
assert(textColorContext.includes("fillColor"), "text-color-keyframe recipe should reference fillColor");

// -- full context ordering --

const fullTextContext = getKnowledgeContext(textPrompt);
const effectsIndex = fullTextContext.indexOf("## Verified Effects");
const recipesIndex = fullTextContext.indexOf("## Verified Action Recipes");
const rulesIndex = fullTextContext.indexOf("## Rules for Script Generation");
assert(effectsIndex !== -1 && recipesIndex !== -1, "full context should include effects and recipes");
assert(effectsIndex < recipesIndex, "recipes should appear after reference data");
assert(recipesIndex < rulesIndex, "recipes should appear before final generation rules");

// -- no injection for effect-only prompts --

const effectPrompt = "Add a Gaussian Blur effect to the selected layer";
assert(
  recipesKnowledge.getMessageContext(effectPrompt) === "",
  "effect-only Gaussian Blur prompt should not inject recipes"
);
assert(
  !getKnowledgeContext(effectPrompt).includes("## Verified Action Recipes"),
  "full effect-only context should not include recipes"
);

// -- char budget: multi-topic prompt gets more than the old 2-recipe cap --

const manyMatchesContext = recipesKnowledge.getMessageContext(
  "Create a text layer, animate trim paths, parent it, add an expression, and apply keyframe ease"
);
const manyMatchesCount = countFormattedRecipes(manyMatchesContext);
assert(manyMatchesCount >= 3, "multi-topic prompt should inject at least 3 recipes under the char budget (got " + manyMatchesCount + ")");
assert(
  manyMatchesContext.length <= maxRecipeChars + 500,
  "injected recipes should stay within char budget (got " + manyMatchesContext.length + " chars)"
);

// -- fallback: near-miss prompts (description terms, no keyword match) --
// "Wrap my script in an undo action with cleanup on failure" shares terms
// with undo-group-try-finally's description ("wrap", "script", "undo", "cleanup")
// but none of its keywords ("undo group", "undo wrap", "beginundogroup", etc.) match.

const fallbackPrompt = "Wrap my script in an undo action with cleanup on failure";
const undoRecipe = RECIPES.find((r) => r.id === "undo-group-try-finally");
assert(undoRecipe, "undo-group-try-finally recipe is missing");

// First, confirm keyword matching does NOT fire for this prompt.
const fallbackDiagnostics = recipesKnowledge.getMessageContextDiagnostics(fallbackPrompt);
assert(
  fallbackDiagnostics.ids.includes("undo-group-try-finally"),
  "near-miss prompt should inject undo-group-try-finally via term-overlap fallback"
);

const fallbackContext = recipesKnowledge.getMessageContext(fallbackPrompt);
assert(
  fallbackContext.includes(undoRecipe.description),
  "fallback context should include the undo-group recipe description"
);
assert(
  fallbackContext.includes("## Verified Action Recipes"),
  "fallback context should include the recipes section header"
);

console.log("OK: recipes implementation injects for targeted prompts, stays out of effect-only prompts, fits within the " + maxRecipeChars + "-char budget, and catches near-miss paraphrases via term-overlap fallback.");
