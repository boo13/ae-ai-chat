import {
  EXPRESSION_FUNCTION_NAMES,
  EXPRESSION_GOTCHAS,
  EXPRESSION_INDEX,
  EXPRESSIONS_DETAIL,
  type ExpressionDetail,
} from "./data/expressions";
import type { KnowledgeSource } from "./types";

export const MAX_EXPRESSION_CONTEXT_CHARS = 8_000;
const HEADER = "## Expression Reference Records";
const GENERIC_TERMS = new Set([
  "expression", "expressions", "property", "properties", "value", "values",
  "method", "methods", "object", "objects", "layer", "layers", "number",
  "numbers", "array", "arrays", "current", "returns", "return",
]);

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function recordTerms(record: ExpressionDetail): string[] {
  return Array.from(
    new Set([
      record.name,
      record.signature,
      record.object,
      ...record.keywords,
      ...record.appliesTo,
    ])
  ).filter((term) => Boolean(term) && !GENERIC_TERMS.has(term.toLowerCase()));
}

function matches(message: string, record: ExpressionDetail): boolean {
  return recordTerms(record).some((term) => {
    const normalized = term.trim();
    if (normalized.length < 3) return false;
    return new RegExp("\\b" + escapeRegex(normalized) + "\\b", "i").test(message);
  });
}

export function formatExpressionRecord(record: ExpressionDetail): string {
  const lines = [
    `### ${record.object}.${record.name}`,
    `Signature: ${record.signature}`,
    `Returns: ${record.returns}`,
    `Status: ${record.verifiedStatus}${record.verifiedAEVersion ? ` in AE ${record.verifiedAEVersion}` : ""}`,
  ];
  if (record.params.length > 0) {
    lines.push("Parameters:");
    for (const param of record.params) {
      lines.push(
        `  - ${param.name}: ${param.type}${param.optional ? " (optional)" : ""}${param.description ? ` - ${param.description}` : ""}`
      );
    }
  }
  if (record.example) lines.push("Reference usage:\n```javascript\n" + record.example + "\n```");
  if (record.pitfalls.length > 0) {
    lines.push("Pitfalls:");
    for (const pitfall of record.pitfalls) lines.push(`  - ${pitfall}`);
  }
  if (record.minVersion) lines.push(`Added: AE ${record.minVersion}`);
  lines.push(`Source: ${record.source}`);
  return lines.join("\n");
}

export function matchExpressionFunctionNames(message: string): Set<string> {
  const matched = new Set<string>();
  for (const name of EXPRESSION_FUNCTION_NAMES) {
    if (new RegExp("\\b" + escapeRegex(name) + "\\s*\\(", "i").test(message)) {
      matched.add(name);
    }
  }
  return matched;
}

export function formatExpressionRecords(functionNames: string[]): string[] {
  const wanted = new Set(functionNames);
  return EXPRESSIONS_DETAIL.filter((record) => wanted.has(record.name)).map(formatExpressionRecord);
}

export function selectExpressionRecords(
  message: string,
  maxChars = MAX_EXPRESSION_CONTEXT_CHARS
): ExpressionDetail[] {
  const candidates = EXPRESSIONS_DETAIL.filter((record) => matches(message, record)).sort((a, b) => {
    const aNamed = new RegExp("\\b" + escapeRegex(a.name) + "\\b", "i").test(message);
    const bNamed = new RegExp("\\b" + escapeRegex(b.name) + "\\b", "i").test(message);
    if (aNamed !== bNamed) return aNamed ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  const selected: ExpressionDetail[] = [];
  let chars = HEADER.length;
  for (const record of candidates) {
    const block = formatExpressionRecord(record);
    if (chars + block.length + 2 > maxChars) continue;
    selected.push(record);
    chars += block.length + 2;
  }
  return selected;
}

export const expressionsKnowledge: KnowledgeSource = {
  id: "expressions",
  getStaticContext() {
    return [
      "## Expression Language Reference",
      "Use this provenance-backed catalog instead of relying on memory. Each detailed record states whether it is docs-sourced, verified, or failed in AE.",
      EXPRESSION_INDEX,
      EXPRESSION_GOTCHAS,
    ]
      .filter(Boolean)
      .join("\n\n");
  },
  getMessageContext(message: string) {
    const selected = selectExpressionRecords(message);
    if (selected.length === 0) return "";
    return [HEADER, ...selected.map(formatExpressionRecord)].join("\n\n");
  },
};
