import { evalTS } from "../lib/utils/bolt";
import type { ContextChip } from "../../shared/shared";
import { fs } from "./cep/node";
import {
  getMessageKnowledgeContext,
  getStaticKnowledgeContext,
} from "./knowledge/index";

interface ProjectInfo {
  projectName: string;
  projectPath: string;
  numItems: number;
  expressionEngine?: string;
  bitsPerChannel?: number;
  appVersion?: string;
}

interface LayerStackRow {
  index: number;
  name: string;
  type: string;
  inPoint?: number;
  outPoint?: number;
  disabled?: boolean;
  locked?: boolean;
  threeD?: boolean;
  parent?: string;
  numEffects?: number;
}

interface CompMarker {
  time: number;
  comment: string;
}

interface CompInfo {
  name: string;
  width: number;
  height: number;
  fps: number;
  duration: number;
  time?: number;
  workAreaStart?: number;
  workAreaDuration?: number;
  markers?: CompMarker[];
  numLayers: number;
  selectedLayers: { name: string; type: string; index: number }[];
  layers: LayerStackRow[];
  error?: string;
}

interface SelectedLayerEffectProperty {
  name: string;
  matchName: string;
  value: string;
}

interface SelectedLayerEffect {
  effectName: string;
  effectMatchName: string;
  properties: SelectedLayerEffectProperty[];
}

interface SelectedLayerKeyframedProperty {
  name: string;
  numKeys: number;
  firstKeyTime: number;
  lastKeyTime: number;
}

interface SelectedLayerExpression {
  name: string;
  expression: string;
}

interface LayerDetail {
  name: string;
  index: number;
  type: string;
  effects: SelectedLayerEffect[];
  keyframed: SelectedLayerKeyframedProperty[];
  expressions: SelectedLayerExpression[];
}

interface SelectedLayerDetails {
  layers: LayerDetail[];
}

interface SelectedPropertyDetail {
  kind: "property" | "group";
  name: string;
  matchName: string;
  valueType?: string;
  currentValue?: string;
  keyframes?: { time: number; value: string }[];
  expression?: string;
  childProperties?: string[];
}

interface SelectedPropertyDetails {
  properties: SelectedPropertyDetail[];
}

interface ProjectItemRow {
  name: string;
  type: string;
  size?: string;
  folder?: string;
}

interface ProjectItems {
  total: number;
  items: ProjectItemRow[];
}

interface ContextSnapshot {
  project: ProjectInfo | null;
  items: ProjectItems | null;
  comp: CompInfo | null;
  analysis: { summary: string; updatedAt: string };
  selectedLayers: SelectedLayerDetails;
  selectedProperties: SelectedPropertyDetails;
}

interface PinnedCompDetail extends CompInfo {
  pinType: "comp";
  label: string;
  error?: string;
}

interface PinnedLayerDetail {
  pinType: "layer";
  label: string;
  compName?: string;
  layer?: LayerDetail;
  error?: string;
}

interface PinnedEffectDetail {
  pinType: "effect";
  label: string;
  layerName?: string;
  layerIndex?: number;
  effectIndex?: number;
  effectName?: string;
  effectMatchName?: string;
  enabled?: boolean;
  properties?: SelectedLayerEffectProperty[];
  error?: string;
}

type PinnedDetail = PinnedCompDetail | PinnedLayerDetail | PinnedEffectDetail;

export interface LastActionResult {
  summary: string;
  ranAt: number;
  stateDiff: string[];
}

export interface ChatContext {
  // Byte-stable for the whole session — providers put this first so it can
  // be served from the prompt cache (or sent once per CLI session).
  staticContext: string;
  // Per-turn AE state and message-matched knowledge.
  systemContext: string;
  projectRoot?: string;
  diagnostics: {
    recipeIds: string[];
  };
}

type CompChip = Extract<ContextChip, { type: "comp" }>;
type LayerChip = Extract<ContextChip, { type: "layer" }>;
type EffectChip = Extract<ContextChip, { type: "effect" }>;

const COMP_CACHE_TTL_MS = 10000;
const compListCache = new Map<"comps", { ts: number; items: CompChip[] }>();

function formatSeconds(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "?s";
  const rounded = Math.abs(value - Math.round(value)) < 0.001 ? Math.round(value) : Number(value.toFixed(2));
  return `${rounded}s`;
}

