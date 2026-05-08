import { EXAMPLES, type ExampleEntry } from "./data/examples";
import type { KnowledgeSource } from "./types";

const MAX_EXAMPLES = 2;

const patterns: Array<{ regex: RegExp; example: ExampleEntry }> = [];
for (const example of EXAMPLES) {
  for (const keyword of example.keywords) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    patterns.push({
      regex: new RegExp("\\b" + escaped + "\\b", "i"),
      example,
    });
  }
}

function formatExample(example: ExampleEntry): string {
  const lines = [
    "### " + example.description,
    "```jsx",
    example.script,
    "```",
  ];

  if (example.notes) {
    lines.push("Note: " + example.notes);
  }

  return lines.join("\n");
}

export const examplesKnowledge: KnowledgeSource = {
  id: "examples",
  getStaticContext() {
    return "";
  },
  getMessageContext(userMessage: string) {
    const matched: ExampleEntry[] = [];
    const matchedIds = new Set<string>();

    for (const pattern of patterns) {
      if (matchedIds.has(pattern.example.id)) continue;
      if (!pattern.regex.test(userMessage)) continue;

      matched.push(pattern.example);
      matchedIds.add(pattern.example.id);

      if (matched.length === MAX_EXAMPLES) break;
    }

    if (matched.length === 0) return "";

    return ["## Verified Working Examples", ...matched.map(formatExample)].join("\n\n");
  },
};
