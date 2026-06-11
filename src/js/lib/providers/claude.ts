import { child_process, fs, os, path } from "../cep/node";
import {
  buildProviderEnv,
  resolveWorkingDirectory,
  summarizeProcessError,
} from "./shared";
import type {
  ProviderDefinition,
  ProviderResult,
  ProviderStatusUpdate,
  SendMessageOptions,
} from "./provider";

let cachedClaudePath: string | null = null;
let cachedNodeDir: string | null = null;

const CLAUDE_TIMEOUT_MS = 600000; // 10 min — matches Codex
const CLAUDE_STALL_MS = 30000;
const MAX_STDOUT_PARSE_FAILURES = 5;

interface ClaudeLaunchDiagnostics {
  claudePath: string;
  cwd: string;
  model: string;
  sessionMode: "new" | "resume";
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

function shortenDetail(value: string, maxLength = 56): string {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) return compact;
  return compact.slice(0, maxLength - 3) + "...";
}

function pushStdoutParseFailure(target: string[], line: string) {
  if (!line.trim()) return;
  if (target.length >= MAX_STDOUT_PARSE_FAILURES) return;
  target.push(shortenDetail(line, 240));
}

function findClaudePath(): string {
  if (cachedClaudePath) return cachedClaudePath;
  if (!fs) return "claude";

  const nvmBase = path.join(os.homedir(), ".nvm/versions/node");
  try {
    const versions = fs.readdirSync(nvmBase);
    for (let index = versions.length - 1; index >= 0; index -= 1) {
      const candidate = path.join(nvmBase, versions[index], "bin/claude");
      try {
        fs.accessSync(candidate);
        cachedClaudePath = candidate;
        return candidate;
      } catch {}
    }
  } catch {}

  const candidates = [
    "/opt/homebrew/bin/claude",
    "/usr/local/bin/claude",
    path.join(os.homedir(), ".local/bin/claude"),
  ];

  for (const candidate of candidates) {
    try {
      fs.accessSync(candidate);
      cachedClaudePath = candidate;
      return candidate;
    } catch {}
  }

  return "claude";
}

function parseNodeMajor(versionDir: string): number | null {
  const match = versionDir.match(/^v(\d+)/);
  if (!match) return null;

  const major = parseInt(match[1], 10);
  return Number.isFinite(major) ? major : null;
}

function findPreferredNodeDir(): string | null {
  if (cachedNodeDir) return cachedNodeDir;
  if (!fs) return null;

  const nvmBase = path.join(os.homedir(), ".nvm/versions/node");
  try {
    const versions = fs.readdirSync(nvmBase)
      .map((versionDir) => ({
        versionDir,
        major: parseNodeMajor(versionDir),
      }))
      .filter((entry) => entry.major !== null)
      .sort((left, right) => {
        const a = left.major as number;
        const b = right.major as number;
        return b - a;
      });

    for (const entry of versions) {
      // Skip Node >= 25: CEP's embedded Chromium (v74 era) has known incompatibilities
      // with native modules compiled against Node 25+ ABI. Conservative guard.
      if ((entry.major as number) >= 25) continue;

      const nodeDir = path.join(nvmBase, entry.versionDir, "bin");
      try {
        fs.accessSync(path.join(nodeDir, "node"));
        cachedNodeDir = nodeDir;
        return nodeDir;
      } catch {}
    }
  } catch {}

  return null;
}

function getCleanEnv(): Record<string, string> {
  const claudePath = findClaudePath();
  const claudeDir = path.dirname(claudePath);
  const preferredNodeDir = findPreferredNodeDir();
  const env = buildProviderEnv(
    claudeDir,
    os.homedir(),
    os.userInfo().username,
    os.tmpdir()
  );

  if (preferredNodeDir) {
    env.PATH = [
      preferredNodeDir,
      claudeDir,
      env.PATH || "",
    ].filter(Boolean).join(":");
  }

  return env;
}

