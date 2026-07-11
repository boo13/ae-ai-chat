import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

function writeJson(path: string, value: unknown) {
  writeFileSync(path, JSON.stringify(value), "utf8");
}

function expressionRecord(name: string, probe?: string) {
  return {
    name,
    object: "TestObject",
    signature: `${name}()`,
    params: [],
    returns: "Number",
    appliesTo: ["Property"],
    minVersion: null,
    example: `${name}()`,
    pitfalls: [],
    keywords: [name],
    source: "docsforadobe/after-effects-expression-reference@0000000000000000000000000000000000000000",
    verifiedStatus: "docs-sourced",
    ...(probe === undefined ? {} : { probe }),
  };
}

test("expression verification promotes only verified sidecar results and omits probes", () => {
  const tempRoot = mkdtempSync(join(tmpdir(), "ae-ai-chat-generator-test-"));

  try {
    const scriptsDir = join(tempRoot, "scripts");
    const sourceDir = join(tempRoot, "verified");
    const functionsDir = join(sourceDir, "expressions", "functions");
    const verificationDir = join(sourceDir, "expressions", "verification");
    mkdirSync(scriptsDir, { recursive: true });
    mkdirSync(join(sourceDir, "effects"), { recursive: true });
    mkdirSync(functionsDir, { recursive: true });
    mkdirSync(verificationDir, { recursive: true });
    writeFileSync(join(sourceDir, "gotchas.md"), "Fixture gotcha\n", "utf8");

    const generatorPath = join(scriptsDir, "generate-knowledge.mjs");
    copyFileSync(resolve("scripts/generate-knowledge.mjs"), generatorPath);
    writeJson(join(functionsDir, "fixture.json"), [
      expressionRecord("failedProbe", "value + 1"),
      expressionRecord("verifiedProbe"),
    ]);
    writeJson(join(verificationDir, "verify-fixture.json"), {
      aeVersion: "25.2",
      engines: ["javascript"],
      records: [
        { object: "TestObject", name: "failedProbe", status: "failed" },
        { object: "TestObject", name: "verifiedProbe", status: "verified" },
      ],
    });

    const result = spawnSync(process.execPath, [generatorPath, "--source", sourceDir], {
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /2 records \(1 verified, 1 pending\)/);

    const output = readFileSync(
      join(tempRoot, "src", "js", "lib", "knowledge", "data", "expressions.ts"),
      "utf8"
    );
    const detailMatch = output.match(
      /export const EXPRESSIONS_DETAIL: ExpressionDetail\[\] = (\[[\s\S]*?\]);\nexport const EXPRESSION_FUNCTION_NAMES/
    );
    assert.ok(detailMatch);
    const records = JSON.parse(detailMatch[1]);
    const failed = records.find((record: { name: string }) => record.name === "failedProbe");
    const verified = records.find((record: { name: string }) => record.name === "verifiedProbe");

    assert.equal(failed.verifiedStatus, "pending");
    assert.equal(failed.verifiedAEVersion, null);
    assert.deepEqual(failed.verifiedEngines, []);
    assert.equal(verified.verifiedStatus, "verified");
    assert.equal(verified.verifiedAEVersion, "25.2");
    assert.deepEqual(verified.verifiedEngines, ["javascript"]);
    assert.doesNotMatch(output, /\[failed\]/);
    assert.doesNotMatch(output, /"probe"\s*:/);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
