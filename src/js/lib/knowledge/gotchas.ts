import { GOTCHAS } from "./data/gotchas";
import type { KnowledgeSource } from "./types";

export const gotchasKnowledge: KnowledgeSource = {
  id: "gotchas",
  getStaticContext() {
    return GOTCHAS;
  },
};
