#!/usr/bin/env node

import { readFileSync, readdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { close, connect, evalES, evalPanel, screenshot } from "./ae-driver.mjs";

const root = resolve(import.meta.dirname, "..");
const fixturesDir = join(root, "tests", "e2e");
const verifyScene = readFileSync(join(root, "fixtures", "verify-scene.jsx"), "utf8");
const failureDir = join(root, ".session", "e2e-failures");

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
          !Array.isArray(fixture.expectDiffContains))
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

async function resetFixture() {
  const result = await evalES(verifyScene);
  if (!result || result.error || !result.success) {
    throw new Error("Fixture reset failed: " + String(result?.error || "unknown error"));
  }
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
        await resetFixture();
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
