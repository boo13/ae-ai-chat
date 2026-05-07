import { EFFECTS_DETAIL, type EffectDetail } from "./data/effects-detail";
import { codeOnlyView } from "./validator-utils";

export interface ScriptValidationOccurrence {
  line: number;
  column: number;
}

export interface ScriptValidationWarning {
  code?: string;
  invalidMatchName: string;
  suggestion?: string;
  effectDisplayName?: string;
  message: string;
  occurrences: ScriptValidationOccurrence[];
}

export interface ScriptValidationError {
  code: string;
  message: string;
  occurrences: ScriptValidationOccurrence[];
}

export interface ScriptValidationResult {
  errors: ScriptValidationError[];
  warnings: ScriptValidationWarning[];
}

/** Shared rejection catalog — also inlined in system prompt so model self-corrects. */
export const VALIDATOR_REJECTIONS: Array<{ code: string; description: string }> = [
  { code: "ES3_LET_CONST", description: "let/const — use var" },
  { code: "ES3_ARROW", description: "arrow functions (=>) — use function() {}" },
  { code: "ES3_TEMPLATE_LITERAL", description: "template literals (backtick) — use string concatenation" },
  { code: "ES3_SPREAD", description: "spread/rest operator (...) — not available in ES3" },
  {
    code: "NON_ASCII",
    description:
      "non-ASCII characters — ExtendScript .jsx files must be 7-bit ASCII only (em-dashes, smart quotes, etc. silently break the file)",
  },
  {
    code: "UNDO_GROUP_MISMATCH",
    description: "mismatched beginUndoGroup() / endUndoGroup() call counts",
  },
];

interface SuggestedMatch {
  detail: EffectDetail;
  score: number;
  fromDoNotUse?: boolean;
}

