import { RECIPES, type RecipeEntry } from "./data/recipes";
import type { KnowledgeSource } from "./types";

const MAX_RECIPES = 2;

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
  "These are verified, composable action recipes for After Effects. " +
  "Treat them as building blocks: combine and adapt them to fulfill the user's request " +
  "rather than starting from scratch.";

function formatRecipe(recipe: RecipeEntry): string {
  const lines = [
    "### " + recipe.description,
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

  for (const pattern of patterns) {
    if (matchedIds.has(pattern.recipe.id)) continue;
    if (!pattern.regex.test(userMessage)) continue;

    matched.push(pattern.recipe);
    matchedIds.add(pattern.recipe.id);

    if (matched.length === MAX_RECIPES) break;
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

    return ["## Verified Action Recipes", PREAMBLE, ...matched.map(formatRecipe)].join("\n\n");
  },
  getMessageContextDiagnostics(userMessage: string) {
    return {
      ids: matchRecipes(userMessage).map((recipe) => recipe.id),
    };
  },
};
