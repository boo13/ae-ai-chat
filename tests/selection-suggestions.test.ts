import assert from "node:assert/strict";
import test from "node:test";
import { selectionSuggestions } from "../src/js/lib/selection-suggestions";

test("suggestions reflect selection and fall back when no composition is open", () => {
  assert.match(selectionSuggestions({ hasComp: false, layerTypes: [], layerNames: [] }).join(" "), /Create a/);
  assert.match(selectionSuggestions({ hasComp: true, layerTypes: ["text"], layerNames: ["Title"] }).join(" "), /text/);
  assert.match(selectionSuggestions({ hasComp: true, layerTypes: ["av"], layerNames: ["Clip"] }).join(" "), /footage/);
  assert.match(selectionSuggestions({ hasComp: true, layerTypes: ["shape"], layerNames: ["Circle"] }).join(" "), /shape/);
  assert.match(selectionSuggestions({ hasComp: true, layerTypes: [], layerNames: [] }, true)[0], /error/);
});
