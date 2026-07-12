import { EFFECTS_DETAIL, type EffectDetail } from "./data/effects-detail";
import { EXPRESSION_FUNCTION_NAMES } from "./data/expressions";
import { PROPERTY_MATCHNAMES } from "./data/property-matchnames";
import { codeOnlyView, tokenizeJsx } from "./validator-utils";

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
  {
    code: "INVALID_GLOBAL",
    description:
      "undefined ExtendScript global — the layer blend-mode enum is BlendingMode (e.g. BlendingMode.SCREEN), not BlendMode",
  },
  {
    code: "SETVALUE_ARITY",
    description: "literal setValue() shape does not match the verified property valueType",
  },
];

// ExtendScript globals the model commonly misspells. The bad form is always a
// ReferenceError at runtime (and aborts the whole script), so block it here.
const INVALID_GLOBALS: Array<{ bad: string; good: string }> = [
  { bad: "BlendMode", good: "BlendingMode" },
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
const validPropertyMatchNames = new Set(Object.keys(PROPERTY_MATCHNAMES));
const effectPropertyMatchNames = new Set(
  Object.values(EFFECTS_DETAIL).flatMap((detail) => detail.properties.map((prop) => prop.matchName))
);
const expressionFunctionNames = new Set(EXPRESSION_FUNCTION_NAMES);

interface EnumPropInfo {
  effectDisplayName: string;
  propName: string;
  valueType: string;
  enumValues?: Record<string, number | string>;
}

// All OneD (single-value) effect properties, keyed by property matchName.
// OneD properties never accept a UI-label string via setValue(); those with a
// verified `enum` map additionally constrain the accepted integers.
const oneDPropsByMatchName = buildOneDPropMap();

function buildOneDPropMap(): Map<string, EnumPropInfo> {
  const map = new Map<string, EnumPropInfo>();
  for (const detail of Object.values(EFFECTS_DETAIL)) {
    for (const prop of detail.properties) {
      if (prop.valueType !== "OneD") continue;
      if (map.has(prop.matchName)) continue;
      map.set(prop.matchName, {
        effectDisplayName: detail.displayName,
        propName: prop.name,
        valueType: prop.valueType,
        enumValues: prop.enum,
      });
    }
  }
  return map;
}
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

// Common property matchName mistakes the model makes that fuzzy matching misses
// (too dissimilar to the correct name to score above the similarity threshold).
const KNOWN_PROPERTY_CORRECTIONS: Record<string, string> = {
  "ADBE Effect Group": "ADBE Effect Parade",
};

function suggestPropertyMatchName(rawValue: string): string | undefined {
  const known = KNOWN_PROPERTY_CORRECTIONS[rawValue];
  if (known) return known;
  const normalized = normalize(rawValue);
  let bestName: string | undefined;
  let bestScore = 0;
  for (const matchName of validPropertyMatchNames) {
    const score = similarityScore(normalized, normalize(matchName));
    if (score > bestScore) {
      bestName = matchName;
      bestScore = score;
    }
  }
  return bestScore >= 0.78 ? bestName : undefined;
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

function checkPropertyMatchNames(content: string): ScriptValidationWarning[] {
  const warnings: ScriptValidationWarning[] = [];
  const seen = new Set<string>();
  const scanText = commentsBlankedView(content);
  const re = /\.property\(\s*(['"])(ADBE [^'"]+)\1\s*\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(scanText)) !== null) {
    const matchName = match[2];
    if (
      validPropertyMatchNames.has(matchName) ||
      effectPropertyMatchNames.has(matchName) ||
      matchName === "ADBE Effect Parade"
    ) continue;
    if (seen.has(matchName)) continue;
    seen.add(matchName);
    const suggestion = suggestPropertyMatchName(matchName);
    warnings.push({
      code: "PROPERTY_MATCHNAME",
      invalidMatchName: matchName,
      suggestion,
      message: suggestion
        ? `Warning: "${matchName}" is not a verified property matchName. Did you mean "${suggestion}"?`
        : `Warning: "${matchName}" is not a verified property matchName.`,
      occurrences: [getLineColumn(content, match.index)],
    });
  }
  return warnings;
}

function checkEs3Syntax(codeOnly: string): ScriptValidationError[] {
  const errors: ScriptValidationError[] = [];

  const checks: Array<{ re: RegExp; code: string; label: string }> = [
    { re: /\b(let|const)\s+/g, code: "ES3_LET_CONST", label: "let/const" },
    { re: /=>/g, code: "ES3_ARROW", label: "arrow function (=>)" },
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

// Backtick regions are tokenized as "string" tokens (see tokenizeJsx), so
// codeOnlyView blanks them out and they can never reach checkEs3Syntax's
// regex checks. Detect template literals from the tokens directly instead.
function checkTemplateLiterals(content: string): ScriptValidationError[] {
  const occurrences: ScriptValidationOccurrence[] = [];
  let offset = 0;
  for (const token of tokenizeJsx(content)) {
    if (token.kind === "string" && token.text.startsWith("`")) {
      occurrences.push(getLineColumn(content, offset));
    }
    offset += token.text.length;
  }
  if (occurrences.length === 0) return [];
  return [
    {
      code: "ES3_TEMPLATE_LITERAL",
      message: `ES3 violation: template literal — ${VALIDATOR_REJECTIONS.find((r) => r.code === "ES3_TEMPLATE_LITERAL")?.description ?? "template literal"}`,
      occurrences,
    },
  ];
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

function checkInvalidGlobals(codeOnly: string): ScriptValidationError[] {
  const errors: ScriptValidationError[] = [];
  for (const { bad, good } of INVALID_GLOBALS) {
    const re = new RegExp("\\b" + bad + "\\s*\\.", "g");
    const occurrences: ScriptValidationOccurrence[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(codeOnly)) !== null) {
      occurrences.push(getLineColumn(codeOnly, m.index));
    }
    if (occurrences.length > 0) {
      errors.push({
        code: "INVALID_GLOBAL",
        message: `${bad} is not defined in ExtendScript — use ${good} (e.g. ${good}.SCREEN).`,
        occurrences,
      });
    }
  }
  return errors;
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

interface ExpressionLiteral {
  value: string;
  index: number;
}

function decodeStringLiteral(literal: string): string {
  const quote = literal[0];
  const body = literal.slice(1, -1);
  if (quote === '"') {
    try { return JSON.parse(literal); } catch {}
  }
  return body.replace(/\\(?:x([0-9a-fA-F]{2})|u([0-9a-fA-F]{4})|([nrtbfv\\'"]))/g, (_match, hex, unicode, escaped) => {
    if (hex) return String.fromCharCode(parseInt(hex, 16));
    if (unicode) return String.fromCharCode(parseInt(unicode, 16));
    const values: Record<string, string> = {
      n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", v: "\v",
      "\\": "\\", "'": "'", '"': '"',
    };
    return values[escaped] ?? escaped;
  });
}

function extractExpressionLiterals(content: string): ExpressionLiteral[] {
  const results: ExpressionLiteral[] = [];
  const scanText = commentsBlankedView(content);
  const assignment = /\.expression\s*=\s*((?:(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')\s*(?:\+\s*)?)+)\s*;/g;
  let match: RegExpExecArray | null;
  while ((match = assignment.exec(scanText)) !== null) {
    const sequence = match[1];
    const stringRe = /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g;
    const strings = sequence.match(stringRe) || [];
    const separators = sequence.replace(stringRe, "").replace(/[+\s]/g, "");
    if (strings.length === 0 || separators) continue;
    results.push({ value: strings.map(decodeStringLiteral).join(""), index: match.index });
  }
  return results;
}

function checkExpressionSyntax(content: string): ScriptValidationWarning[] {
  const warnings: ScriptValidationWarning[] = [];
  for (const expression of extractExpressionLiterals(content)) {
    const exprStr = expression.value;
    if (/[^\x00-\x7f]/.test(exprStr)) continue; // skip non-ASCII (already caught)
    if (exprStr.trim().length === 0) continue;
    try {
      // eslint-disable-next-line no-new-func
      new Function(exprStr);
    } catch {
      const occ = getLineColumn(content, expression.index);
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

const EXPRESSION_BUILTINS = new Set([
  "if", "for", "while", "switch", "catch", "function",
  "Math", "Array", "Object", "String", "Number", "Boolean", "Date", "RegExp",
  "parseInt", "parseFloat", "isNaN", "isFinite", "eval",
  "content",
  "abs", "acos", "asin", "atan", "atan2", "ceil", "cos", "exp", "floor", "log",
  "max", "min", "pow", "round", "sin", "sqrt", "tan",
]);

function checkUnknownExpressionFunctions(content: string): ScriptValidationWarning[] {
  const warnings: ScriptValidationWarning[] = [];
  for (const expression of extractExpressionLiterals(content)) {
    const declared = new Set<string>();
    let declaration: RegExpExecArray | null;
    const declarationRe = /\bfunction\s+([A-Za-z_$][\w$]*)\s*\(|\bvar\s+([A-Za-z_$][\w$]*)\s*=\s*function\b/g;
    while ((declaration = declarationRe.exec(expression.value)) !== null) {
      declared.add(declaration[1] || declaration[2]);
    }
    const seen = new Set<string>();
    const callRe = /\b([A-Za-z_$][\w$]*)\s*\(/g;
    let call: RegExpExecArray | null;
    while ((call = callRe.exec(expression.value)) !== null) {
      const name = call[1];
      if (
        seen.has(name) || declared.has(name) || expressionFunctionNames.has(name) ||
        EXPRESSION_BUILTINS.has(name)
      ) continue;
      seen.add(name);
      warnings.push({
        code: "EXPR_UNKNOWN_FN",
        invalidMatchName: name,
        message: `Expression calls unknown function "${name}()". Verify the name against the expression catalog or declare it locally.`,
        occurrences: [getLineColumn(content, expression.index)],
      });
    }
  }
  return warnings;
}

function checkExpressionScriptingApi(content: string): ScriptValidationWarning[] {
  const warnings: ScriptValidationWarning[] = [];
  for (const expression of extractExpressionLiterals(content)) {
    const match = expression.value.match(/\bapp\s*\.|\.setValue\s*\(|\.addProperty\s*\(/);
    if (!match) continue;
    warnings.push({
      code: "EXPR_SCRIPTING_API",
      invalidMatchName: match[0],
      message: "Expression source uses the After Effects scripting API. Expressions cannot call app, setValue(), or addProperty().",
      occurrences: [getLineColumn(content, expression.index)],
    });
  }
  return warnings;
}

const STRING_LITERAL_RE = /(['"])((?:\\.|(?!\1).)*)\1/;
const NUMBER_LITERAL_RE = /-?\d+(?:\.\d+)?/;

function commentsBlankedView(content: string): string {
  return tokenizeJsx(content)
    .map((token) =>
      token.kind === "line-comment" || token.kind === "block-comment"
        ? token.text.replace(/[^\n]/g, " ")
        : token.text
    )
    .join("");
}

// Catches a literal value passed to a OneD/enum effect property:
//   - a UI-label string ("Dynamic", "Cinespace 2383sRGB6bit") — never valid
//   - an integer outside the verified enum set — likely a guessed value
// Heuristic + statement-scoped: only fires when the property matchName and a
// literal value appear in the same statement (covers both
// `.property("MN").setValue(v)` and `helper(fx, "MN", v)` forms). Variable
// values are ignored (no false positives), so coverage is best-effort.
function checkEnumValues(content: string): ScriptValidationWarning[] {
  const warnings: ScriptValidationWarning[] = [];
  const seen = new Set<string>();
  const mnRe = /(['"])(ADBE [^'"]+-\d{4}|CC [^'"]+-\d{4})\1/g;
  const scanText = commentsBlankedView(content);

  let lineStart = 0;
  for (const code of scanText.split("\n")) {
    mnRe.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = mnRe.exec(code)) !== null) {
      const matchName = m[2];
      const info = oneDPropsByMatchName.get(matchName);
      if (!info) continue;

      const afterIdx = m.index + m[0].length;
      let rest = code.slice(afterIdx);
      const semi = rest.indexOf(";");
      if (semi !== -1) rest = rest.slice(0, semi);

      const strMatch = rest.match(STRING_LITERAL_RE);
      const numMatch = rest.match(NUMBER_LITERAL_RE);
      const strIdx = strMatch ? rest.indexOf(strMatch[0]) : Infinity;
      const numIdx = numMatch ? rest.indexOf(numMatch[0]) : Infinity;
      if (strIdx === Infinity && numIdx === Infinity) continue;

      const optionList = info.enumValues
        ? Object.keys(info.enumValues)
            .map((label) => `${label}=${info.enumValues![label]}`)
            .join(", ")
        : "";
      const occurrence = getLineColumn(content, lineStart + m.index);

      let message: string | null = null;
      if (strIdx < numIdx) {
        message =
          `Warning: ${info.effectDisplayName} "${info.propName}" (${matchName}) is a numeric property — ` +
          `pass an integer, not a UI label string "${strMatch![2]}".` +
          (optionList ? ` Verified options: ${optionList}.` : "");
      } else if (info.enumValues) {
        const value = Number(numMatch![0]);
        const verified = Object.values(info.enumValues).some(
          (v) => Number(v) === value
        );
        if (!verified) {
          message =
            `Warning: ${value} is not a verified value for ${info.effectDisplayName} "${info.propName}" ` +
            `(${matchName}). Use a verified option or leave the default — do not guess.` +
            (optionList ? ` Verified options: ${optionList}.` : "");
        }
      }

      if (!message) continue;
      const key = `${matchName}::${message}`;
      if (seen.has(key)) continue;
      seen.add(key);
      warnings.push({
        code: "ENUM_VALUE",
        invalidMatchName: matchName,
        message,
        occurrences: [occurrence],
      });
    }
    lineStart += code.length + 1;
  }

  return warnings;
}

function expectedValueArities(valueType: string): number[] | null {
  if (valueType === "COLOR") return [4];
  if (valueType === "TwoD" || valueType === "TwoD_SPATIAL") return [2];
  if (valueType === "ThreeD" || valueType === "ThreeD_SPATIAL") return [3];
  if (valueType === "TwoD_OR_ThreeD" || valueType === "TwoD_OR_ThreeD_SPATIAL") return [2, 3];
  if (valueType === "OneD" || valueType === "LAYER_INDEX" || valueType === "MASK_INDEX") return [1];
  return null;
}

function literalArrayArity(value: string): number | null {
  const body = value.trim().slice(1, -1).trim();
  if (!body) return 0;
  if (/[\[\]{}]/.test(body)) return null;
  return body.split(",").length;
}

// Position/Anchor Point/Scale share one matchName across 2D layers (2 elements)
// and 3D layers, cameras, and lights (3), so their arity is genuinely ambiguous.
const DIMENSION_AMBIGUOUS_MATCHNAMES = new Set([
  "ADBE Position",
  "ADBE Anchor Point",
  "ADBE Scale",
]);

function checkSetValueArity(content: string): ScriptValidationError[] {
  const errors: ScriptValidationError[] = [];
  const scanText = commentsBlankedView(content);
  const re = /\.property\(\s*(['"])([^'"]+)\1\s*\)\s*\.setValue\(\s*(\[[^\]]*\]|-?\d+(?:\.\d+)?)\s*\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(scanText)) !== null) {
    const matchName = match[2];
    const detail = PROPERTY_MATCHNAMES[matchName];
    if (!detail) continue;
    const expected = DIMENSION_AMBIGUOUS_MATCHNAMES.has(matchName)
      ? [2, 3]
      : expectedValueArities(detail.valueType);
    if (!expected) continue;
    const literal = match[3].trim();
    const actual = literal[0] === "[" ? literalArrayArity(literal) : 1;
    if (actual === null || expected.includes(actual)) continue;
    errors.push({
      code: "SETVALUE_ARITY",
      message: `${detail.name} (${matchName}) is ${detail.valueType}; setValue() received a literal with arity ${actual}, expected ${expected.join(" or ")}.`,
      occurrences: [getLineColumn(content, match.index)],
    });
  }
  return errors;
}

export function validateScript(content: string): ScriptValidationResult {
  const codeOnly = codeOnlyView(content);

  const errors: ScriptValidationError[] = [
    ...checkNonAscii(content),       // Check original — non-ASCII anywhere breaks the file
    ...checkEs3Syntax(codeOnly),      // Check code-only — ignore strings/comments
    ...checkTemplateLiterals(content), // Check original — backticks are tokenized as strings, so codeOnly can't see them
    ...checkInvalidGlobals(codeOnly),
    ...checkUndoGroupBalance(codeOnly),
    ...checkSetValueArity(content),
  ];

  const warnings: ScriptValidationWarning[] = [
    ...checkEffectMatchNames(content),
    ...checkPropertyMatchNames(content),
    ...checkExpressionSyntax(content),
    ...checkUnknownExpressionFunctions(content),
    ...checkExpressionScriptingApi(content),
    ...checkEnumValues(content),
  ];

  return { errors, warnings };
}
