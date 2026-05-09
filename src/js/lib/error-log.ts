// Dev-only AI Action failure log contract:
// - Logs every user-visible failure with a script attached: validation errors,
//   warning-blocked auto-runs, runtime errors, and expression errors from both
//   auto-run and manual-run paths. Successes are never logged.
// - Does not log chat-only turns without an <ai-action> block, provider/network
//   errors that did not produce a script, or turns aborted by the user.
// - Writes to <repoRoot>/.session/error-log.jsonl. repoRoot is derived from
//   getRuntimeEnvironment().realExtensionPath by stripping /dist/cep. If that
//   path is not the expected ae-ai-chat repo dist path, logging is a no-op.
// - scripts/error-log-summary.mjs reads the same repo .session path from cwd.

import type { ExpressionError } from "./auto-fix";
import { fs, path } from "./cep/node";
import type {
  ScriptValidationError,
  ScriptValidationWarning,
} from "./knowledge/validator";
import { getRuntimeEnvironment } from "./runtime-environment";

const LOG_DIR = ".session";
const LOG_FILE = "error-log.jsonl";
const PREVIOUS_LOG_FILE = ".error-log.prev.jsonl";
const MAX_ENTRIES = 500;

export type ErrorKind = "validation" | "warning" | "runtime" | "expression";
export type TriggerPath = "auto-run" | "manual-run";

export interface ErrorLogEntryInput {
  originalUserMessage: string;
  provider: string;
  model: string;
  errorKind: ErrorKind;
  errorString: string;
  validationErrors?: ScriptValidationError[];
  validationWarnings?: ScriptValidationWarning[];
  expressionErrors?: ExpressionError[];
  script: string;
  injectedRecipeIds: string[];
  triggerPath: TriggerPath;
}

export interface ErrorLogEntry extends ErrorLogEntryInput {
  ts: string;
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, "/").replace(/\/+$/, "");
}

function resolveRepoRootFromRuntime(): string | null {
  if (!path || typeof path.join !== "function") return null;

  const environment = getRuntimeEnvironment();
  if (!environment.isDevInstall) return null;

  const extensionPath = normalizePath(environment.realExtensionPath || "");
  const match = extensionPath.match(/^(.*\/ae-ai-chat)\/dist\/cep$/);
  return match ? match[1] : null;
}

function resolveLogPath(): string | null {
  const repoRoot = resolveRepoRootFromRuntime();
  if (!repoRoot) return null;
  return path.join(repoRoot, LOG_DIR, LOG_FILE);
}

function countLogEntries(logPath: string): number {
  if (!fs.existsSync(logPath)) return 0;

  const raw = fs.readFileSync(logPath, "utf8");
  if (!raw.trim()) return 0;

  return raw.split(/\r?\n/).filter((line) => line.trim().length > 0).length;
}

function rotateIfNeeded(logPath: string) {
  if (countLogEntries(logPath) < MAX_ENTRIES) return;

  const previousLogPath = path.join(path.dirname(logPath), PREVIOUS_LOG_FILE);
  if (fs.existsSync(previousLogPath)) {
    fs.unlinkSync(previousLogPath);
  }
  fs.renameSync(logPath, previousLogPath);
}

export function logFailure(input: ErrorLogEntryInput): void {
  if (!fs || typeof fs.appendFileSync !== "function") return;
  if (!input.script) return;

  const logPath = resolveLogPath();
  if (!logPath) return;

  try {
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    rotateIfNeeded(logPath);

    const entry: ErrorLogEntry = {
      ts: new Date().toISOString(),
      ...input,
      injectedRecipeIds: input.injectedRecipeIds.slice(),
    };

    fs.appendFileSync(logPath, JSON.stringify(entry) + "\n", "utf8");
  } catch (err) {
    console.warn("[AE AI Chat] Failed to write error log: " + String(err));
  }
}
