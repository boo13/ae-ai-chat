import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  MAX_EFFECT_CONTEXT_CHARS,
  effectsKnowledge,
  selectEffectRecords,
} from "../src/js/lib/knowledge/effects";
import { EFFECTS_DETAIL } from "../src/js/lib/knowledge/data/effects-detail";

function selectedDisplayNames(matchNames: string[]): string[] {
  return matchNames.map((matchName) => EFFECTS_DETAIL[matchName].displayName);
}

test("film-damage context includes the requested detailed effect records", () => {
  const prompt = readFileSync(
    "prompts/TextureLabs_FilmDamage.md",
    "utf8"
  );
  const first = selectEffectRecords(prompt);
  const second = selectEffectRecords(prompt);
  const displayNames = selectedDisplayNames(first.matchNames);
  const context = effectsKnowledge.getMessageContext?.(prompt) || "";

  assert.deepEqual(second, first);
  assert.ok(first.contextChars <= MAX_EFFECT_CONTEXT_CHARS);
  assert.equal(context.length, first.contextChars);

  for (const required of [
    "Transform",
    "Fractal Noise",
    "Set Channels",
    "Exposure",
    "CC Toner",
  ]) {
    assert.ok(displayNames.includes(required), `missing ${required}`);
  }
});

test("emits verified enum options in the effect record when present", () => {
  const detail = EFFECTS_DETAIL["ADBE Fractal Noise"];
  const prop = detail.properties.find(
    (p) => p.matchName === "ADBE Fractal Noise-0001"
  );
  assert.ok(prop, "Fractal Type property exists");

  prop!.enum = { Basic: 1, Dynamic: 4 };
  try {
    const context =
      effectsKnowledge.getMessageContext?.(
        "Apply the Fractal Noise effect and set Fractal Type"
      ) || "";
    assert.match(context, /enum \(verified\): Basic=1, Dynamic=4/);
  } finally {
    delete prop!.enum;
  }
});

test("a real same-display-name variant pair collapses to a single record", () => {
  // ADBE Easy Levels and ADBE Easy Levels2 both display as "Levels".
  const selection = selectEffectRecords("Add a Levels effect to the layer");
  const levels = selectedDisplayNames(selection.matchNames).filter(
    (name) => name === "Levels"
  );
  assert.equal(levels.length, 1);
});

test("explicit effects rank ahead of generic matches and variants are deduplicated", () => {
  const prompt = [
    "Build a GATE WEAVE layer with this treatment:",
    "- Transform",
    "  - Scale Height: 101.5",
    "- Fractal Noise",
    "  - Invert: On",
    "- Set Channels",
    "  - Set Alpha to Source: Luminance",
  ].join("\n");
  const selection = selectEffectRecords(prompt);
  const displayNames = selectedDisplayNames(selection.matchNames);

  assert.deepEqual(displayNames.slice(0, 3).sort(), [
    "Fractal Noise",
    "Set Channels",
    "Transform",
  ].sort());
  assert.equal(displayNames.filter((name) => name === "Transform").length, 1);
  assert.equal(displayNames.filter((name) => name === "Gate").length, 1);
  assert.ok(displayNames.indexOf("Gate") > displayNames.indexOf("Set Channels"));
});