function formatExpressionInline(expression: string): string {
  return expression.replace(/\s+/g, " ").trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function toStringField(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function toNumberField(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export async function listProjectComps(): Promise<CompChip[]> {
  const cached = compListCache.get("comps");
  if (cached && Date.now() - cached.ts < COMP_CACHE_TTL_MS) {
    return cached.items.slice();
  }

  const raw = await evalTS("getProjectCompsList");
  const items = Array.isArray(raw)
    ? raw
        .filter(isRecord)
        .map((r) => ({
          type: "comp" as const,
          label: toStringField(r.label),
          compId: toStringField(r.compId),
        }))
        .filter((chip) => chip.label && chip.compId)
    : [];

  compListCache.set("comps", { ts: Date.now(), items });
  return items.slice();
}

export async function listSelectedLayers(): Promise<LayerChip[]> {
  const raw = await evalTS("getSelectedLayersList");
  return Array.isArray(raw)
    ? raw
        .filter(isRecord)
        .map((r) => ({
          type: "layer" as const,
          label: toStringField(r.label),
          layerIndex: toNumberField(r.layerIndex),
          compName: toStringField(r.compName),
        }))
        .filter((chip) => chip.label && chip.layerIndex > 0 && chip.compName)
    : [];
}

export async function listEffectsOnSelectedLayer(): Promise<EffectChip[]> {
  const raw = await evalTS("getEffectsOnSelectedLayer");
  return Array.isArray(raw)
    ? raw
        .filter(isRecord)
        .map((r) => ({
          type: "effect" as const,
          label: toStringField(r.label),
          matchName: toStringField(r.matchName),
          effectIndex: toNumberField(r.effectIndex),
          layerIndex: toNumberField(r.layerIndex),
          layerName: toStringField(r.layerName),
        }))
        .filter(
          (chip) =>
            chip.label &&
            chip.matchName &&
            chip.effectIndex > 0 &&
            chip.layerIndex > 0 &&
            chip.layerName
        )
    : [];
}

async function fetchContextSnapshot(): Promise<ContextSnapshot | null> {
  let raw: unknown = null;
  try {
    raw = await evalTS("getContextSnapshot");
  } catch {
    return null;
  }
  if (!isRecord(raw)) return null;

  if (typeof raw.file === "string" && raw.file) {
    try {
      if (fs && typeof fs.readFileSync === "function") {
        const contents = fs.readFileSync(raw.file, "utf8");
        return JSON.parse(contents) as ContextSnapshot;
      }
    } catch {
      // Fall through to inline payload if present.
    }
  }

  if (isRecord(raw.inline)) {
    return raw.inline as unknown as ContextSnapshot;
  }

  return null;
}

async function fetchPinnedDetails(pinnedContexts?: ContextChip[]): Promise<PinnedDetail[]> {
  if (!pinnedContexts?.length) return [];
  try {
    const raw = await evalTS("getPinnedContextDetails", pinnedContexts as any);
    if (isRecord(raw) && Array.isArray((raw as any).items)) {
      return (raw as any).items as PinnedDetail[];
    }
  } catch {
    // Resolution is best-effort; fall back to bare labels below.
  }
  return [];
}

function formatLayerStackRow(row: LayerStackRow): string {
  const parts: string[] = [`  ${row.index}. ${row.name} [${row.type}]`];
  if (typeof row.inPoint === "number" && typeof row.outPoint === "number") {
    parts.push(`${formatSeconds(row.inPoint)}-${formatSeconds(row.outPoint)}`);
  }
  if (row.parent) parts.push(`parent=${row.parent}`);
  if (row.threeD) parts.push("3D");
  if (row.disabled) parts.push("disabled");
  if (row.locked) parts.push("locked");
  if (row.numEffects) parts.push(`fx:${row.numEffects}`);
  return parts.join(" | ");
}

function buildLayerDetailLines(layer: LayerDetail, indent: string): string[] {
  const lines: string[] = [];

  if (layer.effects.length > 0) {
    lines.push(`${indent}Effects:`);
    for (const effect of layer.effects) {
      lines.push(`${indent}  ${effect.effectName} (${effect.effectMatchName})`);
      for (const prop of effect.properties) {
        lines.push(`${indent}    ${prop.name} | ${prop.value}`);
      }
    }
  }

  if (layer.keyframed.length > 0) {
    const keyframedSummary = layer.keyframed
      .map(
        (prop) =>
          `${prop.name} (${prop.numKeys} keys, ${formatSeconds(prop.firstKeyTime)}-${formatSeconds(prop.lastKeyTime)})`
      )
      .join(", ");
    lines.push(`${indent}Keyframed: ${keyframedSummary}`);
  }

  if (layer.expressions.length > 0) {
    lines.push(`${indent}Expressions:`);
    for (const expression of layer.expressions) {
      lines.push(`${indent}  ${expression.name}: ${formatExpressionInline(expression.expression)}`);
    }
  }

  return lines;
}

function formatBarePin(chip: ContextChip): string {
  if (chip.type === "comp") {
    return `comp: ${chip.label} (id:${chip.compId})`;
  }
  if (chip.type === "layer") {
    return `layer: ${chip.label} (index:${chip.layerIndex} in ${chip.compName})`;
  }
  return `effect: ${chip.label} (matchName:${chip.matchName}, effectIndex:${chip.effectIndex}, on ${chip.layerName} layerIndex:${chip.layerIndex})`;
}

function buildPinnedDetailLines(detail: PinnedDetail): string[] {
  const lines: string[] = [];

  if (detail.pinType === "comp") {
    if (detail.error) {
      lines.push(`comp: ${detail.label} — ${detail.error}`);
      return lines;
    }
    lines.push(
      `comp: "${detail.name}" — ${detail.width}x${detail.height} @ ${detail.fps}fps, ${formatSeconds(detail.duration)}, ${detail.numLayers} layers`
    );
    for (const row of detail.layers || []) {
      lines.push(formatLayerStackRow(row));
    }
    if (detail.numLayers > (detail.layers?.length || 0)) {
      lines.push(`  ... and ${detail.numLayers - (detail.layers?.length || 0)} more layers`);
    }
    return lines;
  }

  if (detail.pinType === "layer") {
    if (detail.error || !detail.layer) {
      lines.push(`layer: ${detail.label} — ${detail.error || "could not resolve"}`);
      return lines;
    }
    lines.push(
      `layer: "${detail.layer.name}" (index ${detail.layer.index} in "${detail.compName}", ${detail.layer.type})`
    );
    lines.push(...buildLayerDetailLines(detail.layer, "  "));
    return lines;
  }

  if (detail.error) {
    lines.push(`effect: ${detail.label} — ${detail.error}`);
    return lines;
  }
  lines.push(
    `effect: "${detail.effectName}" (${detail.effectMatchName}) on layer "${detail.layerName}" (index ${detail.layerIndex}, effectIndex ${detail.effectIndex})${detail.enabled === false ? " [disabled]" : ""}`
  );
  for (const prop of detail.properties || []) {
    lines.push(`    ${prop.name} | ${prop.matchName} | ${prop.value}`);
  }
  return lines;
}

function buildPinnedContextBlock(
  pinnedContexts: ContextChip[] | undefined,
  resolved: PinnedDetail[]
): string[] {
  if (!pinnedContexts?.length) return [];

  const lines: string[] = ["<pinned-context>"];
  if (resolved.length > 0) {
    for (const detail of resolved) {
      lines.push(...buildPinnedDetailLines(detail));
    }
  } else {
    // Resolution failed — at least give the model the references.
    for (const chip of pinnedContexts) {
      lines.push(formatBarePin(chip));
    }
  }
  lines.push("</pinned-context>");
  return lines;
}

function buildSelectedLayerDetailsSection(details: SelectedLayerDetails | null): string[] {
  if (!details?.layers?.length) return [];

  const usefulLayers = details.layers.filter(
    (layer) =>
      layer.effects.length > 0 ||
      layer.keyframed.length > 0 ||
      layer.expressions.length > 0
  );
  if (usefulLayers.length === 0) return [];

  const lines: string[] = ["## Selected Layer Details"];

  for (const layer of usefulLayers) {
    lines.push(`Layer ${layer.index} - "${layer.name}" (${layer.type})`);
    lines.push(...buildLayerDetailLines(layer, "  "));
  }

  return lines;
}

function buildSelectedPropertiesSection(details: SelectedPropertyDetails | null): string[] {
  if (!details?.properties?.length) return [];

  const lines: string[] = ["## Selected Properties"];

  for (const prop of details.properties) {
    if (prop.kind === "group") {
      lines.push(`Group: ${prop.name} (${prop.matchName})`);
      if (prop.childProperties?.length) {
        lines.push(`  Children: ${prop.childProperties.join(", ")}`);
      }
      continue;
    }

    lines.push(`${prop.name} (${prop.matchName}) [${prop.valueType || "unknown"}]`);

    if (typeof prop.currentValue === "string" && prop.currentValue.length > 0) {
      lines.push(`  Current: ${prop.currentValue}`);
    }

    if (prop.keyframes?.length) {
      lines.push("  Keyframes:");
      for (const keyframe of prop.keyframes) {
        lines.push(`    ${formatSeconds(keyframe.time)} | ${keyframe.value}`);
      }
    }

    if (prop.expression) {
      lines.push("  Expression:");
      for (const line of prop.expression.split(/\r?\n/)) {
        lines.push(`    ${line}`);
      }
    }
  }

  return lines;
}

function collectPresentEffectMatchNames(
  selectedLayerDetails: SelectedLayerDetails | null,
  resolvedPins: PinnedDetail[]
): string[] {
  const matchNames: string[] = [];

  for (const layer of selectedLayerDetails?.layers || []) {
    for (const effect of layer.effects) {
      if (effect.effectMatchName) matchNames.push(effect.effectMatchName);
    }
  }

  for (const detail of resolvedPins) {
    if (detail.pinType === "effect" && detail.effectMatchName) {
      matchNames.push(detail.effectMatchName);
    }
    if (detail.pinType === "layer" && detail.layer) {
      for (const effect of detail.layer.effects) {
        if (effect.effectMatchName) matchNames.push(effect.effectMatchName);
      }
    }
  }

  return matchNames;
}

const STATIC_PRELUDE = [
  "## Constraints",
  "- ES3/ExtendScript only (var, no arrow functions, no template literals)",
  "- Wrap changes in app.beginUndoGroup() / app.endUndoGroup()",
  "",
  "## AI Action Protocol",
  "- When you want to prepare a temporary runnable action, append an <ai-action> block.",
  '- Use exactly this format: <ai-action run="true">...ExtendScript ES3...</ai-action>',
  "- Set run=\"true\" only when the user wants the temporary action executed immediately.",
  "- The script should target the current project state and overwrite the previous AI Action.",
].join("\n");

let cachedStaticContext: string | null = null;

function getStaticContext(): string {
  if (cachedStaticContext === null) {
    cachedStaticContext = STATIC_PRELUDE + "\n\n" + getStaticKnowledgeContext();
  }
  return cachedStaticContext;
}

export async function buildContext(
  userMessage?: string,
  pinnedContexts?: ContextChip[],
  lastAction?: LastActionResult
): Promise<ChatContext> {
  let projectRoot = "";

  try {
    const raw = await evalTS("getProjectRoot");
    if (typeof raw === "string") {
      projectRoot = raw;
    }
  } catch {
    // No project root available
  }

  const snapshot = await fetchContextSnapshot();
  const projectInfo = snapshot?.project || null;
  const compInfo = snapshot?.comp && !snapshot.comp.error && snapshot.comp.name ? snapshot.comp : null;
  const analysisSummary = snapshot?.analysis?.summary || "";
  const analysisUpdatedAt = snapshot?.analysis?.updatedAt || "";
  const selectedLayerDetails = snapshot?.selectedLayers || null;
  const selectedPropertyDetails = snapshot?.selectedProperties || null;

  const resolvedPins = await fetchPinnedDetails(pinnedContexts);
  const pinnedContextBlock = buildPinnedContextBlock(pinnedContexts, resolvedPins);
  if (pinnedContextBlock.length > 0) {
    console.log("[AE AI Chat] pinned context\n" + pinnedContextBlock.join("\n"));
  }

  const lines: string[] = [];
  if (pinnedContextBlock.length > 0) {
    lines.push(...pinnedContextBlock);
    lines.push("");
  }

  lines.push("# AE Project Context");

  if (projectInfo) {
    const aeMeta: string[] = [];
    if (projectInfo.appVersion) aeMeta.push(`AE ${projectInfo.appVersion}`);
    if (projectInfo.expressionEngine) aeMeta.push(`engine: ${projectInfo.expressionEngine}`);
    if (projectInfo.bitsPerChannel) aeMeta.push(`${projectInfo.bitsPerChannel}bpc`);
    const metaSuffix = aeMeta.length > 0 ? ` | ${aeMeta.join(" | ")}` : "";
    lines.push(
      `Project: ${projectInfo.projectName} | Items: ${projectInfo.numItems}${metaSuffix}`
    );
  } else {
    lines.push("No AE project is currently open.");
  }

  const projectItems = snapshot?.items || null;
  if (projectItems && projectItems.items.length > 0) {
    lines.push("");
    lines.push("## Project Items");
    for (const item of projectItems.items) {
      const parts = [`  ${item.type}: ${item.name}`];
      if (item.size) parts.push(item.size);
      if (item.folder) parts.push(`in "${item.folder}"`);
      lines.push(parts.join(" | "));
    }
    if (projectItems.total > projectItems.items.length) {
      lines.push(`  ... and ${projectItems.total - projectItems.items.length} more items`);
    }
  }

  if (compInfo) {
    lines.push(
      `Active Comp: ${compInfo.name} (${compInfo.width}x${compInfo.height} @ ${compInfo.fps}fps, ${compInfo.duration.toFixed(1)}s)`
    );
    if (typeof compInfo.time === "number") {
      const workAreaSuffix =
        typeof compInfo.workAreaStart === "number" &&
        typeof compInfo.workAreaDuration === "number"
          ? ` | Work area: ${formatSeconds(compInfo.workAreaStart)}-${formatSeconds(compInfo.workAreaStart + compInfo.workAreaDuration)}`
          : "";
      lines.push(`Playhead: ${formatSeconds(compInfo.time)}${workAreaSuffix}`);
    }
    lines.push(`Layers: ${compInfo.numLayers}`);

    if (compInfo.selectedLayers && compInfo.selectedLayers.length > 0) {
      const selected = compInfo.selectedLayers
        .map((l) => `${l.name} (${l.type})`)
        .join(", ");
      lines.push(`Selected layers: ${selected}`);
    } else {
      lines.push("Selected layers: (none)");
    }

    if (compInfo.markers && compInfo.markers.length > 0) {
      lines.push("Markers: " + compInfo.markers
        .map((m) => `${formatSeconds(m.time)}${m.comment ? ` "${m.comment}"` : ""}`)
        .join(", "));
    }

    if (compInfo.layers && compInfo.layers.length > 0) {
      lines.push("");
      lines.push("## Layer Stack");
      for (const row of compInfo.layers) {
        lines.push(formatLayerStackRow(row));
      }
      if (compInfo.numLayers > compInfo.layers.length) {
        lines.push(`  ... and ${compInfo.numLayers - compInfo.layers.length} more`);
      }
    }
  }

  if (analysisSummary) {
    lines.push("");
    lines.push(analysisSummary);
    if (analysisUpdatedAt) {
      lines.push(
        `(Cached analysis captured at ${analysisUpdatedAt} — it may be stale; trust the live sections above when they disagree.)`
      );
    }
  }

  const selectedLayerLines = buildSelectedLayerDetailsSection(selectedLayerDetails);
  if (selectedLayerLines.length > 0) {
    lines.push("");
    lines.push(...selectedLayerLines);
  } else {
    lines.push("");
    lines.push("## Selected Layer Details");
    lines.push("(none — no selected layer has effects, keyframes, or expressions to report)");
  }

  const selectedPropertyLines = buildSelectedPropertiesSection(selectedPropertyDetails);
  if (selectedPropertyLines.length > 0) {
    lines.push("");
    lines.push(...selectedPropertyLines);
  } else {
    lines.push("");
    lines.push("## Selected Properties");
    lines.push("(none)");
  }

  if (lastAction) {
    lines.push("");
    lines.push("## Last AI Action");
    lines.push(`Ran at ${new Date(lastAction.ranAt).toISOString()}: ${lastAction.summary}`);
    if (lastAction.stateDiff.length > 0) {
      lines.push("Observed changes in the active comp:");
      for (const note of lastAction.stateDiff) {
        lines.push(`  - ${note}`);
      }
    } else {
      lines.push(
        "No layer/effect changes were observed in the active comp — if the action was supposed to change something, verify it actually did."
      );
    }
  }

  lines.push("");
  lines.push(
    "Important: trust the selection state above. If a section says (none), do NOT assume any layer/property is selected based on prior conversation."
  );

  const presentEffects = collectPresentEffectMatchNames(selectedLayerDetails, resolvedPins);
  const knowledgeContext = getMessageKnowledgeContext(userMessage, presentEffects);
  if (knowledgeContext.text) {
    lines.push("");
    lines.push(knowledgeContext.text);
  }

  return {
    staticContext: getStaticContext(),
    systemContext: lines.join("\n"),
    projectRoot: projectRoot || undefined,
    diagnostics: knowledgeContext.diagnostics,
  };
}
