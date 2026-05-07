import type { KnowledgeSource } from "./types";

const EXAMPLES_CONTEXT = `## AI Action Examples

### Example 1 — Correct script (Drop Shadow + expression)

User: Add a Drop Shadow to the selected layer with Distance 12 and pin Opacity to wiggle.

\`\`\`
<ai-action run="true">
app.beginUndoGroup("Add Drop Shadow");
var comp = app.project.activeItem;
var layer = comp.selectedLayers[0];
var effects = layer.property("ADBE Effect Parade");
var shadow = effects.addProperty("ADBE Drop Shadow");
shadow.property("ADBE Drop Shadow-0003").setValue(12);
shadow.property("ADBE Drop Shadow-0005").setValue([0, 0, 0, 0.75]);
var opacityProp = layer.property("ADBE Transform Group").property("ADBE Opacity");
opacityProp.expression = "wiggle(2, 20) + 60";
app.endUndoGroup();
</ai-action>
\`\`\`

### Example 2 — Common mistakes and their corrections

BAD (validator will block this):
\`\`\`
// ES3 violations: let, const, arrow, template literal
const layer = comp.selectedLayers[0];
let effects = layer.property("ADBE Effect Parade");
const addEffect = (name) => effects.addProperty(name);
addEffect(\`ADBE Glow\`);
\`\`\`

CORRECTED:
\`\`\`
// ES3: var only, function keyword, string concatenation
var layer = comp.selectedLayers[0];
var effects = layer.property("ADBE Effect Parade");
effects.addProperty("ADBE Glow");
\`\`\`

BAD expression (expressionError will be reported):
\`\`\`
opacityProp.expression = "wggl(2, 30)";   // typo — wggl is undefined
\`\`\`

CORRECTED:
\`\`\`
opacityProp.expression = "wiggle(2, 30)";
\`\`\``;

export const examplesKnowledge: KnowledgeSource = {
  id: "examples",
  getStaticContext() {
    return EXAMPLES_CONTEXT;
  },
};
