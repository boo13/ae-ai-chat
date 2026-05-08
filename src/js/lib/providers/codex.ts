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
const MAX_STDOUT_PARSE_FAILURES = 5;

interface CodexLaunchDiagnostics {
  codexPath: string;
  cwd: string;
  gitRoot: string | null;
  skipGitRepoCheck: boolean;
  model: string;
  sessionMode: "exec" | "exec resume";
  pathLookupOnly: boolean;
  env: {
    HOME: string;
    PATH: string;
    TMPDIR: string;
    USER: string;
  };
}

interface LaunchEnvironmentIssue {
  message: string;
  detail: string;
}

interface StructuredCodexError {
  type: string;
  message: string;
}

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

function buildLaunchDiagnostics(options: SendMessageOptions): CodexLaunchDiagnostics {
  const codexPath = findCodexPath();
  const env = getCleanEnv();
  const gitRoot = findGitRoot(options.projectRoot);
  const cwd = gitRoot || resolveWorkingDirectory(options.projectRoot) || os.homedir();

  return {
    codexPath,
    cwd,
    gitRoot: gitRoot || null,
    skipGitRepoCheck: !gitRoot,
    model: options.model,
    sessionMode: options.sessionId ? "exec resume" : "exec",
    pathLookupOnly: codexPath === "codex",
    env: {
      HOME: env.HOME || "",
      PATH: env.PATH || "",
      TMPDIR: env.TMPDIR || "",
      USER: env.USER || "",
    },
  };
}

function formatLaunchDiagnostics(diagnostics: CodexLaunchDiagnostics): string {
  return [
    "Launch diagnostics:",
    `- codexPath: ${diagnostics.codexPath}`,
    `- cwd: ${diagnostics.cwd}`,
    `- gitRoot: ${diagnostics.gitRoot || "(none)"}`,
    `- skipGitRepoCheck: ${diagnostics.skipGitRepoCheck ? "yes" : "no"}`,
    `- model: ${diagnostics.model}`,
    `- sessionMode: ${diagnostics.sessionMode}`,
    `- pathLookupOnly: ${diagnostics.pathLookupOnly ? "yes" : "no"}`,
    "- env:",
    `  HOME=${diagnostics.env.HOME || "(empty)"}`,
    `  PATH=${diagnostics.env.PATH || "(empty)"}`,
    `  TMPDIR=${diagnostics.env.TMPDIR || "(empty)"}`,
    `  USER=${diagnostics.env.USER || "(empty)"}`,
  ].join("\n");
}

function logLaunchDiagnostics(diagnostics: CodexLaunchDiagnostics) {
  console.info("[AE AI Chat][Codex] Launch diagnostics\n" + formatLaunchDiagnostics(diagnostics));

  if (diagnostics.pathLookupOnly) {
    console.warn(
      "[AE AI Chat][Codex] Using PATH lookup for the Codex binary. AE may not inherit the same PATH as your shell."
    );
  }
}

function checkLaunchEnvironment(diagnostics: CodexLaunchDiagnostics): LaunchEnvironmentIssue | null {
  if (!fs) return null;

  const homeDir = diagnostics.env.HOME;
  if (!homeDir) {
    return {
      message:
        "Codex launch environment is missing HOME. After Effects may not be inheriting your normal shell environment.",
      detail: "HOME is empty.\n\n" + formatLaunchDiagnostics(diagnostics),
    };
  }

  try {
    fs.accessSync(homeDir);
  } catch (error: any) {
    return {
      message:
        "Codex cannot access HOME from the AE panel process. Codex auth/config may be unavailable in this environment.",
      detail:
        `HOME access failed for ${homeDir}: ${error?.message || String(error)}\n\n` +
        formatLaunchDiagnostics(diagnostics),
    };
  }

  const codexHome = path.join(homeDir, ".codex");
  if (fs.existsSync(codexHome)) {
    try {
      fs.accessSync(codexHome);
    } catch (error: any) {
      return {
        message:
          "Codex cannot access ~/.codex from the AE panel process. This usually means auth or session files are not reachable from AE.",
        detail:
          `Access failed for ${codexHome}: ${error?.message || String(error)}\n\n` +
          formatLaunchDiagnostics(diagnostics),
      };
    }
  }

  return null;
}

function formatProcessFailureDetails(params: {
  summary: string;
  exitCode: number | null;
  stderr: string;
  invalidStdoutLines: string[];
  trailingStdoutBuffer: string;
  diagnostics: CodexLaunchDiagnostics;
  partialOutput?: string;
  spawnError?: string;
  structuredError?: StructuredCodexError | null;
}): string {
  const sections = [
    `Summary: ${params.summary}`,
    `Exit code: ${params.exitCode === null ? "(none)" : params.exitCode}`,
  ];

  if (params.structuredError?.message) {
    sections.push(`Codex ${params.structuredError.type}:\n${params.structuredError.message}`);
  }

  if (params.spawnError) {
    sections.push(`Spawn error: ${params.spawnError}`);
  }

  if (params.stderr.trim()) {
    sections.push("stderr:\n" + params.stderr.trim());
  }

  if (params.invalidStdoutLines.length > 0) {
    sections.push(
      "stdout lines that were not valid JSON:\n" + params.invalidStdoutLines.join("\n")
    );
  }

  if (params.trailingStdoutBuffer.trim()) {
    sections.push("trailing stdout buffer:\n" + params.trailingStdoutBuffer.trim());
  }

  if (params.partialOutput?.trim()) {
    sections.push("partial agent output:\n" + params.partialOutput.trim());
  }

  sections.push(formatLaunchDiagnostics(params.diagnostics));
  return sections.join("\n\n");
}

