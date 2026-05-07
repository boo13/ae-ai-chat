import { effectsKnowledge } from "./effects";
import { examplesKnowledge } from "./examples";
import { gotchasKnowledge } from "./gotchas";
import { layersKnowledge } from "./layers";
import { shapesKnowledge } from "./shapes";
import { textKnowledge } from "./text";
import type { KnowledgeSource } from "./types";
import { VALIDATOR_REJECTIONS } from "./validator";

const sources: KnowledgeSource[] = [
  gotchasKnowledge,
  effectsKnowledge,
  shapesKnowledge,
  textKnowledge,
  layersKnowledge,
  examplesKnowledge,
];

const REJECTION_LIST = VALIDATOR_REJECTIONS.map(
  (r) => `  - ${r.code}: ${r.description}`
).join("\n");

const RULES = `## Rules for Script Generation
- ALWAYS look up effect matchNames in the Verified Effects list before using addProperty().
- For shape layers, use the Verified Shape Properties list for operator and property matchNames.
- NEVER invent matchNames. If an effect is not in the list, say so — do not guess.
- TextDocument values must be read via .value, modified, and written back with .setValue().
- Re-lookup layer indices AFTER all layer creation (index shifting — see Gotchas).
- setValue() arrays MUST match the property's valueType exactly (4-element for COLOR, etc.).
- ES3 only: var, not let/const; no arrow functions; no template literals.
- Wrap all changes in app.beginUndoGroup() / app.endUndoGroup().

## Expressions
- Expressions run in a separate engine from scripts. Set them as string values: prop.expression = "wiggle(2, 50)".
- If app.project.expressionEngine is "extendscript", expressions must be ES3. Otherwise (default "javascript-1.0") ES6 is fine.
- The panel captures prop.expressionError after setting expressions — a broken expression triggers auto-fix. Write expressions carefully.
- Access thisComp, thisLayer, thisProperty inside expressions. Do NOT call AE scripting functions inside expressions.

## Validator — what will be blocked
The panel static-checks generated scripts before running. The following patterns are errors that block execution:
${REJECTION_LIST}`;

export function getKnowledgeContext(userMessage?: string): string {
  const sections: string[] = [];

  for (const source of sources) {
    const staticCtx = source.getStaticContext();
    if (staticCtx) sections.push(staticCtx);

    if (userMessage && source.getMessageContext) {
      const msgCtx = source.getMessageContext(userMessage);
      if (msgCtx) sections.push(msgCtx);
    }
  }

  sections.push(RULES);

  return sections.join("\n\n");
}
