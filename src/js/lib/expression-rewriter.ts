export interface ExpressionRewriteResult {
  content: string;
  rewriteCount: number;
}

// Matches .expression = <rhs> but NOT .expressionError, .expressionEnabled, .expressionEngine
// Also excludes == comparisons via (?!=) negative lookahead
const EXPR_ASSIGN_RE =
  /^([ \t]*)(.*?)\.expression(?!Error|Enabled|Engine)\s*=\s*(?!=)(.+?)\s*;?\s*$/;

function stripTrailingLineComment(line: string): string {
  let inString = false;
  let quote = "";
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (!inString && (ch === '"' || ch === "'")) {
      inString = true;
      quote = ch;
    } else if (inString && ch === "\\") {
      i++;
    } else if (inString && ch === quote) {
      inString = false;
    } else if (!inString && ch === "/" && line[i + 1] === "/") {
      return line.slice(0, i).trimEnd();
    }
  }
  return line;
}

export function rewriteExpressionAssignments(
  content: string
): ExpressionRewriteResult {
  const lines = content.split(/\r?\n/);
  let rewriteCount = 0;
  let inBlockComment = false;

  const result = lines.map((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trimStart();

    if (inBlockComment) {
      if (line.includes("*/")) inBlockComment = false;
      return line;
    }
    if (trimmed.startsWith("/*")) {
      if (!line.includes("*/")) inBlockComment = true;
      return line;
    }
    if (trimmed.startsWith("//")) return line;
    if (/\b__aiSetExpr\s*\(/.test(line)) return line;

    const stripped = stripTrailingLineComment(line);
    const match = stripped.match(EXPR_ASSIGN_RE);
    if (!match) return line;

    const indent = match[1];
    const lhs = match[2].trimEnd();
    const rhs = match[3].trimEnd();

    rewriteCount++;
    return `${indent}__aiSetExpr(${lhs}, ${rhs}, ${lineNum});`;
  });

  return { content: result.join("\n"), rewriteCount };
}

// Injected as a preamble into generated .jsx files when expression assignments exist.
// This is a string constant (the value is valid ExtendScript/ES3).
export const EXPRESSION_HELPER_PREAMBLE = `// AI expression capture (injected by panel)
if (!$.global.__aiExprErrors) {
  $.global.__aiExprErrors = [];
  $.global.__aiSetExpr = function (prop, expr, lineNum) {
    if (!prop) {
      $.global.__aiExprErrors.push({ line: lineNum, error: "property is null/undefined" });
      return;
    }
    if (!prop.canSetExpression) {
      $.global.__aiExprErrors.push({ line: lineNum, error: "property does not support expressions", name: String(prop.name || "") });
      return;
    }
    prop.expression = expr;
    try { prop.valueAtTime(0, false); } catch (e) {}
    if (prop.expressionError) {
      $.global.__aiExprErrors.push({
        line: lineNum,
        error: String(prop.expressionError),
        name: String(prop.name || ""),
        expr: String(expr).substring(0, 200)
      });
    }
  };
}`;
