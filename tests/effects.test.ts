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
    "Lumetri Color",
    "CC Toner",
  ]) {
    assert.ok(displayNames.includes(required), `missing ${required}`);
  }
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
