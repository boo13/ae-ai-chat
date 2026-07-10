import {
  effectsKnowledge,
  formatEffectRecords,
  matchEffectMatchNames,
} from "./effects";
import { recipesKnowledge } from "./recipes";
import { gotchasKnowledge } from "./gotchas";
import {
  expressionsKnowledge,
  formatExpressionRecords,
  matchExpressionFunctionNames,
} from "./expressions";
import { layersKnowledge } from "./layers";
import { shapesKnowledge } from "./shapes";
import { textKnowledge } from "./text";
import type { KnowledgeSource } from "./types";
import { VALIDATOR_REJECTIONS } from "./validator";

const sources: KnowledgeSource[] = [
  gotchasKnowledge,
  expressionsKnowledge,
  effectsKnowledge,
  shapesKnowledge,
  textKnowledge,
  layersKnowledge,
  recipesKnowledge,
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
- Enum/dropdown properties take an INTEGER index, never a UI-label string. Use only integers listed as "enum (verified)" in the effect record. If the option you need is not listed as verified, do NOT guess the integer — tell the user it is unverified and ask them to set it manually, or leave the default.
- If an effect record warns a control is "not scriptable" (CUSTOM_VALUE, e.g. Lumetri looks/curves/toning), do NOT fabricate a value — say so and have the user set it manually.
- ES3 only: var, not let/const; no arrow functions; no template literals.
- Wrap all changes in app.beginUndoGroup() / app.endUndoGroup().

## Expressions
- Use the Expression Language Reference catalog and injected detailed records for signatures, compatibility, verification status, and pitfalls.
- The panel captures prop.expressionError after setting expressions; do not claim success when an expression reports an error.

## Validator — what will be blocked
The panel static-checks generated scripts before running. The following patterns are errors that block execution:
${REJECTION_LIST}`;

export interface KnowledgeContextDiagnostics {
  recipeIds: string[];
}

export interface KnowledgeContextResult {
  text: string;
  diagnostics: KnowledgeContextDiagnostics;
}

const MAX_PRESENT_EFFECT_RECORDS = 8;
const MAX_PRESENT_EXPRESSION_RECORDS = 8;

let cachedStaticContext: string | null = null;

// Static knowledge is byte-stable across the session — providers place it
// first in the system prompt so it can be served from the prompt cache.
export function getStaticKnowledgeContext(): string {
  if (cachedStaticContext !== null) return cachedStaticContext;

  const sections: string[] = [];
  for (const source of sources) {
    const staticCtx = source.getStaticContext();
    if (staticCtx) sections.push(staticCtx);
  }
  sections.push(RULES);

  cachedStaticContext = sections.join("\n\n");
  return cachedStaticContext;
}

// Per-message knowledge: recipes and effect records matched to the user's
// request, plus verified records for effects already present on selected or
// pinned layers (so the model has correct property matchNames even when the
// user doesn't name the effect).
export function getMessageKnowledgeContext(
  userMessage?: string,
  presentEffectMatchNames?: string[],
  presentExpressionFunctions?: string[]
): KnowledgeContextResult {
  const sections: string[] = [];
  const recipeIds = new Set<string>();

  if (userMessage) {
    for (const source of sources) {
      if (!source.getMessageContext) continue;
      const msgCtx = source.getMessageContext(userMessage);
      if (!msgCtx) continue;

      sections.push(msgCtx);

      const diagnostics = source.getMessageContextDiagnostics?.(userMessage);
      if (diagnostics) {
        for (const id of diagnostics.ids) {
          recipeIds.add(id);
        }
      }
    }
  }

  if (presentEffectMatchNames && presentEffectMatchNames.length > 0) {
    const alreadyMatched = userMessage
      ? matchEffectMatchNames(userMessage)
      : new Set<string>();
    const seen = new Set<string>();
    const remaining: string[] = [];
    for (const matchName of presentEffectMatchNames) {
      if (!matchName || seen.has(matchName) || alreadyMatched.has(matchName)) continue;
      seen.add(matchName);
      remaining.push(matchName);
      if (remaining.length >= MAX_PRESENT_EFFECT_RECORDS) break;
    }

    const blocks = formatEffectRecords(remaining);
    if (blocks.length > 0) {
      sections.push(
        [
          "## Verified Effect Records (effects present on selected/pinned layers)",
          ...blocks,
        ].join("\n\n")
      );
    }
  }

  if (presentExpressionFunctions && presentExpressionFunctions.length > 0) {
    const alreadyMatched = userMessage
      ? matchExpressionFunctionNames(userMessage)
      : new Set<string>();
    const seen = new Set<string>();
    const remaining: string[] = [];
    for (const name of presentExpressionFunctions) {
      if (!name || seen.has(name) || alreadyMatched.has(name)) continue;
      seen.add(name);
      remaining.push(name);
      if (remaining.length >= MAX_PRESENT_EXPRESSION_RECORDS) break;
    }
    const blocks = formatExpressionRecords(remaining);
    if (blocks.length > 0) {
      sections.push(
        [
          "## Expression Reference Records (functions present in selected/pinned expressions)",
          ...blocks,
        ].join("\n\n")
      );
    }
  }

  return {
    text: sections.join("\n\n"),
    diagnostics: { recipeIds: Array.from(recipeIds) },
  };
}

export function getKnowledgeContext(userMessage?: string): string;
export function getKnowledgeContext(
  userMessage: string | undefined,
  options: { diagnostics: true }
): KnowledgeContextResult;
export function getKnowledgeContext(
  userMessage?: string,
  options?: { diagnostics?: boolean }
): string | KnowledgeContextResult {
  const message = getMessageKnowledgeContext(userMessage);
  const text = [getStaticKnowledgeContext(), message.text]
    .filter(Boolean)
    .join("\n\n");

  if (options?.diagnostics) {
    return { text, diagnostics: message.diagnostics };
  }

  return text;
}
