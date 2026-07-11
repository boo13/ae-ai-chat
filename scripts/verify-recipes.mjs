#!/usr/bin/env node

import {
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, relative, resolve } from "node:path";
import { close, connect, evalES, runJsxFile } from "./ae-driver.mjs";
import { wrapUndoGroup } from "./lib/wrap-undo-group.mjs";

const root = resolve(import.meta.dirname, "..");
const recipesDir = join(root, "recipes");
const fixturePath = join(root, "fixtures", "verify-scene.jsx");
const sessionDir = join(root, ".session");
const tempDir = join(sessionDir, "recipe-verification-tmp");
const reportPath = join(sessionDir, "recipe-verification.json");

function fail(message) {
  throw new Error(message);
}

function parseArgs(argv) {
  const options = { all: false, only: null, promote: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--all") {
      options.all = true;
    } else if (arg === "--promote") {
      options.promote = true;
    } else if (arg === "--only") {
      options.only = argv[i + 1] || null;
      if (!options.only) fail("--only requires a recipe id.");
      i += 1;
    } else {
      fail("Unknown argument: " + arg);
    }
  }
  return options;
}

function collectJsonFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectJsonFiles(path));
    } else if (entry.isFile() && entry.name.endsWith(".json") && !entry.name.startsWith("_")) {
      files.push(path);
    }
  }
  return files.sort();
}

function readRecipes() {
  return collectJsonFiles(recipesDir).map((path) => {
    let recipe;
    try {
      recipe = JSON.parse(readFileSync(path, "utf8"));
    } catch (error) {
      fail("Could not parse " + relative(root, path) + ": " + error.message);
    }
    if (!recipe || typeof recipe.id !== "string" || typeof recipe.script !== "string") {
      fail("Recipe must have string id and script fields: " + relative(root, path));
    }
    return {
      ...recipe,
      path,
      pending: typeof recipe.notes === "string" && /verification pending/i.test(recipe.notes),
    };
  });
}

function selectRecipes(recipes, options) {
  if (options.only) {
    const recipe = recipes.find((candidate) => candidate.id === options.only);
    if (!recipe) fail("Recipe not found: " + options.only);
    return [recipe];
  }
  return options.all ? recipes : recipes.filter((recipe) => recipe.pending);
}

function classifyResult(result) {
  if (result?.error) return { status: "FAIL", kind: "runtime", reason: String(result.error) };
  const expressionErrors = Array.isArray(result?.expressionErrors)
    ? result.expressionErrors
    : [];
  if (expressionErrors.length > 0) {
    return {
      status: "FAIL",
      kind: "expression",
      reason: expressionErrors.map((error) => error.error || String(error)).join("; "),
    };
  }
  const stateDiff = Array.isArray(result?.stateDiff) ? result.stateDiff.map(String) : [];
  if (stateDiff.length === 0) {
    return { status: "FAIL", kind: "no-op", reason: "No tracked state changes." };
  }
  return { status: "PASS", kind: "", reason: stateDiff.join(" | ") };
}

function removePendingPhrase(notes) {
  return notes
    .replace(/verification pending/gi, "")
    .replace(/\s+\./g, ".")
    .replace(/^\s*(?:AE runtime)?\.\s*/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function promoteRecipes(recipes, results) {
  const passing = new Set(
    results.filter((result) => result.status === "PASS").map((result) => result.id)
  );
  const promoted = [];
  for (const recipe of recipes) {
    if (!recipe.pending || !passing.has(recipe.id)) continue;
    const source = JSON.parse(readFileSync(recipe.path, "utf8"));
    const notes = removePendingPhrase(String(source.notes || ""));
    if (notes) source.notes = notes;
    else delete source.notes;
    writeFileSync(recipe.path, JSON.stringify(source, null, 2) + "\n");
    promoted.push(recipe.id);
  }
  return promoted;
}

async function resetFixture(fixture) {
  const result = await evalES(fixture);
  if (!result || result.error || !result.success) {
    throw new Error("Fixture reset failed: " + String(result?.error || "unknown error"));
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const allRecipes = readRecipes();
  const recipes = selectRecipes(allRecipes, options);
  if (recipes.length === 0) {
    console.log("No pending recipes to verify.");
    return;
  }

  const fixture = readFileSync(fixturePath, "utf8");
  const results = [];
  mkdirSync(tempDir, { recursive: true });

  try {
    await connect();
    for (const recipe of recipes) {
      const tempPath = join(tempDir, recipe.id + ".jsx");
      writeFileSync(tempPath, wrapUndoGroup(recipe.script) + "\n");

      try {
        await resetFixture(fixture);
        const runResult = await runJsxFile(tempPath);
        results.push({
          id: recipe.id,
          source: relative(root, recipe.path),
          pending: recipe.pending,
          ...classifyResult(runResult),
          result: runResult,
        });
      } catch (error) {
        results.push({
          id: recipe.id,
          source: relative(root, recipe.path),
          pending: recipe.pending,
          status: "FAIL",
          kind: "runtime",
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }
  } finally {
    await close();
    rmSync(tempDir, { recursive: true, force: true });
  }

  const promoted = options.promote ? promoteRecipes(recipes, results) : [];
  const report = {
    generatedAt: new Date().toISOString(),
    selection: options.only ? { only: options.only } : { all: options.all },
    promoted,
    results,
  };
  mkdirSync(sessionDir, { recursive: true });
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");

  console.table(
    results.map((result) => ({
      recipe: result.id,
      status: result.status,
      failure: result.kind || "",
      detail: result.reason,
    }))
  );
  console.log("Report: " + relative(root, reportPath));
  if (promoted.length > 0) console.log("Promoted: " + promoted.join(", "));
  if (results.some((result) => result.status === "FAIL")) process.exitCode = 1;
}

main().catch(async (error) => {
  await close();
  rmSync(tempDir, { recursive: true, force: true });
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
