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

function normalizeClaudeModel(model: string): "haiku" | "sonnet" | "opus" {
  if (model === "opus") return "opus";
  if (model === "haiku") return "haiku";
  return "sonnet";
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
    const fullPrompt = options.systemContext
      ? options.systemContext + "\n\n" + prompt
      : prompt;
    const timeout = model === "opus" ? 300000 : 120000; // haiku/sonnet: 2min, opus: 5min
    const startTime = Date.now();
    const args = options.sessionId
      ? ["--print", "--resume", sessionId, "--model", model]
      : ["--print", "--session-id", sessionId, "--model", model];

    const proc = child_process.spawn(
      findClaudePath(),
      args,
      {
        cwd: resolveWorkingDirectory(options.projectRoot) || os.homedir(),
        env: getCleanEnv(),
        stdio: ["pipe", "pipe", "pipe"],
      }
    );

    let stdout = "";
    let stderr = "";
    let killed = false;
    let cancelled = false;
    let hasReceivedChunk = false;

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
      proc.kill();
    }, timeout);

    // Wire AbortSignal for user-initiated cancel
    if (options.signal) {
      options.signal.addEventListener("abort", () => {
        cancelled = true;
        clearTimeout(timer);
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
      if (!hasReceivedChunk) {
        hasReceivedChunk = true;
        emitStatus({
          phase: "responding",
          text: "Generating response...",
        });
      }
      options.onChunk?.(text);
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on("close", (code: number | null) => {
      clearTimeout(timer);
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
          text: "Claude timed out waiting for a response.",
          terminal: true,
        });
        resolve({
          result: "Claude didn't respond in time. Try again or use a faster model.",
          duration_ms,
          is_error: true,
          sessionId,
        });
        return;
      }

      if (stdout.trim().length > 10) {
        const partialError = code !== 0
          ? "\n\n" + summarizeProcessError(stderr, code)
          : "";

        emitStatus({
          phase: code !== 0 ? "error" : "completed",
          text: code !== 0 ? "Claude exited with an error." : "Response complete.",
          raw: code !== 0 ? stderr : undefined,
          terminal: true,
        });

        resolve({
          result:
            code !== 0
              ? "Error: Claude exited before completing the request.\n\nPartial output:\n" +
                stdout.trim() +
                partialError
              : stdout.trim(),
          duration_ms,
          is_error: code !== 0,
          sessionId,
        });
        return;
      }

      if (code !== 0) {
        emitStatus({
          phase: "error",
          text: "Claude exited with an error.",
          raw: stderr,
          terminal: true,
        });
        resolve({
          result: "Error: " + summarizeProcessError(stderr, code),
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
        result: stdout.trim() || "(empty response)",
        duration_ms,
        is_error: false,
        sessionId,
      });
    });

    proc.on("error", (err: Error) => {
      clearTimeout(timer);
      resolve({
        result: "Failed to start Claude CLI: " + err.message,
        duration_ms: Date.now() - startTime,
        is_error: true,
        sessionId,
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
