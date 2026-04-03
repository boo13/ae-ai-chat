import { CAMERA_PROPERTIES, LIGHT_PROPERTIES, MASK_PROPERTIES } from "./data/layer-properties";
import type { KnowledgeSource } from "./types";

const KEYWORD_SECTIONS: Array<{ regex: RegExp; content: string }> = [
  { regex: /\bmask(?:s|ed|ing)?\b/i, content: MASK_PROPERTIES },
  { regex: /\bcamera(?:s)?\b/i, content: CAMERA_PROPERTIES },
  { regex: /\blight(?:s|ing)?\b/i, content: LIGHT_PROPERTIES },
];

export const layersKnowledge: KnowledgeSource = {
  id: "layers",
  getStaticContext() {
    return "";
  },
  getMessageContext(userMessage: string) {
    const sections: string[] = [];

    for (const entry of KEYWORD_SECTIONS) {
      if (!entry.content) continue;
      if (!entry.regex.test(userMessage)) continue;
      sections.push(entry.content);
    }

    if (sections.length === 0) return "";

    return ["## Verified Mask / Camera / Light Properties", ...sections].join("\n\n");
  },
};