const EFFECT_PARADE_ASSIGNMENT_REGEX =
  /\b(?:var\s+)?([A-Za-z_$][\w$]*)\s*=\s*[^;]*?\.property\(\s*["']ADBE Effect Parade["']\s*\)/gms;
const DIRECT_EFFECT_ADD_REGEX =
  /\.property\(\s*["']ADBE Effect Parade["']\s*\)\s*\.addProperty\(\s*(['"])(.*?)\1\s*\)/g;
const VARIABLE_ADD_REGEX =
  /\b([A-Za-z_$][\w$]*)\.addProperty\(\s*(['"])(.*?)\2\s*\)/g;
const FUZZY_SUGGESTION_THRESHOLD = 0.68;

const validMatchNames = new Set(Object.keys(EFFECTS_DETAIL));
const catalog = Object.values(EFFECTS_DETAIL).map((detail) => {
  const aliases = buildAliases(detail);
  const doNotUseAliases = buildDoNotUseAliases(detail);
  return { detail, aliases, doNotUseAliases };
});
const suggestionCandidates = catalog.map(({ detail, aliases }) => ({ detail, aliases }));
const aliasLookup = buildAliasLookup();
const doNotUseLookup = buildDoNotUseLookup();

function buildAliases(detail: EffectDetail): string[] {
  const aliases = new Set<string>();
  const values = [detail.matchName, detail.displayName, ...detail.keywords];
  for (const value of values) {
    const normalized = normalize(value);
    if (normalized) aliases.add(normalized);
    const stripped = normalize(stripAdobePrefix(value));
    if (stripped) aliases.add(stripped);
  }
  return Array.from(aliases);
}

function buildDoNotUseAliases(detail: EffectDetail): string[] {
  const aliases = new Set<string>();
  for (const value of detail.doNotUse) {
    const normalized = normalize(value);
    if (normalized) aliases.add(normalized);
    const stripped = normalize(stripAdobePrefix(value));
    if (stripped) aliases.add(stripped);
  }
  return Array.from(aliases);
}

function buildAliasLookup(): Map<string, EffectDetail> {
  const lookup = new Map<string, EffectDetail>();
  for (const { detail, aliases } of catalog) {
    for (const alias of aliases) {
      if (!lookup.has(alias)) lookup.set(alias, detail);
    }
  }
  return lookup;
}

function buildDoNotUseLookup(): Map<string, EffectDetail> {
  const lookup = new Map<string, EffectDetail>();
  for (const { detail, doNotUseAliases } of catalog) {
    for (const alias of doNotUseAliases) {
      if (!lookup.has(alias)) lookup.set(alias, detail);
    }
  }
  return lookup;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function stripAdobePrefix(value: string): string {
  return value.replace(/^adbe\s+/i, "");
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const previous = new Array<number>(b.length + 1);
  const current = new Array<number>(b.length + 1);

  for (let j = 0; j <= b.length; j += 1) {
    previous[j] = j;
  }

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j += 1) {
      previous[j] = current[j];
    }
  }

  return previous[b.length];
}

function similarityScore(input: string, alias: string): number {
  if (!input.length || !alias.length) return 0;
  if (input === alias) return 1;
  if (input.includes(alias) || alias.includes(input)) {
    return Math.min(input.length, alias.length) / Math.max(input.length, alias.length);
  }
  const distance = levenshteinDistance(input, alias);
  return 1 - distance / Math.max(input.length, alias.length);
}

function suggestMatchName(rawValue: string): SuggestedMatch | null {
  const normalized = normalize(rawValue);
  const strippedNormalized = normalize(stripAdobePrefix(rawValue));
  if (!normalized) return null;

  const knownBadAlias =
    doNotUseLookup.get(normalized) || doNotUseLookup.get(strippedNormalized);
  if (knownBadAlias) return { detail: knownBadAlias, score: 1, fromDoNotUse: true };

  const exact = aliasLookup.get(normalized) || aliasLookup.get(strippedNormalized);
  if (exact) return { detail: exact, score: 1 };

  let best: SuggestedMatch | null = null;
  for (const candidate of suggestionCandidates) {
    let score = 0;
    for (const alias of candidate.aliases) {
      score = Math.max(
        score,
        similarityScore(normalized, alias),
        similarityScore(strippedNormalized, alias)
      );
    }
    if (!best || score > best.score) {
      best = { detail: candidate.detail, score };
    }
  }

  if (!best || best.score < FUZZY_SUGGESTION_THRESHOLD) return null;
  return best;
}

function getLineColumn(content: string, index: number): ScriptValidationOccurrence {
  const source = content.slice(0, index);
  const lines = source.split("\n");
  return {
    line: lines.length,
    column: (lines[lines.length - 1] || "").length + 1,
  };
}

function collectEffectParadeVariables(content: string): Set<string> {
  const vars = new Set<string>();
  let match: RegExpExecArray | null;
  EFFECT_PARADE_ASSIGNMENT_REGEX.lastIndex = 0;
  while ((match = EFFECT_PARADE_ASSIGNMENT_REGEX.exec(content)) !== null) {
    vars.add(match[1]);
  }
  return vars;
}

function checkEffectMatchNames(content: string): ScriptValidationWarning[] {
  const warningsByMatch = new Map<string, ScriptValidationWarning>();
  const effectParadeVars = collectEffectParadeVariables(content);
  const addPropertyCalls: Array<{ matchName: string; index: number }> = [];

  DIRECT_EFFECT_ADD_REGEX.lastIndex = 0;
  let directMatch: RegExpExecArray | null;
  while ((directMatch = DIRECT_EFFECT_ADD_REGEX.exec(content)) !== null) {
    addPropertyCalls.push({ matchName: directMatch[2], index: directMatch.index });
  }

  VARIABLE_ADD_REGEX.lastIndex = 0;
  let variableMatch: RegExpExecArray | null;
  while ((variableMatch = VARIABLE_ADD_REGEX.exec(content)) !== null) {
    if (!effectParadeVars.has(variableMatch[1])) continue;
    addPropertyCalls.push({ matchName: variableMatch[3], index: variableMatch.index });
  }

  for (const call of addPropertyCalls) {
    if (validMatchNames.has(call.matchName)) continue;

    const suggested = suggestMatchName(call.matchName);
    const warningKey = suggested
      ? `${call.matchName}::${suggested.detail.matchName}`
      : `${call.matchName}::`;
    const occurrence = getLineColumn(content, call.index);
    const message = suggested
      ? suggested.fromDoNotUse
        ? `Warning: "${call.matchName}" is a known invalid alias. Use "${suggested.detail.matchName}" (${suggested.detail.displayName}) instead.`
        : `Warning: "${call.matchName}" is not a verified effect matchName. Did you mean "${suggested.detail.matchName}" (${suggested.detail.displayName})?`
      : `Warning: "${call.matchName}" is not a verified effect matchName in the catalog.`;

    const existing = warningsByMatch.get(warningKey);
    if (existing) {
      existing.occurrences.push(occurrence);
      continue;
    }
    warningsByMatch.set(warningKey, {
      invalidMatchName: call.matchName,
      suggestion: suggested?.detail.matchName,
      effectDisplayName: suggested?.detail.displayName,
      message,
      occurrences: [occurrence],
    });
  }

  return Array.from(warningsByMatch.values());
}

function checkEs3Syntax(codeOnly: string): ScriptValidationError[] {
  const errors: ScriptValidationError[] = [];

  const checks: Array<{ re: RegExp; code: string; label: string }> = [
    { re: /\b(let|const)\s+/g, code: "ES3_LET_CONST", label: "let/const" },
    { re: /=>/g, code: "ES3_ARROW", label: "arrow function (=>)" },
    { re: /`/g, code: "ES3_TEMPLATE_LITERAL", label: "template literal" },
    { re: /\.\.\./g, code: "ES3_SPREAD", label: "spread/rest operator (...)" },
  ];

  for (const { re, code, label } of checks) {
    re.lastIndex = 0;
    const occurrences: ScriptValidationOccurrence[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(codeOnly)) !== null) {
      occurrences.push(getLineColumn(codeOnly, m.index));
    }
    if (occurrences.length > 0) {
      errors.push({
        code,
        message: `ES3 violation: ${label} — ${VALIDATOR_REJECTIONS.find((r) => r.code === code)?.description ?? label}`,
        occurrences,
      });
    }
  }

  return errors;
}

function checkNonAscii(content: string): ScriptValidationError[] {
  const re = /[^\x00-\x7f]/g;
  const occurrences: ScriptValidationOccurrence[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    occurrences.push(getLineColumn(content, m.index));
  }
  if (occurrences.length === 0) return [];
  return [
    {
      code: "NON_ASCII",
      message: `Non-ASCII character found (${occurrences.length} occurrence${occurrences.length !== 1 ? "s" : ""}) — ExtendScript .jsx files must be 7-bit ASCII only`,
      occurrences,
    },
  ];
}

function checkUndoGroupBalance(codeOnly: string): ScriptValidationError[] {
  const beginCount = (codeOnly.match(/app\.beginUndoGroup\s*\(/g) || []).length;
  const endCount = (codeOnly.match(/app\.endUndoGroup\s*\(/g) || []).length;
  if (beginCount === endCount) return [];
  if (beginCount === 0 && endCount === 0) return [];
  return [
    {
      code: "UNDO_GROUP_MISMATCH",
      message: `Unbalanced undo group: ${beginCount} beginUndoGroup() vs ${endCount} endUndoGroup()`,
      occurrences: [],
    },
  ];
}

function checkExpressionSyntax(content: string): ScriptValidationWarning[] {
  // Only check string-literal expressions that can be statically inspected
  const re = /\.expression\s*=\s*(['"])([\s\S]*?)\1/g;
  const warnings: ScriptValidationWarning[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const exprStr = m[2];
    if (/[^\x00-\x7f]/.test(exprStr)) continue; // skip non-ASCII (already caught)
    if (exprStr.trim().length === 0) continue;
    try {
      // eslint-disable-next-line no-new-func
      new Function(exprStr);
    } catch {
      const occ = getLineColumn(content, m.index);
      warnings.push({
        code: "EXPR_SYNTAX",
        invalidMatchName: "",
        message: `Possible expression syntax error: "${exprStr.substring(0, 80)}${exprStr.length > 80 ? "…" : ""}"`,
        occurrences: [occ],
      });
    }
  }
  return warnings;
}

export function validateScript(content: string): ScriptValidationResult {
  const codeOnly = codeOnlyView(content);

  const errors: ScriptValidationError[] = [
    ...checkNonAscii(content),       // Check original — non-ASCII anywhere breaks the file
    ...checkEs3Syntax(codeOnly),      // Check code-only — ignore strings/comments
    ...checkUndoGroupBalance(codeOnly),
  ];

  const warnings: ScriptValidationWarning[] = [
    ...checkEffectMatchNames(content),
    ...checkExpressionSyntax(content),
  ];

  return { errors, warnings };
}
