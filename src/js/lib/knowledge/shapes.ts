import { SHAPE_PROPERTIES } from "./data/shape-properties";
import type { KnowledgeSource } from "./types";

export const shapesKnowledge: KnowledgeSource = {
  id: "shapes",
  getStaticContext() {
    if (!SHAPE_PROPERTIES) return "";

    return [
      "## Verified Shape Properties",
      "These shape-layer operator and property matchNames are empirically verified.",
      "Use them for shape contents, operators, and transform/property matchNames. Do not invent names.",
      "",
      SHAPE_PROPERTIES,
    ].join("\n");
  },
};
