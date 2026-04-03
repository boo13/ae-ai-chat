interface ErrorPattern {
  pattern: RegExp;
  hint: string;
}

export const ERROR_PATTERNS: ErrorPattern[] = [
  {
    pattern: /TypeError.*undefined is not an object/i,
    hint:
      "Common cause: a variable is null/undefined. Check that the target layer, comp, or property exists before accessing it.",
  },
  {
    pattern: /undefined is not an object.*addProperty/i,
    hint:
      "The matchName passed to addProperty() may be wrong, or the effect already exists on the layer.",
  },
  {
    pattern: /SyntaxError/i,
    hint:
      "ExtendScript requires ES3. Check for: let/const (use var), arrow functions (use function), template literals (use string concatenation).",
  },
  {
    pattern: /Cannot set property .* of null/i,
    hint:
      "The target layer, comp, or property returned null. Verify indices and property paths before setting values.",
  },
  {
    pattern: /ReferenceError/i,
    hint:
      "A variable or function is used before it is defined, or is misspelled.",
  },
];

export function getErrorHint(errorString: string): string | null {
  for (const errorPattern of ERROR_PATTERNS) {
    if (errorPattern.pattern.test(errorString)) {
      return errorPattern.hint;
    }
  }

  return null;
}
