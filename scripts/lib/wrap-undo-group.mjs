function indentScript(source) {
  return source
    .split(/\r?\n/)
    .map((line) => (line.trim() === "" ? "" : "  " + line))
    .join("\n");
}

export function wrapUndoGroup(script) {
  const trimmed = script.trim();
  const beginMatch = trimmed.match(/^\s*app\.beginUndoGroup\(([^)]*)\);\s*\r?\n?/);
  const endMatch = trimmed.match(/\r?\n?\s*app\.endUndoGroup\(\);\s*$/);

  if (!beginMatch || !endMatch) return trimmed;

  const body = trimmed
    .replace(/^\s*app\.beginUndoGroup\(([^)]*)\);\s*\r?\n?/, "")
    .replace(/\r?\n?\s*app\.endUndoGroup\(\);\s*$/, "")
    .trim();

  return [
    "app.beginUndoGroup(" + beginMatch[1] + ");",
    "try {",
    indentScript(body),
    "} finally {",
    "  app.endUndoGroup();",
    "}",
  ].join("\n");
}
