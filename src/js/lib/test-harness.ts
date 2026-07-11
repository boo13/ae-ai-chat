import type { LastActionResult } from "./context";
import { getRuntimeEnvironment } from "./runtime-environment";
import { evalTS } from "./utils/bolt";

export interface TestPromptResult {
  actionRan: boolean;
  stateDiff: string[];
  expressionErrors: unknown[];
  lastError: string;
}

export interface AETestHarness {
  runJsx(absPath: string): Promise<unknown>;
  runPrompt(text: string): Promise<TestPromptResult>;
  getContext(): Promise<unknown>;
  getLastActionResult(): LastActionResult | null;
}

interface TestHarnessOptions {
  runPrompt(text: string): Promise<void>;
  getContext(): Promise<unknown>;
  getLastActionResult(): LastActionResult | null;
  getLastRunResult(): unknown;
  getLastError(): string;
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

export function installTestHarness(options: TestHarnessOptions): () => void {
  if (!getRuntimeEnvironment().isDevInstall) return () => {};

  const harness: AETestHarness = {
    runJsx(absPath) {
      return evalTS("runScriptFile", absPath);
    },
    async runPrompt(text) {
      await options.runPrompt(text);
      const rawResult = toRecord(options.getLastRunResult());
      const lastActionResult = options.getLastActionResult();
      const rawDiff = rawResult.stateDiff;
      const stateDiff = Array.isArray(rawDiff)
        ? rawDiff.map(String)
        : lastActionResult?.stateDiff.slice() || [];
      const rawExpressionErrors = rawResult.expressionErrors;
      return {
        actionRan: Object.keys(rawResult).length > 0,
        stateDiff,
        expressionErrors: Array.isArray(rawExpressionErrors) ? rawExpressionErrors : [],
        lastError: options.getLastError(),
      };
    },
    getContext() {
      return options.getContext();
    },
    getLastActionResult() {
      return options.getLastActionResult();
    },
  };

  window.__aeTest = harness;
  return () => {
    if (window.__aeTest === harness) delete window.__aeTest;
  };
}

declare global {
  interface Window {
    __aeTest?: AETestHarness;
  }
}
