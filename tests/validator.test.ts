import assert from "node:assert/strict";
import test from "node:test";
import { validateScript } from "../src/js/lib/knowledge/validator";

function enumWarnings(script: string) {
  return validateScript(script).warnings.filter((w) => w.code === "ENUM_VALUE");
}

function temporalEaseWarnings(script: string) {
  return validateScript(script).warnings.filter((w) => w.code === "TEMPORAL_EASE_ARITY");
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

test("does not flag direct expression assignment to an enum-like property", () => {
  const script = 'fx.property("ADBE Turbulent Displace-0006").expression = "time * 80";';
  assert.equal(enumWarnings(script).length, 0);
});

test("does not flag helper expression assignment to an enum-like property", () => {
  const script = 'setExpression(fx.property("ADBE Fractal Noise-0023"), "time * 3");';
  assert.equal(enumWarnings(script).length, 0);
});

test("does not treat numbers inside an enum property expression as enum values", () => {
  const script = 'setExpression(fx.property("ADBE Lumetri-0025"), "time * 80");';
  assert.equal(enumWarnings(script).length, 0);
});

test("still flags a UI-label string after expression exclusions", () => {
  const script = 'fx.property("ADBE Fractal Noise-0001").setValue("Rocky");';
  assert.equal(enumWarnings(script).length, 1);
});

test("still flags an unverified numeric enum value after expression exclusions", () => {
  const script = 'setParam(lumetri, "ADBE Lumetri-0025", 999);';
  assert.equal(enumWarnings(script).length, 1);
});

test("blocks BlendMode (the enum is BlendingMode)", () => {
  const script = [
    "app.beginUndoGroup('x');",
    "layer.blendingMode = BlendMode.SCREEN;",
    "app.endUndoGroup();",
  ].join("\n");
  const errors = validateScript(script).errors.filter(
    (e) => e.code === "INVALID_GLOBAL"
  );
  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /use BlendingMode/);
});

test("does not flag the correct BlendingMode global", () => {
  const script = "layer.blendingMode = BlendingMode.SCREEN;";
  const errors = validateScript(script).errors.filter(
    (e) => e.code === "INVALID_GLOBAL"
  );
  assert.equal(errors.length, 0);
});

test("does not flag BlendMode inside a string or comment", () => {
  const script = [
    '// BlendMode.SCREEN is wrong',
    'var note = "BlendMode.SCREEN";',
  ].join("\n");
  const errors = validateScript(script).errors.filter(
    (e) => e.code === "INVALID_GLOBAL"
  );
  assert.equal(errors.length, 0);
});

test("flags a template literal", () => {
  const script = "var label = `Layer ${i}`;";
  const errors = validateScript(script).errors.filter(
    (e) => e.code === "ES3_TEMPLATE_LITERAL"
  );
  assert.equal(errors.length, 1);
  assert.equal(errors[0].occurrences.length, 1);
});

test("does not flag a backtick that appears inside a normal quoted string", () => {
  const script = 'var note = "wrap code in ` marks";';
  const errors = validateScript(script).errors.filter(
    (e) => e.code === "ES3_TEMPLATE_LITERAL"
  );
  assert.equal(errors.length, 0);
});

test("does not flag enum values inside block comments", () => {
  const script = [
    "/*",
    'fx.property("ADBE Fractal Noise-0001").setValue("Dynamic");',
    "*/",
  ].join("\n");

  assert.equal(enumWarnings(script).length, 0);
});

test("still flags enum values after strings containing line-comment markers", () => {
  const script =
    'var url = "https://example.test"; fx.property("ADBE Fractal Noise-0001").setValue("Dynamic");';

  const warnings = enumWarnings(script);
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].invalidMatchName, "ADBE Fractal Noise-0001");
});

test("blocks a literal color with the wrong setValue arity", () => {
  const script = 'fx.property("ADBE Glo2-0012").setValue([1, 0, 0]);';
  const errors = validateScript(script).errors.filter((error) => error.code === "SETVALUE_ARITY");
  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /expected 4/);
});

test("does not block a correctly shaped color or a variable value", () => {
  const script = [
    'fx.property("ADBE Glo2-0012").setValue([1, 0, 0, 1]);',
    'fx.property("ADBE Glo2-0012").setValue(colorValue);',
  ].join("\n");
  assert.equal(validateScript(script).errors.filter((error) => error.code === "SETVALUE_ARITY").length, 0);
});

