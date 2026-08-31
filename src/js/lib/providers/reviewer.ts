import { REVIEW_SYSTEM } from "../action-evidence";

const requiredFlags = ["--safe-mode", "--tools", "--strict-mcp-config", "--mcp-config", "--disable-slash-commands", "--no-session-persistence", "--permission-mode", "--system-prompt"];

export function supportsClaudeReview(help: string): boolean {
  return requiredFlags.every((flag) => help.includes(flag));
}

export function claudeReviewArgs(): string[] {
  return ["--safe-mode", "--tools", "", "--strict-mcp-config", "--mcp-config", '{"mcpServers":{}}', "--disable-slash-commands", "--no-session-persistence", "--permission-mode", "dontAsk", "--system-prompt", REVIEW_SYSTEM];
}
