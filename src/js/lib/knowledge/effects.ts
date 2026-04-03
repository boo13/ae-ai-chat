import { EFFECT_INDEX } from "./data/effect-index";
import { EFFECTS_DETAIL, type EffectDetail } from "./data/effects-detail";
import type { KnowledgeSource } from "./types";

// Build keyword patterns at module load time (one regex per keyword per effect)
const patterns: Array<{ regex: RegExp; matchName: string; isDisplayName: boolean }> = [];
for (const detail of Object.values(EFFECTS_DETAIL)) {
  for (let i = 0; i < detail.keywords.length; i++) {
    const escaped = detail.keywords[i].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    patterns.push({
      regex: new RegExp("\\b" + escaped + "\\b", "i"),
      matchName: detail.matchName,
      isDisplayName: i === 0, // keywords[0] is always displayName
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
    lines.push(`  ${prop.index}. ${prop.name} | ${prop.matchName} | ${prop.valueType} | default: ${def}`);
  }
  if (detail.warnings.length > 0) {
    lines.push("Warnings:");
    for (const w of detail.warnings) {
      lines.push(`  - ${w}`);
    }
  }
  return lines.join("\n");
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
    const matched = new Set<string>();
    const displayNameMatches = new Set<string>();

    for (const p of patterns) {
      if (p.regex.test(userMessage)) {
        matched.add(p.matchName);
        if (p.isDisplayName) displayNameMatches.add(p.matchName);
      }
    }

    if (matched.size === 0) return "";

    // Cap at 5, prefer displayName matches over alias/matchName matches
    let selected: string[];
    if (matched.size <= 5) {
      selected = Array.from(matched);
    } else {
      selected = [
        ...Array.from(displayNameMatches),
        ...Array.from(matched).filter((m) => !displayNameMatches.has(m)),
      ].slice(0, 5);
    }

    const blocks = selected
      .map((mn) => EFFECTS_DETAIL[mn])
      .filter(Boolean)
      .map(formatEffect);

    return ["## Detailed Effect Records (for effects mentioned in your request)", ...blocks].join(
      "\n\n"
    );
  },
};
