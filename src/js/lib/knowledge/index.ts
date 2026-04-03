import { effectsKnowledge } from "./effects";
import { gotchasKnowledge } from "./gotchas";
import { layersKnowledge } from "./layers";
import { shapesKnowledge } from "./shapes";
import { textKnowledge } from "./text";
import type { KnowledgeSource } from "./types";

const sources: KnowledgeSource[] = [
  gotchasKnowledge,
  effectsKnowledge,
  shapesKnowledge,
  textKnowledge,
  layersKnowledge,
];

const RULES = `## Rules for Script Generation
- ALWAYS look up effect matchNames in the Verified Effects list before using addProperty().
- For shape layers, use the Verified Shape Properties list for operator and property matchNames.
- NEVER invent matchNames. If an effect is not in the list, say so — do not guess.
- TextDocument values must be read via .value, modified, and written back with .setValue().
- Re-lookup layer indices AFTER all layer creation (index shifting — see Gotchas).
- setValue() arrays MUST match the property's valueType exactly (4-element for COLOR, etc.).
- ES3 only: var, not let/const; no arrow functions; no template literals.
- Wrap all changes in app.beginUndoGroup() / app.endUndoGroup().`;

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
