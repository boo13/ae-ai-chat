import { claudeProvider } from "./providers/claude";
import { codexProvider } from "./providers/codex";
import { claudeApiProvider } from "./providers/claude-api";

export const providerRegistry = [claudeApiProvider, claudeProvider, codexProvider];
export type ProviderId = "claude-api" | "claude" | "codex";