test("accepts 2D or 3D arity for dimension-ambiguous transform properties", () => {
  const script = [
    'layer.property("ADBE Transform Group").property("ADBE Position").setValue([100, 200]);',
    'layer.property("ADBE Transform Group").property("ADBE Position").setValue([100, 200, 0]);',
    'layer.property("ADBE Transform Group").property("ADBE Scale").setValue([50, 50]);',
    'layer.property("ADBE Transform Group").property("ADBE Anchor Point").setValue([0, 0, 0]);',
  ].join("\n");
  assert.equal(validateScript(script).errors.filter((error) => error.code === "SETVALUE_ARITY").length, 0);
});

test("still flags a nonsensical arity on an ambiguous transform property", () => {
  const script = 'layer.property("ADBE Transform Group").property("ADBE Position").setValue([100]);';
  const errors = validateScript(script).errors.filter((error) => error.code === "SETVALUE_ARITY");
  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /expected 2 or 3/);
});

test("warns when chained spatial temporal ease uses multiple inline eases", () => {
  const script = 'layer.property("ADBE Transform Group").property("ADBE Position").setTemporalEaseAtKey(1, [new KeyframeEase(0, 80), new KeyframeEase(0, 80)], [new KeyframeEase(0, 80)]);';
  const warnings = temporalEaseWarnings(script);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0].message, /exactly one KeyframeEase per side/);
});

test("accepts one inline temporal ease for a chained spatial property", () => {
  const script = 'layer.property("ADBE Transform Group").property("ADBE Anchor Point").setTemporalEaseAtKey(1, [new KeyframeEase(0, 80)], [new KeyframeEase(0, 80)]);';
  assert.equal(temporalEaseWarnings(script).length, 0);
});

test("skips variable-based temporal ease calls", () => {
  const script = 'position.setTemporalEaseAtKey(1, easeIn, easeOut);';
  assert.equal(temporalEaseWarnings(script).length, 0);
});

test("suggests a verified non-effect property matchName typo", () => {
  const warnings = validateScript('layer.property("ADBE Transform Groupp");').warnings.filter(
    (warning) => warning.code === "PROPERTY_MATCHNAME"
  );
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].suggestion, "ADBE Transform Group");
});

test("does not flag a verified non-effect property matchName", () => {
  const warnings = validateScript('layer.property("ADBE Transform Group");').warnings.filter(
    (warning) => warning.code === "PROPERTY_MATCHNAME"
  );
  assert.equal(warnings.length, 0);
});

test("corrects the common ADBE Effect Group -> ADBE Effect Parade mistake", () => {
  const warnings = validateScript(
    'var e = layer.property("ADBE Effect Group").addProperty("ADBE Gaussian Blur 2");'
  ).warnings.filter((warning) => warning.code === "PROPERTY_MATCHNAME");
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].suggestion, "ADBE Effect Parade");
  assert.match(warnings[0].message, /Did you mean "ADBE Effect Parade"/);
});

test("folds concatenated expression strings before syntax checking", () => {
  const script = 'prop.expression = "var x = (" + "1 + 2;";';
  const warnings = validateScript(script).warnings.filter((warning) => warning.code === "EXPR_SYNTAX");
  assert.equal(warnings.length, 1);
});

test("accepts a valid concatenated expression string", () => {
  const script = 'prop.expression = "var x = 1;" + "x + 2;";';
  const warnings = validateScript(script).warnings.filter((warning) => warning.code === "EXPR_SYNTAX");
  assert.equal(warnings.length, 0);
});

test("warns about unknown expression functions but not catalog or local functions", () => {
  const unknown = validateScript('prop.expression = "wggle(2, 20);";').warnings.filter(
    (warning) => warning.code === "EXPR_UNKNOWN_FN"
  );
  assert.equal(unknown.length, 1);
  assert.equal(unknown[0].invalidMatchName, "wggle");

  const valid = validateScript(
    'prop.expression = "function twice(x) { return x * 2; } twice(wiggle(2, 20));";'
  ).warnings.filter((warning) => warning.code === "EXPR_UNKNOWN_FN");
  assert.equal(valid.length, 0);
});

test("warns when expression source uses scripting APIs only", () => {
  const inside = validateScript('prop.expression = "app.project.item(1).setValue(2);";').warnings.filter(
    (warning) => warning.code === "EXPR_SCRIPTING_API"
  );
  assert.equal(inside.length, 1);

  const outside = validateScript('prop.setValue(2);').warnings.filter(
    (warning) => warning.code === "EXPR_SCRIPTING_API"
  );
  assert.equal(outside.length, 0);
});
