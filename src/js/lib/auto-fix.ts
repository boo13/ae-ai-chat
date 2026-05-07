import { annotateScriptWithError } from "./ai-action";
import { getErrorHint } from "./error-patterns";
import type { ScriptValidationError, ScriptValidationWarning } from "./knowledge/validator";

export interface ExpressionError {
  line: number;
  error: string;
  name?: string;
  expr?: string;
}

export interface AutoFixInput {
  attemptNumber: number;
  maxAttempts: number;
  originalUserMessage: string;
  errorString: string;
  errorLine: number | null;
  script: string | null;
  expressionErrors?: ExpressionError[];
  validationErrors?: ScriptValidationError[];
  validationWarnings?: ScriptValidationWarning[];
}

export function buildAutoFixPrompt(input: AutoFixInput): string {
  const lines: string[] = [];

  lines.push(`Auto-fix attempt ${input.attemptNumber}/${input.maxAttempts}.`);
  lines.push(`Original goal: ${input.originalUserMessage}`);
  lines.push("");

  if (input.validationErrors && input.validationErrors.length > 0) {
    lines.push("Validation errors (blocked execution before the script ran):");
    for (const err of input.validationErrors) {
      lines.push(`  [${err.code}] ${err.message}`);
      if (err.occurrences.length > 0) {
        lines.push(
          "    at: " +
            err.occurrences
              .slice(0, 3)
              .map((o) => `L${o.line}:C${o.column}`)
              .join(", ")
        );
      }
    }
    lines.push("");
  }

  if (input.validationWarnings && input.validationWarnings.length > 0) {
    lines.push("Validation warnings (auto-execution blocked — fix before re-running):");
    for (const w of input.validationWarnings) {
      const code = w.code ? `[${w.code}] ` : "";
      lines.push(`  ${code}${w.message}`);
      if (w.occurrences.length > 0) {
        lines.push(
          "    at: " +
            w.occurrences
              .slice(0, 3)
              .map((o) => `L${o.line}:C${o.column}`)
              .join(", ")
        );
      }
    }
    lines.push("");
  }

  if (input.expressionErrors && input.expressionErrors.length > 0) {
    lines.push("Expression errors (script ran but expressions are broken):");
    for (const err of input.expressionErrors) {
      const loc = err.line > 0 ? ` line ${err.line}` : "";
      const name = err.name ? ` prop "${err.name}"` : "";
      lines.push(`  ${name}${loc}: ${err.error}`);
      if (err.expr) {
        lines.push(`    expr: "${err.expr.substring(0, 120)}${err.expr.length > 120 ? "…" : ""}"`);
      }
    }
    lines.push("");
  }

  if (input.errorString && input.expressionErrors?.length === 0) {
    lines.push(`Script error: ${input.errorString}`);
    const hint = getErrorHint(input.errorString);
    if (hint) lines.push(`Hint: ${hint}`);
    lines.push("");
  }

  if (input.script) {
    const annotated = annotateScriptWithError(
      input.script,
      input.errorString,
      input.errorLine ?? undefined
    );
    lines.push("Relevant script lines:");
    lines.push("```jsx");
    lines.push(annotated);
    lines.push("```");
    lines.push("");
  }

  lines.push(
    "Return a complete corrected <ai-action run=\"true\"> block. Do not explain — just fix it."
  );

  return lines.join("\n");
}
