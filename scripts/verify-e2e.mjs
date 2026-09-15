#!/usr/bin/env node

import { readFileSync, readdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { close, connect, evalES, evalPanel, screenshot } from "./ae-driver.mjs";

const root = resolve(import.meta.dirname, "..");
const fixturesDir = join(root, "tests", "e2e");
const sceneDir = join(root, "fixtures");
const DEFAULT_RESET_SCRIPT = "verify-scene.jsx";
const resetScripts = new Map();
const failureDir = join(root, ".session", "e2e-failures");

function loadResetScript(name) {
  if (!resetScripts.has(name)) {
    resetScripts.set(name, readFileSync(join(sceneDir, name), "utf8"));
  }
  return resetScripts.get(name);
}

function readFixtures() {
  return readdirSync(fixturesDir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => {
      const path = join(fixturesDir, name);
      const fixture = JSON.parse(readFileSync(path, "utf8"));
      if (
        typeof fixture.prompt !== "string" ||
        fixture.expectNoErrors !== true ||
        (fixture.expectDiffContains !== undefined &&
          !Array.isArray(fixture.expectDiffContains)) ||
        (fixture.resetScript !== undefined && typeof fixture.resetScript !== "string") ||
        (fixture.requiresVariableFont !== undefined &&
          typeof fixture.requiresVariableFont !== "boolean")
      ) {
        throw new Error("Invalid E2E fixture: " + path);
      }
      return { id: basename(name, ".json"), ...fixture };
    });
}

function failureReasons(result, fixture) {
  const reasons = [];
  if (!result || result.actionRan !== true) reasons.push("AI Action did not run");

  const stateDiff = Array.isArray(result?.stateDiff) ? result.stateDiff.map(String) : [];
  for (const expected of fixture.expectDiffContains || []) {
    if (!stateDiff.some((entry) => entry.includes(expected))) {
      reasons.push('State diff did not contain "' + expected + '"');
    }
  }

  if (fixture.expectNoErrors) {
    const expressionErrors = Array.isArray(result?.expressionErrors)
      ? result.expressionErrors
      : [];
    if (expressionErrors.length > 0) reasons.push("Expression errors were reported");
    if (result?.lastError) reasons.push("Panel error: " + String(result.lastError));
  }
  return reasons;
}

function isProviderMissing(error) {
  return /no provider configured/i.test(
    error instanceof Error ? error.message : String(error)
  );
}

async function resetFixture(fixture) {
  const scene = loadResetScript(fixture.resetScript || DEFAULT_RESET_SCRIPT);
  const result = await evalES(scene);
  if (!result || result.error || !result.success) {
    throw new Error("Fixture reset failed: " + String(result?.error || "unknown error"));
  }
  return result;
}

async function main() {
  const fixtures = readFixtures();
  if (fixtures.length === 0) throw new Error("No E2E fixtures found in tests/e2e.");

  try {
    await connect();
  } catch (error) {
    console.log(
      "Skipping E2E verification: the AE dev panel is not reachable on port 8862. " +
        (error instanceof Error ? error.message : String(error))
    );
    return;
  }

  try {
    const harnessInstalled = await evalPanel('typeof window.__aeTest !== "undefined"');
    if (!harnessInstalled) {
      console.log(
        "Skipping E2E verification: window.__aeTest is unavailable. Rebuild and reopen the dev panel."
      );
      return;
    }

    const rows = [];
    for (const fixture of fixtures) {
      try {
        const resetResult = await resetFixture(fixture);
        if (fixture.requiresVariableFont && !resetResult.hasVariableFont) {
          rows.push({
            fixture: fixture.id,
            status: "SKIP",
            detail: "No variable font is installed on this system",
          });
          continue;
        }
        const result = await evalPanel(
          "window.__aeTest.runPrompt(" + JSON.stringify(fixture.prompt) + ")"
        );
        const reasons = failureReasons(result, fixture);
        if (reasons.length === 0) {
          const stateDiff = Array.isArray(result.stateDiff) ? result.stateDiff : [];
          rows.push({ fixture: fixture.id, status: "PASS", detail: stateDiff.join(" | ") });
        } else {
          const imagePath = await screenshot(join(failureDir, fixture.id + ".png"));
          rows.push({
            fixture: fixture.id,
            status: "FAIL",
            detail: reasons.join("; ") + "; screenshot: " + imagePath,
          });
        }
      } catch (error) {
        if (isProviderMissing(error)) {
          console.log("Skipping E2E verification: no provider is configured in the panel.");
          return;
        }
        let imageDetail = "";
        try {
          imageDetail = "; screenshot: " +
            await screenshot(join(failureDir, fixture.id + ".png"));
        } catch (_) {}
        rows.push({
          fixture: fixture.id,
          status: "FAIL",
          detail: (error instanceof Error ? error.message : String(error)) + imageDetail,
        });
      }
    }

    console.table(rows);
    if (rows.some((row) => row.status === "FAIL")) process.exitCode = 1;
  } finally {
    await close();
  }
}

main().catch(async (error) => {
  await close();
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
