import { EFFECT_INDEX } from "./data/effect-index";
import { EFFECTS_DETAIL, type EffectDetail } from "./data/effects-detail";
import type { KnowledgeSource } from "./types";

export const MAX_EFFECT_CONTEXT_CHARS = 24_000;
const EFFECT_CONTEXT_HEADER =
  "## Detailed Effect Records (for effects mentioned in your request)";

const patterns: Array<{
  regex: RegExp;
  keyword: string;
  matchName: string;
  isDisplayName: boolean;
}> = [];
const catalogOrder = new Map<string, number>();
const details = Object.values(EFFECTS_DETAIL);

for (let detailIndex = 0; detailIndex < details.length; detailIndex += 1) {
  const detail = details[detailIndex];
  catalogOrder.set(detail.matchName, detailIndex);

  for (
    let keywordIndex = 0;
    keywordIndex < detail.keywords.length;
    keywordIndex += 1
  ) {
    const keyword = detail.keywords[keywordIndex];
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    patterns.push({
      regex: new RegExp("\\b" + escaped + "\\b", "i"),
      keyword,
      matchName: detail.matchName,
      isDisplayName: keywordIndex === 0, // The generator stores display name first.
    });
  }
}

function formatEffect(detail: EffectDetail): string {
  const lines = [
    `### ${detail.displayName} (${detail.matchName})`,
    `addProperty("${detail.matchName}")`,
    "Properties:",
  ];
  for (const prop of detail.properties) {
    const def = Array.isArray(prop.defaultValue)
      ? `[${prop.defaultValue.join(", ")}]`
      : String(prop.defaultValue);
    let line = `  ${prop.index}. ${prop.name} | ${prop.matchName} | ${prop.valueType} | default: ${def}`;
    if (typeof prop.minValue === "number" || typeof prop.maxValue === "number") {
      line += ` | range: ${typeof prop.minValue === "number" ? prop.minValue : "?"}..${typeof prop.maxValue === "number" ? prop.maxValue : "?"}`;
    }
    if (prop.enum) {
      const options = Object.keys(prop.enum)
        .map((label) => `${label}=${prop.enum![label]}`)
        .join(", ");
      if (options) line += ` | enum (verified): ${options}`;
    }
    lines.push(line);
  }
  if (detail.warnings.length > 0) {
    lines.push("Warnings:");
    for (const warning of detail.warnings) {
      lines.push(`  - ${warning}`);
    }
  }
  return lines.join("\n");
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function wordCount(value: string): number {
  return value.split(/\s+/).filter(Boolean).length;
}

function hasExplicitEffectLine(userMessage: string, displayName: string): boolean {
  const escaped = displayName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    "^\\s*(?:(?:[-*])|(?:\\d+[.)]))\\s*" + escaped + "\\s*$",
    "im"
  ).test(userMessage);
}

function countPropertyMatches(userMessage: string, detail: EffectDetail): number {
  const propertyNames = new Set<string>();
  for (const property of detail.properties) {
    const propertyName = normalize(property.name);
    if (propertyName.length < 3) continue;
    propertyNames.add(propertyName);
  }

  let count = 0;
  for (const propertyName of propertyNames) {
    const escaped = propertyName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp("\\b" + escaped + "\\b", "i").test(userMessage)) {
      count += 1;
    }
  }
  return count;
}

interface EffectCandidate {
  detail: EffectDetail;
  explicitLine: boolean;
  displayNameMatch: boolean;
  matchedKeywordWords: number;
  matchedKeywordLength: number;
  propertyMatches: number;
  order: number;
}

