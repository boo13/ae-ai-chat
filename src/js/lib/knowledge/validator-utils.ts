export type TokenKind = "code" | "line-comment" | "block-comment" | "string";

export interface Token {
  kind: TokenKind;
  text: string;
}

export function tokenizeJsx(content: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let codeStart = 0;
  const len = content.length;

  function flushCode(end: number) {
    if (end > codeStart) {
      tokens.push({ kind: "code", text: content.slice(codeStart, end) });
    }
    codeStart = end;
  }

  while (i < len) {
    if (content[i] === "/" && content[i + 1] === "/") {
      flushCode(i);
      const start = i;
      while (i < len && content[i] !== "\n") i++;
      tokens.push({ kind: "line-comment", text: content.slice(start, i) });
      codeStart = i;
      continue;
    }

    if (content[i] === "/" && content[i + 1] === "*") {
      flushCode(i);
      const start = i;
      i += 2;
      while (i < len) {
        if (content[i] === "*" && content[i + 1] === "/") { i += 2; break; }
        i++;
      }
      tokens.push({ kind: "block-comment", text: content.slice(start, i) });
      codeStart = i;
      continue;
    }

    if (content[i] === '"' || content[i] === "'") {
      flushCode(i);
      const quote = content[i];
      const start = i;
      i++;
      while (i < len) {
        if (content[i] === "\\") { i += 2; continue; }
        if (content[i] === quote) { i++; break; }
        i++;
      }
      tokens.push({ kind: "string", text: content.slice(start, i) });
      codeStart = i;
      continue;
    }

    // Backtick (ES6 — AI might write it; treat as string for scanning purposes)
    if (content[i] === "`") {
      flushCode(i);
      const start = i;
      i++;
      while (i < len) {
        if (content[i] === "\\") { i += 2; continue; }
        if (content[i] === "`") { i++; break; }
        i++;
      }
      tokens.push({ kind: "string", text: content.slice(start, i) });
      codeStart = i;
      continue;
    }

    i++;
  }
  flushCode(len);
  return tokens;
}

/**
 * Returns a version of content with strings and comments replaced by spaces.
 * Newlines are preserved so line/column positions stay accurate.
 */
export function codeOnlyView(content: string): string {
  return tokenizeJsx(content)
    .map((t) => (t.kind === "code" ? t.text : t.text.replace(/[^\n]/g, " ")))
    .join("");
}
