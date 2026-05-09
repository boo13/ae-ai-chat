#!/usr/bin/env node

import { existsSync, readFileSync } from "fs";
import { join, resolve } from "path";

const repoRoot = resolve(".");
const logPath = join(repoRoot, ".session", "error-log.jsonl");

function truncate(value, max) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + "...";
}

function firstCode(entry) {
  if (entry.validationErrors?.length) {
    return entry.validationErrors[0].code || "-";
  }

  if (entry.validationWarnings?.length) {
    return (
      entry.validationWarnings[0].code ||
      entry.validationWarnings[0].invalidMatchName ||
      "-"
    );
  }

  if (entry.expressionErrors?.length) {
    return entry.expressionErrors[0].error || entry.expressionErrors[0].name || "expression";
  }

  return "-";
}

function printTable(rows) {
  const headers = ["count", "kind", "code", "sample message", "sample prompt"];
  const widths = [7, 12, 24, 52, 52];

  const formatRow = (values) =>
    values
      .map((value, index) => truncate(value, widths[index]).padEnd(widths[index]))
      .join("  ");

  console.log(formatRow(headers));
  console.log(formatRow(widths.map((width) => "-".repeat(width))));

  for (const row of rows) {
    console.log(
      formatRow([
        row.count,
        row.kind,
        row.code,
        row.sampleMessage,
        row.samplePrompt,
      ])
    );
  }
}

if (!existsSync(logPath)) {
  console.log("No error log found at " + logPath);
  process.exit(0);
}

const entries = [];
const invalidLines = [];
const lines = readFileSync(logPath, "utf8").split(/\r?\n/);

for (let index = 0; index < lines.length; index += 1) {
  const line = lines[index].trim();
  if (!line) continue;

  try {
    entries.push(JSON.parse(line));
  } catch (err) {
    invalidLines.push(index + 1);
  }
}

if (entries.length === 0) {
  console.log("No valid error log entries found at " + logPath);
  if (invalidLines.length > 0) {
    console.log("Invalid JSONL lines: " + invalidLines.join(", "));
  }
  process.exit(0);
}

const groups = new Map();

for (const entry of entries) {
  const kind = entry.errorKind || "unknown";
  const code = firstCode(entry);
  const key = kind + "\u0000" + code;
  const existing = groups.get(key);

  if (existing) {
    existing.count += 1;
    continue;
  }

  groups.set(key, {
    count: 1,
    kind,
    code,
    sampleMessage: entry.errorString || "",
    samplePrompt: entry.originalUserMessage || "",
  });
}

const rows = Array.from(groups.values()).sort((a, b) => {
  if (b.count !== a.count) return b.count - a.count;
  if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
  return a.code.localeCompare(b.code);
});

console.log("Error log: " + logPath);
console.log("Entries: " + entries.length);
if (invalidLines.length > 0) {
  console.log("Invalid JSONL lines skipped: " + invalidLines.join(", "));
}
console.log("");
printTable(rows);

// -- zero-recipe failures: prompts where the corpus didn't help ---------------

const zeroRecipeEntries = entries.filter(
  (entry) => Array.isArray(entry.injectedRecipeIds) && entry.injectedRecipeIds.length === 0
);

console.log("");
console.log("=== Zero-recipe failures (" + zeroRecipeEntries.length + "/" + entries.length + " actions) ===");
console.log("Prompts where no recipe was injected — highest-signal input for new recipe authoring.");
console.log("");

if (zeroRecipeEntries.length === 0) {
  console.log("  (none — the corpus matched every failed action)");
} else {
  const seen = new Set();
  for (const entry of zeroRecipeEntries) {
    const prompt = String(entry.originalUserMessage || "").replace(/\s+/g, " ").trim();
    if (seen.has(prompt)) continue;
    seen.add(prompt);
    console.log("  - " + truncate(prompt, 120));
  }
}
