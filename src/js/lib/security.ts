// Security boundary between trusted instructions and untrusted After Effects
// project data. Everything here is pure (no CEP/Node imports) so it can be unit
// tested directly and reused by both the context builder and the action runner.

export const UNTRUSTED_OPEN_TAG = "<untrusted-ae-context>";
export const UNTRUSTED_CLOSE_TAG = "</untrusted-ae-context>";

// Control characters that could break the prompt structure. Tab (0x09),
// newline (0x0A), and carriage return (0x0D) are intentionally preserved so
// multi-line expressions survive.
const CONTROL_CHARS_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

// Structural sentinels a malicious project string could forge to escape the
// untrusted block or fake a runnable action. Matches an opening `<` (with
// optional whitespace and an optional leading slash) immediately before one of
// our tag names — we neutralize only the `<` so the rest stays human-readable.
const SENTINEL_TAG_RE = /<(\s*\/?\s*)(untrusted-ae-context|pinned-context|ai-action)\b/gi;

/**
 * Neutralize untrusted AE-derived text so it cannot forge or close our
 * structural tags or inject control characters. Sentinel tags are defanged by
 * escaping their leading `<` to `&lt;`; the text otherwise stays intact so the
 * model can still read project/layer/expression content as data.
 */
export function defangUntrustedText(value: string): string {
  if (!value) return value;
  return value
    .replace(CONTROL_CHARS_RE, "")
    .replace(SENTINEL_TAG_RE, (_match, slash: string, name: string) => `&lt;${slash}${name}`);
}

/**
 * Wrap project-derived context lines in an explicit untrusted-data boundary.
 * The inner text is defanged first, then the real boundary tags are appended —
 * so an attacker who injected a closing tag via a layer name cannot terminate
 * the block early. Returns an empty array when there is nothing to wrap.
 */
export function wrapUntrustedContext(innerLines: string[]): string[] {
  if (innerLines.length === 0) return [];
  const defanged = defangUntrustedText(innerLines.join("\n"));
  return [UNTRUSTED_OPEN_TAG, defanged, UNTRUSTED_CLOSE_TAG];
}

export interface ActionRisk {
  risky: boolean;
  reasons: string[];
}

// High-signal ExtendScript APIs that reach outside normal AE editing — file
// system, network, system commands, or dynamic code. A generated creative
// action never needs these, so their presence is the strongest indicator that
// untrusted project content (names, markers, expressions) steered the model
// into emitting something that should not auto-run without a human look.
const RISK_PATTERNS: { pattern: RegExp; reason: string }[] = [
  // ExtendScript allows the constructor with or without `new` (File('~/x'),
  // Folder('~/x')), so match the bare-call form too or the gate is bypassable.
  { pattern: /\bnew\s+File\b|\bFile\s*\(/, reason: "accesses the file system" },
  { pattern: /\bnew\s+Folder\b|\bFolder\s*\(/, reason: "accesses the file system" },
  { pattern: /\bnew\s+Socket\b/, reason: "opens a network connection" },
  { pattern: /\bsystem\s*\.\s*callSystem\b/, reason: "runs a system shell command" },
  { pattern: /\$\s*\.\s*evalFile\b/, reason: "evaluates external code" },
  { pattern: /\beval\s*\(/, reason: "evaluates code dynamically" },
  { pattern: /\bapp\s*\.\s*executeCommand\b/, reason: "runs an arbitrary AE menu command" },
  { pattern: /\bapp\s*\.\s*quit\b/, reason: "quits After Effects" },
];

export function scanActionRisk(script?: string): ActionRisk {
  if (!script) return { risky: false, reasons: [] };
  const reasons: string[] = [];
  for (const { pattern, reason } of RISK_PATTERNS) {
    if (pattern.test(script) && reasons.indexOf(reason) === -1) {
      reasons.push(reason);
    }
  }
  return { risky: reasons.length > 0, reasons };
}
