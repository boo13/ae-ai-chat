export interface ExpressionRewriteResult {
  content: string;
  rewriteCount: number;
}

export const EXPRESSION_HELPER_MARKER =
  "// AI expression capture (injected by panel)";

// The helper assignment signature must also be present to treat a script as
// already prepared — guards against a legitimate unprepared script that merely
// contains the marker comment but not our injected helper.
const EXPRESSION_HELPER_SIGNATURE = "$.global.__aiSetExpr = function";

const EXPR_ASSIGN_RE =
  /^([ \t]*)(.*?)\.expression(?!Error|Enabled|Engine)\s*=\s*(?!=)(.+?)\s*;?\s*$/;

// Detects whether a captured RHS is a syntactically complete expression, i.e.
// the assignment does not continue onto the next physical line. The model
// frequently emits long expressions as multi-line string concatenations
// (template literals are ES3-banned), and rewriting only the first line of
// those would produce a hard ES3 syntax error — see EXPR_ASSIGN_RE above.
function isCompleteExpression(rhs: string): boolean {
  let depth = 0;
  let inString = false;
  let quote = "";

  for (let i = 0; i < rhs.length; i++) {
    const ch = rhs[i];
    if (inString) {
      if (ch === "\\") {
        i++;
      } else if (ch === quote) {
        inString = false;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = true;
      quote = ch;
    } else if (ch === "(" || ch === "[" || ch === "{") {
      depth++;
    } else if (ch === ")" || ch === "]" || ch === "}") {
      depth--;
    }
  }

  if (inString) return false;
  if (depth !== 0) return false;
  if (/[+\-*/%,&|^?:]$/.test(rhs)) return false;

  return true;
}

function splitTrailingLineComment(line: string): {
  code: string;
  comment: string;
} {
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
      return {
        code: line.slice(0, i).trimEnd(),
        comment: line.slice(i),
      };
    }
  }
  return { code: line, comment: "" };
}

export function rewriteExpressionAssignments(
  content: string
): ExpressionRewriteResult {
  if (
    content.indexOf(EXPRESSION_HELPER_MARKER) !== -1 &&
    content.indexOf(EXPRESSION_HELPER_SIGNATURE) !== -1
  ) {
    return { content, rewriteCount: 0 };
  }

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
    if (/__aiSetExpr\s*\(/.test(line)) return line;

    const { code, comment } = splitTrailingLineComment(line);
    const match = code.match(EXPR_ASSIGN_RE);
    if (!match) return line;

    const indent = match[1];
    const lhs = match[2].trimEnd();
    const rhs = match[3].trimEnd();
    const suffix = comment ? " " + comment : "";

    if (!isCompleteExpression(rhs)) return line;

    rewriteCount++;
    return `${indent}$.global.__aiSetExpr(${lhs}, ${rhs}, ${lineNum});${suffix}`;
  });

  return { content: result.join("\n"), rewriteCount };
}

export const EXPRESSION_HELPER_PREAMBLE = `${EXPRESSION_HELPER_MARKER}
if (!$.global.__aiExprErrors) {
  $.global.__aiExprErrors = [];
}
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
};`;

export function prepareExpressionCapture(
  content: string
): ExpressionRewriteResult {
  const rewritten = rewriteExpressionAssignments(content);
  if (rewritten.rewriteCount === 0) return rewritten;

  return {
    content: EXPRESSION_HELPER_PREAMBLE + "\n" + rewritten.content,
    rewriteCount: rewritten.rewriteCount,
  };
}
