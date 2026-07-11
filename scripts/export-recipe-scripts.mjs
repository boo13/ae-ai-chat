#!/usr/bin/env node
/**
 * Export generated recipe scripts to runnable .jsx files for AE testing.
 *
 * Defaults:
 *   source: src/js/lib/knowledge/data/recipes.ts
 *   output: recipe-scripts/
 *
 * Usage:
 *   node scripts/export-recipe-scripts.mjs
 *   node scripts/export-recipe-scripts.mjs --source ./recipes
 *   node scripts/export-recipe-scripts.mjs --output /tmp/ae-recipe-scripts
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { wrapUndoGroup } from "./lib/wrap-undo-group.mjs";

const args = process.argv.slice(2);
const sourceArgIdx = args.indexOf("--source");
const outputArgIdx = args.indexOf("--output");
const sourcePath =
  sourceArgIdx === -1
    ? resolve("src/js/lib/knowledge/data/recipes.ts")
    : resolve(args[sourceArgIdx + 1]);
const outputDir =
  outputArgIdx === -1 ? resolve("recipe-scripts") : resolve(args[outputArgIdx + 1]);

function fail(message) {
  console.error("Error: " + message);
  process.exit(1);
}

function extractRecipesFromTs(source) {
  const marker = "export const RECIPES: RecipeEntry[] = ";
  const start = source.indexOf(marker);
  if (start === -1) fail("could not find RECIPES export in " + sourcePath);

  let index = start + marker.length;
  while (/\s/.test(source[index] || "")) index += 1;
  if (source[index] !== "[") fail("RECIPES export is not an array literal");

  const jsonStart = index;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (; index < source.length; index += 1) {
    const char = source[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === "[") {
      depth += 1;
    } else if (char === "]") {
      depth -= 1;
      if (depth === 0) {
        return JSON.parse(source.slice(jsonStart, index + 1));
      }
    }
  }

  fail("could not parse RECIPES array");
}

function readRecipesFromJsonDirectory(directory) {
  return readdirSync(directory)
    .filter((file) => file.endsWith(".json") && !file.startsWith("_"))
    .sort()
    .map((file) => {
      const filePath = join(directory, file);
      try {
        return JSON.parse(readFileSync(filePath, "utf-8"));
      } catch (error) {
        fail("could not parse " + filePath + ": " + error.message);
      }
    });
}

function readRecipes() {
  if (!existsSync(sourcePath)) fail("source path not found: " + sourcePath);

  if (sourcePath.endsWith(".ts")) {
    return extractRecipesFromTs(readFileSync(sourcePath, "utf-8"));
  }

  return readRecipesFromJsonDirectory(sourcePath);
}

function validateRecipe(recipe) {
  if (!recipe || typeof recipe !== "object") fail("recipe must be an object");
  if (typeof recipe.id !== "string" || recipe.id.trim() === "") fail("recipe id must be non-empty");
  if (typeof recipe.script !== "string" || recipe.script.trim() === "") {
    fail("recipe " + recipe.id + " has no script");
  }
}

const recipes = readRecipes();
mkdirSync(outputDir, { recursive: true });

for (const recipe of recipes) {
  validateRecipe(recipe);
  const filePath = join(outputDir, recipe.id + ".jsx");
  writeFileSync(filePath, wrapUndoGroup(recipe.script) + "\n");
  console.log("Wrote " + filePath);
}

console.log("Exported " + recipes.length + " recipe scripts.");