function normalizeClaudeModel(model: string): string {
  if (model === "opus") return "opus";
  if (model === "haiku") return "haiku";
  return "sonnet";
}

function buildLaunchDiagnostics(
  options: SendMessageOptions,
  cwd: string
): ClaudeLaunchDiagnostics {
  const claudePath = findClaudePath();
  const env = getCleanEnv();

  return {
    claudePath,
    cwd,
    model: options.model,
    sessionMode: options.sessionId ? "resume" : "new",
    pathLookupOnly: claudePath === "claude",
    env: {
      HOME: env.HOME || "",
      PATH: env.PATH || "",
      TMPDIR: env.TMPDIR || "",
      USER: env.USER || "",
    },
  };
}

function formatLaunchDiagnostics(diagnostics: ClaudeLaunchDiagnostics): string {
  return [
    "Launch diagnostics:",
    `- claudePath: ${diagnostics.claudePath}`,
    `- cwd: ${diagnostics.cwd}`,
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

function logLaunchDiagnostics(diagnostics: ClaudeLaunchDiagnostics) {
  console.info("[AE AI Chat][Claude] Launch diagnostics\n" + formatLaunchDiagnostics(diagnostics));

  if (diagnostics.pathLookupOnly) {
    console.warn(
      "[AE AI Chat][Claude] Using PATH lookup for the Claude binary. AE may not inherit the same PATH as your shell."
    );
  }
}

function checkLaunchEnvironment(diagnostics: ClaudeLaunchDiagnostics): LaunchEnvironmentIssue | null {
  if (!fs) return null;

  const homeDir = diagnostics.env.HOME;
  if (!homeDir) {
    return {
      message:
        "Claude launch environment is missing HOME. After Effects may not be inheriting your normal shell environment.",
      detail: "HOME is empty.\n\n" + formatLaunchDiagnostics(diagnostics),
    };
  }

  try {
    fs.accessSync(homeDir);
  } catch (error: any) {
    return {
      message:
        "Claude cannot access HOME from the AE panel process. Claude auth/config may be unavailable in this environment.",
      detail:
        `HOME access failed for ${homeDir}: ${error?.message || String(error)}\n\n` +
        formatLaunchDiagnostics(diagnostics),
    };
  }

  const claudeHome = path.join(homeDir, ".claude");
  if (fs.existsSync(claudeHome)) {
    try {
      fs.accessSync(claudeHome);
    } catch (error: any) {
      return {
        message:
          "Claude cannot access ~/.claude from the AE panel process. Auth or session files may not be reachable from AE.",
        detail:
          `Access failed for ${claudeHome}: ${error?.message || String(error)}\n\n` +
          formatLaunchDiagnostics(diagnostics),
      };
    }
  }

  return null;
}

function formatErrorResult(message: string, details: string): string {
  return `${message}\n\n${details}`;
}

function hasResolvedClaudeBinary(): boolean {
  const claudePath = findClaudePath();
  if (claudePath !== "claude") return true;

  if (!child_process?.spawnSync) return false;

  try {
    const result = child_process.spawnSync("claude", ["--version"], {
      env: getCleanEnv(),
      stdio: "ignore",
    });
    return !result.error && result.status === 0;
  } catch {
    return false;
  }
}

async function sendClaudeMessage(
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

    const model = normalizeClaudeModel(options.model);
    const sessionId = options.sessionId || crypto.randomUUID();
    // The static knowledge corpus only needs to be sent once per session —
    // resumed sessions already carry it in their history.
    const contextPrefix = [
      options.sessionId ? "" : options.staticContext || "",
      options.systemContext || "",
    ]
      .filter(Boolean)
      .join("\n\n");
    const fullPrompt = contextPrefix ? contextPrefix + "\n\n" + prompt : prompt;
    const startTime = Date.now();

    const cwd = resolveWorkingDirectory(options.projectRoot) || os.tmpdir();
    const diagnostics = buildLaunchDiagnostics(options, cwd);
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

    const baseArgs = [
      "--print",
      "--model", model,
      "--dangerously-skip-permissions",
      "--output-format", "stream-json",
      "--verbose",
      "--include-partial-messages",
    ];
    const args = options.sessionId
      ? [...baseArgs, "--resume", sessionId]
      : [...baseArgs, "--session-id", sessionId];

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
          }, CLAUDE_STALL_MS);
        },
        clear() {
          if (stallTimer) {
            clearTimeout(stallTimer);
            stallTimer = null;
          }
        },
      };
    })();

    const proc = child_process.spawn(
      findClaudePath(),
      args,
      {
        cwd,
        env: getCleanEnv(),
        stdio: ["pipe", "pipe", "pipe"],
      }
    );

    let stdoutBuffer = "";
    let stderr = "";
    const invalidStdoutLines: string[] = [];
    let killed = false;
    let cancelled = false;
    let result = "";
    let resolvedSessionId = sessionId;
    let emittedFirstChunk = false;
    let resolvedViaResult = false;

    emitStatus({
      phase: "connecting",
      text: "Starting Claude...",
    });
    emitStatus({
      phase: "thinking",
      text: "Thinking...",
    });

    const timer = setTimeout(() => {
      killed = true;
      resetStallTimer.clear();
      proc.kill();
    }, CLAUDE_TIMEOUT_MS);
    resetStallTimer.touch();

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

    const processLine = (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      resetStallTimer.touch();

      try {
        const payload = JSON.parse(trimmed);

        if (payload?.type === "system" && payload?.subtype === "init") {
          if (typeof payload.session_id === "string") {
            resolvedSessionId = payload.session_id;
          }
          emitStatus({
            phase: "connecting",
            text: "Claude session started.",
          });
          return;
        }

        if (
          payload?.type === "system" &&
          payload?.subtype === "status" &&
          payload?.status === "requesting"
        ) {
          emitStatus({
            phase: "thinking",
            text: "Thinking...",
          });
          return;
        }

        if (payload?.type === "assistant") {
          const content: any[] = payload?.message?.content || [];
          for (const block of content) {
            if (block?.type === "text" && typeof block.text === "string" && block.text.trim()) {
              result = block.text;
              if (!emittedFirstChunk) {
                emittedFirstChunk = true;
                options.onChunk?.(block.text);
                emitStatus({
                  phase: "responding",
                  text: "Generating response...",
                });
              }
            }
          }
          return;
        }

        if (payload?.type === "rate_limit_event") {
          const info = payload?.rate_limit_info;
          if (
            info?.status === "allowed_warning" &&
            typeof info?.utilization === "number" &&
            info.utilization >= 0.9
          ) {
            const pct = Math.round(info.utilization * 100);
            emitStatus({
              phase: "thinking",
              text: `Claude API rate limit at ${pct}% — response may be slow.`,
            });
          }
          return;
        }

        if (payload?.type === "result") {
          resolvedViaResult = true;
          clearTimeout(timer);
          resetStallTimer.clear();

          if (payload?.session_id) {
            resolvedSessionId = payload.session_id;
          }

          if (payload?.is_error) {
            const errText = typeof payload?.result === "string" && payload.result.trim()
              ? payload.result.trim()
              : "Claude reported an error.";
            const detail = formatLaunchDiagnostics(diagnostics);
            emitStatus({
              phase: "error",
              text: shortenDetail(errText, 96),
              raw: detail,
              terminal: true,
            });
            resolve({
              result: formatErrorResult("Error: " + errText, detail),
              duration_ms: Date.now() - startTime,
              is_error: true,
              sessionId: resolvedSessionId,
            });
            return;
          }

          const finalText = typeof payload?.result === "string" && payload.result.trim()
            ? payload.result.trim()
            : result;

          emitStatus({
            phase: "completed",
            text: "Response complete.",
            terminal: true,
          });
          resolve({
            result: finalText || "(empty response)",
            duration_ms: Date.now() - startTime,
            is_error: false,
            sessionId: resolvedSessionId,
          });
          return;
        }
      } catch {
        pushStdoutParseFailure(invalidStdoutLines, trimmed);
      }
    };

    proc.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      stdoutBuffer += text;

      const lines = stdoutBuffer.split(/\r?\n/);
      stdoutBuffer = lines.pop() || "";

      for (const line of lines) {
        processLine(line);
      }
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on("close", (code: number | null) => {
      clearTimeout(timer);
      resetStallTimer.clear();
      const duration_ms = Date.now() - startTime;

      if (resolvedViaResult) return;

      // Flush any remaining buffer
      if (stdoutBuffer.trim()) {
        processLine(stdoutBuffer);
        if (resolvedViaResult) return;
      }

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
          sessionId: resolvedSessionId,
        });
        return;
      }

      if (killed) {
        const detail = formatLaunchDiagnostics(diagnostics);
        emitStatus({
          phase: "timeout",
          text: "Claude timed out after 10 minutes.",
          terminal: true,
        });
        resolve({
          result: formatErrorResult(
            "Claude didn't respond in time after 10 minutes. Try again or simplify the request.",
            detail
          ),
          duration_ms,
          is_error: true,
          sessionId: resolvedSessionId,
        });
        return;
      }

      if (code !== 0) {
        const summary = summarizeProcessError(stderr, code);
        const detail = [
          `Exit code: ${code}`,
          stderr.trim() ? "stderr:\n" + stderr.trim() : null,
          invalidStdoutLines.length > 0
            ? "stdout parse failures:\n" + invalidStdoutLines.join("\n")
            : null,
          formatLaunchDiagnostics(diagnostics),
        ].filter(Boolean).join("\n\n");
        console.error("[AE AI Chat][Claude] Process exited with error\n" + detail);
        emitStatus({
          phase: "error",
          text: shortenDetail(summary, 96),
          raw: detail,
          terminal: true,
        });
        resolve({
          result: formatErrorResult("Error: " + summary, detail),
          duration_ms,
          is_error: true,
          sessionId: resolvedSessionId,
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
        sessionId: resolvedSessionId,
      });
    });

    proc.on("error", (err: Error) => {
      clearTimeout(timer);
      resetStallTimer.clear();
      const detail = [
        `Spawn error: ${err.message}`,
        stderr.trim() ? "stderr:\n" + stderr.trim() : null,
        formatLaunchDiagnostics(diagnostics),
      ].filter(Boolean).join("\n\n");
      console.error("[AE AI Chat][Claude] Failed to start process\n" + detail);
      emitStatus({
        phase: "error",
        text:
          diagnostics.pathLookupOnly && /not found|ENOENT/i.test(err.message)
            ? "Claude CLI was not found from the AE panel process PATH."
            : "Failed to start Claude CLI.",
        raw: detail,
        terminal: true,
      });
      resolve({
        result: formatErrorResult(
          diagnostics.pathLookupOnly && /not found|ENOENT/i.test(err.message)
            ? "Failed to start Claude CLI: AE could not resolve `claude` from its PATH."
            : "Failed to start Claude CLI: " + err.message,
          detail
        ),
        duration_ms: Date.now() - startTime,
        is_error: true,
        sessionId: resolvedSessionId,
      });
    });

    proc.stdin.write(fullPrompt);
    proc.stdin.end();
  });
}

export const claudeProvider: ProviderDefinition = {
  id: "claude",
  displayName: "Claude",
  models: [
    { value: "haiku", label: "Haiku" },
    { value: "sonnet", label: "Sonnet" },
    { value: "opus", label: "Opus" },
  ],
  supportsImages: false,
  async isAvailable() {
    return hasResolvedClaudeBinary()
      ? { available: true }
      : {
          available: false,
          reason: "Claude CLI not found. Install from claude.ai/cli",
        };
  },
  sendMessage: sendClaudeMessage,
};