function compareCandidates(a: EffectCandidate, b: EffectCandidate): number {
  if (a.explicitLine !== b.explicitLine) return a.explicitLine ? -1 : 1;
  if (a.displayNameMatch !== b.displayNameMatch) return a.displayNameMatch ? -1 : 1;
  if (a.matchedKeywordWords !== b.matchedKeywordWords) {
    return b.matchedKeywordWords - a.matchedKeywordWords;
  }
  if (a.propertyMatches !== b.propertyMatches) {
    return b.propertyMatches - a.propertyMatches;
  }
  if (a.matchedKeywordLength !== b.matchedKeywordLength) {
    return b.matchedKeywordLength - a.matchedKeywordLength;
  }
  if (a.detail.properties.length !== b.detail.properties.length) {
    return b.detail.properties.length - a.detail.properties.length;
  }
  return a.order - b.order;
}

export interface EffectRecordSelection {
  matchNames: string[];
  contextChars: number;
}

export function selectEffectRecords(
  userMessage: string,
  maxChars = MAX_EFFECT_CONTEXT_CHARS
): EffectRecordSelection {
  const matchesByDisplayName = new Map<string, EffectCandidate[]>();

  for (const pattern of patterns) {
    if (!pattern.regex.test(userMessage)) continue;

    const detail = EFFECTS_DETAIL[pattern.matchName];
    if (!detail) continue;

    const displayKey = normalize(detail.displayName);
    const candidates = matchesByDisplayName.get(displayKey) || [];
    let candidate = candidates.find(
      (entry) => entry.detail.matchName === detail.matchName
    );

    if (!candidate) {
      candidate = {
        detail,
        explicitLine: hasExplicitEffectLine(userMessage, detail.displayName),
        displayNameMatch: false,
        matchedKeywordWords: 0,
        matchedKeywordLength: 0,
        propertyMatches: countPropertyMatches(userMessage, detail),
        order: catalogOrder.get(detail.matchName) ?? 0,
      };
      candidates.push(candidate);
      matchesByDisplayName.set(displayKey, candidates);
    }

    candidate.displayNameMatch =
      candidate.displayNameMatch || pattern.isDisplayName;
    candidate.matchedKeywordWords = Math.max(
      candidate.matchedKeywordWords,
      wordCount(pattern.keyword)
    );
    candidate.matchedKeywordLength = Math.max(
      candidate.matchedKeywordLength,
      pattern.keyword.length
    );
  }

  const ranked = Array.from(matchesByDisplayName.values())
    .map((variants) => variants.sort(compareCandidates)[0])
    .sort(compareCandidates);
  const matchNames: string[] = [];
  let contextChars = EFFECT_CONTEXT_HEADER.length;

  for (const candidate of ranked) {
    const blockLength = formatEffect(candidate.detail).length;
    const separatorLength = 2;
    if (contextChars + separatorLength + blockLength > maxChars) continue;

    matchNames.push(candidate.detail.matchName);
    contextChars += separatorLength + blockLength;
  }

  return {
    matchNames,
    contextChars: matchNames.length > 0 ? contextChars : 0,
  };
}

export function matchEffectMatchNames(userMessage: string): Set<string> {
  const matched = new Set<string>();

  for (const pattern of patterns) {
    if (pattern.regex.test(userMessage)) {
      matched.add(pattern.matchName);
    }
  }

  return matched;
}

export function formatEffectRecords(matchNames: string[]): string[] {
  return matchNames
    .map((matchName) => EFFECTS_DETAIL[matchName])
    .filter(Boolean)
    .map(formatEffect);
}

export const effectsKnowledge: KnowledgeSource = {
  id: "effects",
  getStaticContext() {
    return [
      "## Verified Effects (" + EFFECT_INDEX.split("\n").length + " effects)",
      "CRITICAL: Your training data about AE effect matchNames is frequently WRONG.",
      "The list below is the ONLY authoritative source. ALWAYS use these exact matchNames.",
      "Format: Display Name | matchName (use matchName in addProperty() calls)",
      "",
      EFFECT_INDEX,
    ].join("\n");
  },
  getMessageContext(userMessage: string): string {
    const selection = selectEffectRecords(userMessage);
    if (selection.matchNames.length === 0) return "";

    const blocks = formatEffectRecords(selection.matchNames);
    return [EFFECT_CONTEXT_HEADER, ...blocks].join(
      "\n\n"
    );
  },
};
