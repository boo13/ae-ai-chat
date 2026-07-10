import { RECIPES, type RecipeEntry } from "./data/recipes";
import type { KnowledgeSource } from "./types";

const MAX_RECIPE_CHARS = 6000;

const TERM_STOP_WORDS = new Set([
  "a", "an", "the", "to", "for", "with", "on", "in", "of", "it", "is",
  "by", "from", "and", "or", "at", "as", "so", "up", "all", "into", "its",
  "any", "be", "are", "how", "can", "this", "that", "each", "which",
  "between", "per", "via", "new", "one", "two", "add", "set", "get", "use",
  "do", "make",
  // AE-generic terms that appear in almost every recipe and don't discriminate
  "layer", "layers", "effect", "effects", "selected",
]);

function termTokenize(text: string): string[] {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !TERM_STOP_WORDS.has(t));
  return [...new Set(tokens)];
}

function termScore(userTokens: Set<string>, recipe: RecipeEntry): number {
  let score = 0;
  for (const term of recipe.terms) {
    if (userTokens.has(term)) score++;
  }
  return score;
}

const patterns: Array<{ regex: RegExp; recipe: RecipeEntry }> = [];
for (const recipe of RECIPES) {
  for (const keyword of recipe.keywords) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    patterns.push({
      regex: new RegExp("\\b" + escaped + "\\b", "i"),
      recipe,
    });
  }
}

const PREAMBLE =
  "These are composable action recipes for After Effects. Each entry states its runtime verification status. " +
  "Treat verified recipes as authoritative building blocks; adapt pending recipes carefully until their AE checkpoint is complete.";

function formatRecipe(recipe: RecipeEntry): string {
  const lines = [
    "### " + recipe.description,
    "Runtime verification: " + recipe.verifiedStatus,
    "```jsx",
    recipe.script,
    "```",
  ];

  if (recipe.notes) {
    lines.push("Note: " + recipe.notes);
  }

  return lines.join("\n");
}

function matchRecipes(userMessage: string): RecipeEntry[] {
  const matched: RecipeEntry[] = [];
  const matchedIds = new Set<string>();
  let charCount = 0;

  for (const pattern of patterns) {
    if (matchedIds.has(pattern.recipe.id)) continue;
    if (!pattern.regex.test(userMessage)) continue;

    const formatted = formatRecipe(pattern.recipe);
    if (charCount > 0 && charCount + formatted.length > MAX_RECIPE_CHARS) break;

    matched.push(pattern.recipe);
    matchedIds.add(pattern.recipe.id);
    charCount += formatted.length;
  }

  if (matched.length > 0) return matched;

  // Fallback: term-overlap scoring when keyword matching finds nothing.
  // Handles paraphrase mismatches where the user's words appear in recipe
  // descriptions but not in the explicit keyword list.
  const userTokens = new Set(termTokenize(userMessage));
  const scored = RECIPES.map((r) => ({ recipe: r, score: termScore(userTokens, r) }))
    .filter((x) => x.score >= 2)
    .sort((a, b) => b.score - a.score);

  for (const { recipe } of scored) {
    const formatted = formatRecipe(recipe);
    if (charCount > 0 && charCount + formatted.length > MAX_RECIPE_CHARS) break;
    matched.push(recipe);
    matchedIds.add(recipe.id);
    charCount += formatted.length;
  }

  return matched;
}

export const recipesKnowledge: KnowledgeSource = {
  id: "recipes",
  getStaticContext() {
    return "";
  },
  getMessageContext(userMessage: string) {
    const matched = matchRecipes(userMessage);

    if (matched.length === 0) return "";

    return ["## Action Recipes", PREAMBLE, ...matched.map(formatRecipe)].join("\n\n");
  },
  getMessageContextDiagnostics(userMessage: string) {
    return {
      ids: matchRecipes(userMessage).map((recipe) => recipe.id),
    };
  },
};
