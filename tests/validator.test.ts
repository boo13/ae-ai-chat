import assert from "node:assert/strict";
import test from "node:test";
import { validateScript } from "../src/js/lib/knowledge/validator";

function enumWarnings(script: string) {
  return validateScript(script).warnings.filter((w) => w.code === "ENUM_VALUE");
}

test("flags a UI-label string passed to a numeric/enum effect property", () => {
  const script = [
    "app.beginUndoGroup('x');",
    'var fx = layer.property("ADBE Effect Parade").addProperty("ADBE Fractal Noise");',
    'fx.property("ADBE Fractal Noise-0001").setValue("Dynamic");',
    "app.endUndoGroup();",
  ].join("\n");

  const warnings = enumWarnings(script);
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].invalidMatchName, "ADBE Fractal Noise-0001");
  assert.match(warnings[0].message, /pass an integer, not a UI label/i);
});

test("flags the Lumetri look label string passed through a helper call", () => {
  const script = 'setParam(lumetri, "ADBE Lumetri-0025", "Cinespace 2383sRGB6bit");';
  const warnings = enumWarnings(script);
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].invalidMatchName, "ADBE Lumetri-0025");
  assert.match(warnings[0].message, /Cinespace 2383sRGB6bit/);
});

test("does not flag a plain integer when no verified enum map exists", () => {
  // Without calibration data the integer cannot be checked, so it must not warn.
  const script = 'fx.property("ADBE Fractal Noise-0001").setValue(4);';
  assert.equal(enumWarnings(script).length, 0);
});

test("does not flag a variable value (no literal to validate)", () => {
  const script = 'fx.property("ADBE Fractal Noise-0001").setValue(myFractalType);';
  assert.equal(enumWarnings(script).length, 0);
});
