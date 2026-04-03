import { TEXT_PROPERTIES } from "./data/text-properties";
import type { KnowledgeSource } from "./types";

export const textKnowledge: KnowledgeSource = {
  id: "text",
  getStaticContext() {
    if (!TEXT_PROPERTIES) return "";

    return [
      "## Verified Text Properties",
      "TextDocument must be read via .value, modified, then assigned back via .setValue().",
      "Do not try to set nested text style properties directly on the property object.",
      "",
      TEXT_PROPERTIES,
    ].join("\n");
  },
};
