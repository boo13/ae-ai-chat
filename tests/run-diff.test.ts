import assert from "node:assert/strict";
import test from "node:test";
import { diffRunSnapshots, type RunSnapshot } from "../src/shared/run-diff";

function snapshot(overrides: Partial<RunSnapshot> = {}): RunSnapshot {
  return {
    comp: "Main",
    numLayers: 1,
    duration: 5,
    workAreaStart: 0,
    workAreaDuration: 5,
    deep: true,
    layers: [
      {
        name: "Title",
        effects: 1,
        effectDigest: "a",
        transform: { position: "[0,0]", opacity: "100" },
        expressionDigest: "x",
        expressionCount: 0,
        keyframes: 2,
        inPoint: 0,
        outPoint: 5,
      },
    ],
    ...overrides,
  };
}

test("reports transform, effect parameter, expression, and keyframe changes", () => {
  const before = snapshot();
  const after = snapshot({
    layers: [
      {
        ...before.layers[0],
        effectDigest: "b",
        transform: { position: "[20,30]", opacity: "50" },
        expressionDigest: "y",
        expressionCount: 1,
        keyframes: 5,
      },
    ],
  });
  const notes = diffRunSnapshots(before, after).join("\n");
  assert.match(notes, /Effect parameters changed/);
  assert.match(notes, /Transform changed.*position, opacity/);
  assert.match(notes, /Keyframes changed.*2 -> 5/);
  assert.match(notes, /Expressions changed.*0 -> 1/);
});

test("reports track matte changes", () => {
  const before = snapshot();
  const after = snapshot({
    layers: [{ ...before.layers[0], trackMatte: "alpha via Matte" }],
  });
  const notes = diffRunSnapshots(before, after).join("\n");
  assert.match(notes, /Track matte changed on "Title" \(none -> alpha via Matte\)/);
});

test("ignores unchanged or absent track matte state", () => {
  const withMatte = snapshot({ layers: [{ name: "Title", effects: 1, trackMatte: "luma" }] });
  assert.equal(
    diffRunSnapshots(withMatte, withMatte).join("\n").includes("Track matte"),
    false
  );
  const before = snapshot({ layers: [{ name: "Title", effects: 1 }] });
  const after = snapshot({ layers: [{ name: "Title", effects: 1 }] });
  assert.equal(diffRunSnapshots(before, after).join("\n").includes("Track matte"), false);
});

test("handles duplicate layer names without prototype-key collisions", () => {
  const before = snapshot({
    numLayers: 2,
    layers: [
      { name: "constructor", effects: 0 },
      { name: "constructor", effects: 0 },
    ],
  });
  const after = snapshot({ numLayers: 1, layers: [{ name: "constructor", effects: 0 }] });
  const notes = diffRunSnapshots(before, after).join("\n");
  assert.match(notes, /Layers removed: constructor/);
  assert.match(notes, /Layer count: 2 -> 1/);
});

test("caps feedback at twelve notes", () => {
  const layers = [];
  for (let i = 0; i < 20; i++) layers.push({ name: "Layer " + i, effects: 0 });
  const before = snapshot({ numLayers: 20, layers });
  const after = snapshot({
    numLayers: 20,
    layers: layers.map((layer) => ({ ...layer, effects: 1 })),
  });
  assert.ok(diffRunSnapshots(before, after).length <= 12);
});
