import { child_process, fs, os, path } from "../cep/node";
import {
  buildProviderEnv,
  findGitRoot,
  resolveWorkingDirectory,
  summarizeProcessError,
} from "./shared";
import type {
  ProviderDefinition,
  ProviderResult,
  ProviderStatusUpdate,
  SendMessageOptions,
} from "./provider";

let cachedCodexPath: string | null = null;
const CODEX_TIMEOUT_MS = 600000;
const CODEX_STALL_MS = 15000;

function shortenDetail(value: string, maxLength = 56): string {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) return compact;
  return compact.slice(0, maxLength - 3) + "...";
}

function unwrapShellCommand(command: string): string {
  const zshMatch = command.match(/^\/bin\/zsh -lc '([\s\S]+)'$/);
  if (zshMatch?.[1]) return zshMatch[1];

  const bashMatch = command.match(/^\/bin\/bash -lc '([\s\S]+)'$/);
  if (bashMatch?.[1]) return bashMatch[1];

  return command;
}

function describeCommand(command: string | undefined): string | null {
  if (!command) return null;
  return shortenDetail(unwrapShellCommand(command));
}

function describeTool(item: any): string | null {
  const parts = [
    item?.server_name,
    item?.tool_name,
    item?.name,
    item?.function_name,
  ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  if (parts.length === 0) return null;
  return shortenDetail(parts.join(" / "));
}

function statusFromCommandItem(item: any, eventType: string): ProviderStatusUpdate {
  const command = describeCommand(item?.command);
  const completed = eventType === "item.completed";
  const failed = completed && typeof item?.exit_code === "number" && item.exit_code !== 0;

  if (failed) {
    return {
      phase: "error",
      text: command ? "Command failed: " + command : "Command failed.",
      raw: item?.aggregated_output,
      terminal: false,
    };
  }

  if (completed) {
    return {
      phase: "working",
      text: command ? "Command finished: " + command : "Command finished.",
      raw: item?.aggregated_output,
    };
  }

  return {
    phase: "working",
    text: command ? "Running command: " + command : "Running command...",
    raw: item?.status,
  };
}

function statusFromToolItem(item: any, eventType: string): ProviderStatusUpdate {
  const label = describeTool(item);
  const completed = eventType === "item.completed";

  if (completed) {
    return {
      phase: "working",
      text: label ? "Tool finished: " + label : "Tool finished.",
    };
  }

  return {
    phase: "working",
    text: label ? "Using tool: " + label : "Using tool...",
  };
}

function statusFromAgentMessage(item: any): ProviderStatusUpdate {
  const text =
    typeof item?.text === "string" && item.text.trim().length > 0
      ? shortenDetail(item.text, 72)
      : "";

  return {
    phase: "responding",
    text: text ? "Drafting response: " + text : "Generating response...",
    raw: item?.type,
  };
}

function statusFromReasoningItem(item: any, eventType: string): ProviderStatusUpdate {
  if (eventType === "item.completed") {
    return {
      phase: "thinking",
      text: "Reasoning step complete.",
      raw: item?.type,
    };
  }

  return {
    phase: "thinking",
    text: "Reasoning through the request...",
    raw: item?.type,
  };
}

function statusFromGenericItem(item: any, eventType: string): ProviderStatusUpdate | null {
  const itemType = typeof item?.type === "string" ? item.type : "";

  if (!itemType) return null;

  if (itemType === "agent_message") {
    return statusFromAgentMessage(item);
  }

  if (itemType === "reasoning") {
    return statusFromReasoningItem(item, eventType);
  }

  if (itemType === "command_execution") {
    return statusFromCommandItem(item, eventType);
  }

  if (
    itemType === "tool_use" ||
    itemType === "mcp_tool_call" ||
    itemType === "function_call"
  ) {
    return statusFromToolItem(item, eventType);
  }

  if (itemType === "file_search" || itemType === "search") {
    return {
      phase: "working",
      text: "Searching the workspace...",
      raw: itemType,
    };
  }

  if (itemType === "file_read" || itemType === "open_file" || itemType === "fetch") {
    return {
      phase: "working",
      text: "Reading files...",
      raw: itemType,
    };
  }

  if (itemType === "patch" || itemType === "apply_patch" || itemType === "edit") {
    return {
      phase: "working",
      text: "Preparing edits...",
      raw: itemType,
    };
  }

  if (itemType === "todo") {
    return {
      phase: "working",
      text: "Updating task plan...",
      raw: itemType,
    };
  }

  return {
    phase: "working",
    text: "Working: " + itemType.replace(/_/g, " "),
    raw: itemType,
  };
}

function findCodexPath(): string {
  if (cachedCodexPath) return cachedCodexPath;
  if (!fs) return "codex";

  const candidates = [
    "/opt/homebrew/bin/codex",
    "/usr/local/bin/codex",
    path.join(os.homedir(), ".local/bin/codex"),
  ];

  for (const candidate of candidates) {
    try {
      fs.accessSync(candidate);
      cachedCodexPath = candidate;
      return candidate;
    } catch {}
  }

  return "codex";
}

function getCleanEnv(): Record<string, string> {
  const codexPath = findCodexPath();
  return buildProviderEnv(
    path.dirname(codexPath),
    os.homedir(),
    os.userInfo()?.username || "user",
    os.tmpdir()
  );
}

function shouldSkipGitRepoCheck(projectRoot?: string): boolean {
  return !findGitRoot(projectRoot);
}

function hasResolvedCodexBinary(): boolean {
  const codexPath = findCodexPath();
  if (codexPath !== "codex") return true;

  if (!child_process?.spawnSync) return false;

  try {
    const result = child_process.spawnSync("codex", ["--version"], {
      env: getCleanEnv(),
      stdio: "ignore",
    });
    return !result.error && result.status === 0;
  } catch {
    return false;
  }
}

async function sendCodexMessage(
  prompt: string,
  options: SendMessageOptions
): Promise<ProviderResult> {
  return new Promise((resolve) => {
    if (!child_process || !child_process.spawn) {
      resolve({
        result: "Node.js not available. Are you running inside a CEP panel?",
        duration_ms: 0,
        is_error: true,
      });
      return;
    }

    const emitStatus = (status: ProviderStatusUpdate) => {
      options.onStatus?.(status);
    };

    const resetStallTimer = (() => {
      let stallTimer: ReturnType<typeof setTimeout> | null = null;

      return {
        touch() {
          if (stallTimer) {
            clearTimeout(stallTimer);
          }
          stallTimer = setTimeout(() => {
            emitStatus({
              phase: "thinking",
              text: "Still thinking...",
            });
          }, CODEX_STALL_MS);
        },
        clear() {
          if (stallTimer) {
            clearTimeout(stallTimer);
            stallTimer = null;
          }
        },
      };
    })();

    const humanizeCodexEvent = (payload: any): ProviderStatusUpdate | null => {
      if (!payload || typeof payload !== "object") return null;

      if (payload.type === "thread.started") {
        return {
          phase: "connecting",
          text: "Starting Codex session...",
          raw: payload.type,
        };
      }

      if (payload.type === "turn.started") {
        return {
          phase: "thinking",
          text: "Thinking...",
          raw: payload.type,
        };
      }

      if (
        payload.type === "item.started" ||
        payload.type === "item.updated" ||
        payload.type === "item.completed"
      ) {
        return statusFromGenericItem(payload.item, payload.type);
      }

      if (payload.type === "turn.completed") {
        return {
          phase: "completed",
          text: "Response complete.",
          raw: payload.type,
          terminal: true,
        };
      }

      if (payload.type === "error") {
        return {
          phase: "error",
          text: "Codex reported an error.",
          raw: payload.type,
          terminal: true,
        };
      }

      return null;
    };

    const fullPrompt = options.systemContext
      ? options.systemContext + "\n\n" + prompt
      : prompt;
    const startTime = Date.now();
    const args = options.sessionId
      ? ["exec", "resume", "--json", options.sessionId, "--model", options.model]
      : ["exec", "-", "--json", "--model", options.model];

    if (shouldSkipGitRepoCheck(options.projectRoot)) {
      args.push("--skip-git-repo-check");
    }

    if (options.imagePath) {
      args.push("--image", options.imagePath);
    }

    if (options.sessionId) {
      args.push(fullPrompt);
    }

    const proc = child_process.spawn(
      findCodexPath(),
      args,
      {
        cwd: resolveWorkingDirectory(options.projectRoot) || os.homedir(),
        env: getCleanEnv(),
        stdio: ["pipe", "pipe", "pipe"],
      }
    );

    let stdout = "";
    let stdoutBuffer = "";
    let stderr = "";
    let killed = false;
    let cancelled = false;
    let result = "";
    let sessionId = options.sessionId;
    let emittedAssistantText = false;

    emitStatus({
      phase: "connecting",
      text: "Starting Codex...",
    });
    emitStatus({
      phase: "thinking",
      text: "Thinking...",
    });
    const timer = setTimeout(() => {
      killed = true;
      resetStallTimer.clear();
      proc.kill();
    }, CODEX_TIMEOUT_MS);
    resetStallTimer.touch();

    // Wire AbortSignal for user-initiated cancel
    if (options.signal) {
      options.signal.addEventListener("abort", () => {
        cancelled = true;
        clearTimeout(timer);
        resetStallTimer.clear();
        emitStatus({
          phase: "cancelled",
          text: "Cancelling request...",
        });
        proc.kill();
      }, { once: true });
    }

    proc.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      stdout += text;
      stdoutBuffer += text;
      resetStallTimer.touch();

      const lines = stdoutBuffer.split(/\r?\n/);
      stdoutBuffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
          const payload = JSON.parse(trimmed);
          if (payload?.type === "thread.started" && typeof payload.thread_id === "string") {
            sessionId = payload.thread_id;
          }

          const status = humanizeCodexEvent(payload);
          if (status) {
            emitStatus(status);
          }

          if (
            payload?.type === "item.completed" &&
            payload?.item?.type === "agent_message" &&
            typeof payload.item.text === "string"
          ) {
            result = payload.item.text;
            if (!emittedAssistantText) {
              options.onChunk?.(payload.item.text);
              emittedAssistantText = true;
            }
          }
        } catch {}
      }
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on("close", (code: number | null) => {
      clearTimeout(timer);
      resetStallTimer.clear();
      const duration_ms = Date.now() - startTime;

      if (cancelled) {
        emitStatus({
          phase: "cancelled",
          text: "Request cancelled.",
          terminal: true,
        });
        resolve({
          result: "Request cancelled.",
          duration_ms,
          is_error: true,
          cancelled: true,
          sessionId,
        });
        return;
      }

      if (killed) {
        emitStatus({
          phase: "timeout",
          text: "Timed out after 10 minutes.",
          terminal: true,
        });
        resolve({
          result: "Codex didn't respond in time after 10 minutes. Try again, simplify the request, or use a faster provider/model.",
          duration_ms,
          is_error: true,
          sessionId,
        });
        return;
      }

      const remainingLines = stdoutBuffer ? [stdoutBuffer] : [];
      for (const line of remainingLines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
          const payload = JSON.parse(trimmed);
          if (payload?.type === "thread.started" && typeof payload.thread_id === "string") {
            sessionId = payload.thread_id;
          }

          const status = humanizeCodexEvent(payload);
          if (status) {
            emitStatus(status);
          }

          if (
            payload?.type === "item.completed" &&
            payload?.item?.type === "agent_message" &&
            typeof payload.item.text === "string"
          ) {
            result = payload.item.text;
            if (!emittedAssistantText) {
              options.onChunk?.(payload.item.text);
              emittedAssistantText = true;
            }
          }
        } catch {}
      }

      if (code !== 0) {
        const summary = summarizeProcessError(stderr, code);
        emitStatus({
          phase: "error",
          text: "Codex exited with an error.",
          raw: summary,
          terminal: true,
        });
        resolve({
          result: result
            ? "Error: Codex exited before completing the request.\n\nPartial output:\n" +
              result +
              "\n\n" +
              summary
            : "Error: " + summary,
          duration_ms,
          is_error: true,
          sessionId,
        });
        return;
      }

      emitStatus({
        phase: "completed",
        text: "Response complete.",
        terminal: true,
      });
      resolve({
        result: result || "(empty response)",
        duration_ms,
        is_error: false,
        sessionId,
      });
    });

    proc.on("error", (err: Error) => {
      clearTimeout(timer);
      resolve({
        result: "Failed to start Codex CLI: " + err.message,
        duration_ms: Date.now() - startTime,
        is_error: true,
      });
    });

    if (options.sessionId) {
      proc.stdin.end();
      return;
    }

    proc.stdin.write(fullPrompt);
    proc.stdin.end();
  });
}

export const codexProvider: ProviderDefinition = {
  id: "codex",
  displayName: "Codex",
  models: [
    { value: "gpt-5.4", label: "GPT-5.4" },
    { value: "o3", label: "o3" },
    { value: "o1", label: "o1" },
  ],
  supportsImages: true,
  async isAvailable() {
    return hasResolvedCodexBinary()
      ? { available: true }
      : {
          available: false,
          reason: "Codex CLI not found. Install from github.com/openai/codex",
        };
  },
  sendMessage: sendCodexMessage,
};
