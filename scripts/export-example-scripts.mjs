#!/usr/bin/env node
/**
 * Export generated few-shot example scripts to runnable .jsx files.
 *
 * Defaults:
 *   source: src/js/lib/knowledge/data/examples.ts
 *   output: example-scripts/
 *
 * Usage:
 *   node scripts/export-example-scripts.mjs
 *   node scripts/export-example-scripts.mjs --source ../ae-ai-starter/Scripts/verified/examples
 *   node scripts/export-example-scripts.mjs --output /tmp/ae-example-scripts
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { join, resolve } from "path";

const args = process.argv.slice(2);
const sourceArgIdx = args.indexOf("--source");
const outputArgIdx = args.indexOf("--output");
const sourcePath =
  sourceArgIdx === -1
    ? resolve("src/js/lib/knowledge/data/examples.ts")
    : resolve(args[sourceArgIdx + 1]);
const outputDir =
  outputArgIdx === -1 ? resolve("example-scripts") : resolve(args[outputArgIdx + 1]);

function fail(message) {
  console.error("Error: " + message);
  process.exit(1);
}

function extractExamplesFromTs(source) {
  const marker = "export const EXAMPLES: ExampleEntry[] = ";
  const start = source.indexOf(marker);
  if (start === -1) fail("could not find EXAMPLES export in " + sourcePath);

  let index = start + marker.length;
  while (/\s/.test(source[index] || "")) index += 1;
  if (source[index] !== "[") fail("EXAMPLES export is not an array literal");

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

  fail("could not parse EXAMPLES array");
}

function readExamplesFromJsonDirectory(directory) {
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

function readExamples() {
  if (!existsSync(sourcePath)) fail("source path not found: " + sourcePath);

  if (sourcePath.endsWith(".ts")) {
    return extractExamplesFromTs(readFileSync(sourcePath, "utf-8"));
  }

  return readExamplesFromJsonDirectory(sourcePath);
}

function validateExample(example) {
  if (!example || typeof example !== "object") fail("example must be an object");
  if (typeof example.id !== "string" || example.id.trim() === "") fail("example id must be non-empty");
  if (typeof example.script !== "string" || example.script.trim() === "") {
    fail("example " + example.id + " has no script");
  }
}

function indentScript(source) {
  return source
    .split(/\r?\n/)
    .map((line) => (line.trim() === "" ? "" : "  " + line))
    .join("\n");
}

function wrapUndoGroup(script) {
  const trimmed = script.trim();
  const beginMatch = trimmed.match(/^\s*app\.beginUndoGroup\(([^)]*)\);\s*\r?\n?/);
  const endMatch = trimmed.match(/\r?\n?\s*app\.endUndoGroup\(\);\s*$/);

  if (!beginMatch || !endMatch) return trimmed;

  const body = trimmed
    .replace(/^\s*app\.beginUndoGroup\(([^)]*)\);\s*\r?\n?/, "")
    .replace(/\r?\n?\s*app\.endUndoGroup\(\);\s*$/, "")
    .trim();

  return [
    "app.beginUndoGroup(" + beginMatch[1] + ");",
    "try {",
    indentScript(body),
    "} finally {",
    "  app.endUndoGroup();",
    "}",
  ].join("\n");
}

const examples = readExamples();
mkdirSync(outputDir, { recursive: true });

for (const example of examples) {
  validateExample(example);
  const filePath = join(outputDir, example.id + ".jsx");
  writeFileSync(filePath, wrapUndoGroup(example.script) + "\n");
  console.log("Wrote " + filePath);
}

console.log("Exported " + examples.length + " example scripts.");
