import {
  validateScript,
  type ScriptValidationResult,
} from "./knowledge/validator";
import { decodeHtmlEntities } from "./utils/html-entities";

export interface TutorialStepAction {
  index: number;
  script: string;
  label: string;
  validation: ScriptValidationResult;
}

export interface ParsedTutorial {
  title: string;
  html: string;
  actions: TutorialStepAction[];
}

export interface ParsedTutorialResponse {
  displayText: string;
  tutorial?: ParsedTutorial;
  multipleBlocks?: boolean;
}

const DEFAULT_TITLE = "After Effects Tutorial";

function stripWrappingHtmlFence(content: string): string {
  const trimmed = content.trim();
  const match = trimmed.match(/^```html\s*([\s\S]*?)\s*```$/i);
  return match ? match[1].trim() : content;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function plainText(value: string): string {
  return decodeHtmlEntities(value.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function commentSafe(value: string): string {
  return value.replace(/--+/g, "-").replace(/[\r\n]+/g, " ").trim();
}

export function parseTutorialResponse(content: string): ParsedTutorialResponse {
  const normalized = stripWrappingHtmlFence(content);
  const tutorialRegex = /<tutorial(?=\s|>)([^>]*)>([\s\S]*?)<\/tutorial>/gi;
  const matches: RegExpExecArray[] = [];
  let match: RegExpExecArray | null;

  while ((match = tutorialRegex.exec(normalized)) !== null) {
    matches.push(match);
  }

  if (matches.length === 0) {
    return { displayText: content.trim() };
  }

  const first = matches[0];
  const titleMatch = first[1].match(/\btitle="([^"]*)"/i);
  const title = decodeHtmlEntities(titleMatch?.[1] || "").trim() || DEFAULT_TITLE;
  const actions: TutorialStepAction[] = [];
  const html = first[2]
    .replace(
      /<step-script(?=\s|>)([^>]*)>([\s\S]*?)<\/step-script>/gi,
      (_full, attributes: string, rawScript: string) => {
        const index = actions.length;
        const labelMatch = attributes.match(/\blabel="([^"]*)"/i);
        const label = decodeHtmlEntities(labelMatch?.[1] || "").trim() || "Do it for me";
        const script = decodeHtmlEntities(rawScript).trim();
        actions.push({
          index,
          script,
          label,
          validation: validateScript(script),
        });
        return (
          `<div class="tutorial-step__action" data-tutorial-action="${index}">` +
          `<button type="button">▶ ${escapeHtml(label)}</button>` +
          `<span data-tutorial-status="${index}"></span>` +
          "</div>"
        );
      }
    )
    .replace(/<step-script(?=\s|>)[\s\S]*$/gi, "")
    .trim();
  const displayText = normalized.replace(tutorialRegex, "").trim();

  return {
    displayText: displayText || "Tutorial ready: " + title,
    tutorial: { title, html, actions },
    multipleBlocks: matches.length > 1,
  };
}

export function outlineForHistory(tutorial: ParsedTutorial): string {
  const headings: string[] = [];
  const headingRegex = /<h3(?:\s[^>]*)?>([\s\S]*?)<\/h3>/gi;
  let match: RegExpExecArray | null;

  while ((match = headingRegex.exec(tutorial.html)) !== null) {
    const heading = plainText(match[1]);
    if (heading) headings.push(heading);
  }

  const lines = ["Tutorial outline: " + commentSafe(tutorial.title)];
  headings.forEach((heading, index) => {
    lines.push(`${index + 1}. ${commentSafe(heading)}`);
  });
  return `<!--\n${lines.join("\n")}\n-->`;
}

export const TUTORIAL_MODE_INSTRUCTIONS = [
  "## Tutorial Mode",
  "Begin with a 1-3 sentence plain-language summary, then emit exactly one <tutorial title=\"...\">...</tutorial> block.",
  "Inside <tutorial>, use only these HTML tags: section, h2, h3, p, ul, ol, li, strong, em, code, pre, kbd, br, hr, div, span.",
  "Create 3-7 <section class=\"step\"> steps. Give every step an <h3> title and explain what the user is learning and doing.",
  "You may use <div class=\"callout callout--tip\">, <div class=\"callout callout--warning\">, or <div class=\"callout callout--note\"> for concise callouts, <kbd> for keycaps, and <pre><code> for expressions.",
  "A step may include one <step-script label=\"Do it for me\">...</step-script>. Its contents must be a self-contained ES3 ExtendScript action using var and function syntax, wrapped in app.beginUndoGroup(...) and app.endUndoGroup(). Do not make a step depend on another step having run.",
  "Do not emit <ai-action> in a tutorial response. Do not use links, images, iframes, scripts, inline styles, event handlers, or attributes other than the class attributes described above and the tutorial/step-script title or label attributes.",
].join("\n");
