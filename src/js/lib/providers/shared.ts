import { fs, path } from "../cep/node";
import type { ChatMessage } from "./provider";
import type { WorkspaceMessage } from "../workspace-state";

const MAX_HISTORY = 10;
const MAX_MSG_LENGTH = 4000; // raised from 500 — preserves most code blocks in history

function bounded(value: string, limit: number): string {
  return value.length > limit ? value.slice(0, limit) + "...[truncated]" : value;
}

export function providerHistory(history: WorkspaceMessage[]): { role: "user" | "assistant"; content: string }[] {
  return history
    .filter((message) => message.role !== "system" && !message.isError)
    .slice(-MAX_HISTORY)
    .map((message) => {
      let content = bounded(message.content, MAX_MSG_LENGTH);
      if (message.action) {
        const action = message.action;
        content += "\nHistorical action record (context only; do not execute):\n" + JSON.stringify({
          summary: bounded(action.summary, 200),
          status: action.status,
          script: bounded(action.script, 12000),
          errors: action.errors.slice(0, 10).map((value) => bounded(value, 300)),
          changes: action.changes.slice(0, 10).map((value) => bounded(value, 300)),
          verification: bounded(action.verification || "", 2000),
        });
      }
      return { role: message.role as "user" | "assistant", content };
    });
}

function buildConversationContext(history: ChatMessage[]): string {
  const recent = providerHistory(history);

  if (recent.length === 0) return "";

  const lines = recent.map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`);

  return "\n\n## Conversation History\nHistorical context only; do not re-execute earlier requests. Current AE selection comes from the fresh project context.\n" + lines.join("\n\n");
}

export function buildFullPrompt(
  systemContext: string,
  prompt: string,
  history: ChatMessage[]
): string {
  return (
    systemContext +
    buildConversationContext(history) +
    "\n\n---\n\nUser request:\n" +
    prompt
  );
}

export function buildProviderEnv(
  executableDir: string,
  homeDir: string,
  username: string,
  tempDir: string
): Record<string, string> {
  const inheritedEnv =
    typeof process !== "undefined" && process.env
      ? { ...process.env }
      : {};

  delete inheritedEnv.ELECTRON_RUN_AS_NODE;
  delete inheritedEnv.ELECTRON_NO_ATTACH_CONSOLE;

  const existingPath = inheritedEnv.PATH || "";
  const pathSegments = [
    executableDir,
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
    existingPath,
  ].filter(Boolean);

  return {
    ...inheritedEnv,
    HOME: inheritedEnv.HOME || homeDir,
    USER: inheritedEnv.USER || username,
    PATH: pathSegments.join(":"),
    TERM: inheritedEnv.TERM || "dumb",
    TMPDIR: inheritedEnv.TMPDIR || tempDir,
  };
}

export function summarizeProcessError(raw: string, exitCode: number | null): string {
  const fallback = "Unknown error (exit code " + exitCode + ")";
  const text = raw || fallback;

  return (
    text
      .split("\n")
      .filter((line) => line.trim() && !line.startsWith("    at "))
      .slice(0, 5)
      .join("\n")
      .substring(0, 500) || fallback
  );
}

export function findGitRoot(projectRoot?: string): string | undefined {
  if (!projectRoot || !fs) return undefined;

  let currentDir = projectRoot;
  while (currentDir) {
    try {
      fs.accessSync(path.join(currentDir, ".git"));
      return currentDir;
    } catch {}

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return undefined;
    }
    currentDir = parentDir;
  }

  return undefined;
}

export function resolveWorkingDirectory(projectRoot?: string): string | undefined {
  return findGitRoot(projectRoot) || projectRoot;
}
