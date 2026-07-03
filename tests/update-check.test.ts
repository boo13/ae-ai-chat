import assert from "node:assert/strict";
import test from "node:test";

declare const require: (path: string) => {
  compareVersions: (left: string, right: string) => number;
};

test("compares prerelease identifiers within the same numeric version", () => {
  (globalThis as { window?: { cep?: unknown } }).window = {};
  const { compareVersions } = require("../src/js/lib/update-check");

  assert.equal(compareVersions("1.2.0-beta.2", "1.2.0-beta.1"), 1);
  assert.equal(compareVersions("1.2.0-beta.1", "1.2.0-beta.2"), -1);
  assert.equal(compareVersions("1.2.0-beta.2", "1.2.0-beta.2"), 0);
});

test("keeps release versions newer than prereleases", () => {
  (globalThis as { window?: { cep?: unknown } }).window = {};
  const { compareVersions } = require("../src/js/lib/update-check");

  assert.equal(compareVersions("1.2.0", "1.2.0-beta.2"), 1);
  assert.equal(compareVersions("1.2.0-beta.2", "1.2.0"), -1);
});

test("compares mixed prerelease identifier segments with semver ordering", () => {
  (globalThis as { window?: { cep?: unknown } }).window = {};
  const { compareVersions } = require("../src/js/lib/update-check");

  assert.equal(compareVersions("1.2.0-beta.10", "1.2.0-beta.2"), 1);
  assert.equal(compareVersions("1.2.0-alpha.1", "1.2.0-alpha.beta"), -1);
  assert.equal(compareVersions("1.2.0-beta", "1.2.0-alpha"), 1);
});