function formatErrorResult(message: string, details: string): string {
  return `${message}\n\n${details}`;
}

function pushStdoutParseFailure(target: string[], line: string) {
  if (!line.trim()) return;
  if (target.length >= MAX_STDOUT_PARSE_FAILURES) return;
  target.push(shortenDetail(line, 240));
}

function extractStructuredError(payload: any): StructuredCodexError | null {
  if (!payload || typeof payload !== "object" || typeof payload.type !== "string") {
    return null;
  }

  if (payload.type === "error" && typeof payload.message === "string" && payload.message.trim()) {
    return {
      type: payload.type,
      message: payload.message.trim(),
    };
  }

  if (
    payload.type === "turn.failed" &&
    typeof payload.error?.message === "string" &&
    payload.error.message.trim()
  ) {
    return {
      type: payload.type,
      message: payload.error.message.trim(),
    };
  }

  return null;
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
    const diagnostics = buildLaunchDiagnostics(options);
    logLaunchDiagnostics(diagnostics);

    const environmentIssue = checkLaunchEnvironment(diagnostics);
    if (environmentIssue) {
      emitStatus({
        phase: "error",
        text: environmentIssue.message,
        raw: environmentIssue.detail,
        terminal: true,
      });
      resolve({
        result: formatErrorResult(environmentIssue.message, environmentIssue.detail),
        duration_ms: 0,
        is_error: true,
        sessionId: options.sessionId,
      });
      return;
    }

    const args = options.sessionId
      ? ["exec", "resume", "--json", options.sessionId, "--model", options.model]
      : ["exec", "-", "--json", "--model", options.model];

    if (diagnostics.skipGitRepoCheck) {
      args.push("--skip-git-repo-check");
    }

    if (options.imagePath) {
      args.push("--image", options.imagePath);
    }

    if (options.sessionId) {
      args.push(fullPrompt);
    }

    const proc = child_process.spawn(
      diagnostics.codexPath,
      args,
      {
        cwd: diagnostics.cwd,
        env: getCleanEnv(),
        stdio: ["pipe", "pipe", "pipe"],
      }
    );

    let stdoutBuffer = "";
    let stderr = "";
    const invalidStdoutLines: string[] = [];
    let structuredError: StructuredCodexError | null = null;
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

          const parsedError = extractStructuredError(payload);
          if (parsedError) {
            structuredError = parsedError;
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
        } catch {
          pushStdoutParseFailure(invalidStdoutLines, trimmed);
        }
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

          const parsedError = extractStructuredError(payload);
          if (parsedError) {
            structuredError = parsedError;
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
        } catch {
          pushStdoutParseFailure(invalidStdoutLines, trimmed);
        }
      }

      if (code !== 0) {
        const summary = structuredError?.message || summarizeProcessError(stderr, code);
        const detail = formatProcessFailureDetails({
          summary,
          exitCode: code,
          stderr,
          invalidStdoutLines,
          trailingStdoutBuffer: stdoutBuffer,
          diagnostics,
          partialOutput: result,
          structuredError,
        });
        console.error("[AE AI Chat][Codex] Process exited with error\n" + detail);
        emitStatus({
          phase: "error",
          text: structuredError?.message
            ? shortenDetail(structuredError.message, 96)
            : "Codex exited with code " + code + ".",
          raw: detail,
          terminal: true,
        });
        resolve({
          result: formatErrorResult(
            structuredError?.message
              ? "Error: " + structuredError.message
              : "Error: Codex exited with code " + code + ".",
            detail
          ),
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
      resetStallTimer.clear();
      const detail = formatProcessFailureDetails({
        summary: "Failed to start Codex CLI.",
        exitCode: null,
        stderr,
        invalidStdoutLines,
        trailingStdoutBuffer: stdoutBuffer,
        diagnostics,
        spawnError: err.message,
        structuredError,
      });
      console.error("[AE AI Chat][Codex] Failed to start process\n" + detail);
      emitStatus({
        phase: "error",
        text:
          diagnostics.pathLookupOnly && /not found|ENOENT/i.test(err.message)
            ? "Codex CLI was not found from the AE panel process PATH."
            : "Failed to start Codex CLI.",
        raw: detail,
        terminal: true,
      });
      resolve({
        result: formatErrorResult(
          diagnostics.pathLookupOnly && /not found|ENOENT/i.test(err.message)
            ? "Failed to start Codex CLI: AE could not resolve `codex` from its PATH."
            : "Failed to start Codex CLI: " + err.message,
          detail
        ),
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
    { value: "gpt-5.5", label: "GPT-5.5" },
    { value: "gpt-5.4", label: "GPT-5.4" },
    { value: "gpt-5.4-mini", label: "GPT-5.4 Mini" },
    { value: "gpt-5.4-nano", label: "GPT-5.4 Nano" },
    { value: "gpt-5.3-codex", label: "GPT-5.3 Codex" },
    { value: "gpt-5.1-codex-max", label: "GPT-5.1 Codex Max" },
    { value: "gpt-5.1-codex-mini", label: "GPT-5.1 Codex Mini" },
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
