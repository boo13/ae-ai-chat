import { effectsKnowledge } from "./effects";
import { gotchasKnowledge } from "./gotchas";
import type { KnowledgeSource } from "./types";

const sources: KnowledgeSource[] = [gotchasKnowledge, effectsKnowledge];

const RULES = `## Rules for Script Generation
- ALWAYS look up effect matchNames in the Verified Effects list before using addProperty().
- NEVER invent matchNames. If an effect is not in the list, say so — do not guess.
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
