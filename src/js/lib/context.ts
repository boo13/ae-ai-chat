import { evalTS } from "../lib/utils/bolt";
import type { ContextChip } from "../../shared/shared";
import { getKnowledgeContext } from "./knowledge/index";

interface ProjectInfo {
  projectName: string;
  projectPath: string;
  numItems: number;
  expressionEngine?: string;
  bitsPerChannel?: number;
  appVersion?: string;
}

interface CompInfo {
  name: string;
  width: number;
  height: number;
  fps: number;
  duration: number;
  numLayers: number;
  selectedLayers: { name: string; type: string; index: number }[];
  layers: { name: string; type: string; index: number }[];
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

interface SelectedLayerDetails {
  layers: {
    name: string;
    index: number;
    type: string;
    effects: SelectedLayerEffect[];
    keyframed: SelectedLayerKeyframedProperty[];
    expressions: SelectedLayerExpression[];
  }[];
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

export interface ChatContext {
  systemContext: string;
  projectRoot?: string;
  diagnostics: {
    exampleIds: string[];
  };
}

type CompChip = Extract<ContextChip, { type: "comp" }>;
type LayerChip = Extract<ContextChip, { type: "layer" }>;
type EffectChip = Extract<ContextChip, { type: "effect" }>;

const COMP_CACHE_TTL_MS = 10000;
const compListCache = new Map<"comps", { ts: number; items: CompChip[] }>();

function formatSeconds(value: number): string {
  if (!Number.isFinite(value)) return "?s";
  const rounded = Math.abs(value - Math.round(value)) < 0.001 ? Math.round(value) : value;
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

function formatPinnedContext(chip: ContextChip): string {
  if (chip.type === "comp") {
    return `comp: ${chip.label} (id:${chip.compId})`;
  }

  if (chip.type === "layer") {
    return `layer: ${chip.label} (index:${chip.layerIndex} in ${chip.compName})`;
  }

  return `effect: ${chip.label} (matchName:${chip.matchName}, effectIndex:${chip.effectIndex}, on ${chip.layerName} layerIndex:${chip.layerIndex})`;
}

function buildPinnedContextBlock(pinnedContexts?: ContextChip[]): string[] {
  if (!pinnedContexts?.length) return [];

  return [
    "<pinned-context>",
    ...pinnedContexts.map(formatPinnedContext),
    "</pinned-context>",
  ];
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

    if (layer.effects.length > 0) {
      lines.push("  Effects:");
      for (const effect of layer.effects) {
        lines.push(`    ${effect.effectName} (${effect.effectMatchName})`);
        for (const prop of effect.properties) {
          lines.push(`      ${prop.name} | ${prop.value}`);
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
      lines.push(`  Keyframed: ${keyframedSummary}`);
    }

    if (layer.expressions.length > 0) {
      lines.push("  Expressions:");
      for (const expression of layer.expressions) {
        lines.push(`    ${expression.name}: ${formatExpressionInline(expression.expression)}`);
      }
    }
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

export async function buildContext(
  userMessage?: string,
  pinnedContexts?: ContextChip[]
): Promise<ChatContext> {
  let projectInfo: ProjectInfo | null = null;
  let compInfo: CompInfo | null = null;
  let selectedLayerDetails: SelectedLayerDetails | null = null;
  let selectedPropertyDetails: SelectedPropertyDetails | null = null;
  let analysisSummary = "";
  let projectRoot = "";

  try {
    const raw = await evalTS("getProjectInfo");
    if (raw && typeof raw === "object" && (raw as any).projectName) {
      projectInfo = raw as ProjectInfo;
    }
  } catch {
    // No project open
  }

  try {
    const raw = await evalTS("getProjectRoot");
    if (typeof raw === "string") {
      projectRoot = raw;
    }
  } catch {
    // No project root available
  }

  try {
    const raw = await evalTS("getActiveCompInfo");
    if (raw && typeof raw === "object" && !(raw as any).error && (raw as any).name) {
      compInfo = raw as CompInfo;
    }
  } catch {
    // No active comp
  }

  try {
    const raw = await evalTS("getAnalysisSummary");
    if (raw && typeof raw === "object" && typeof (raw as any).summary === "string") {
      analysisSummary = (raw as any).summary;
    }
  } catch {
    // No cached analysis
  }

  try {
    const raw = await evalTS("getSelectedLayerDetails");
    if (raw && typeof raw === "object" && Array.isArray((raw as any).layers)) {
      selectedLayerDetails = raw as SelectedLayerDetails;
    }
  } catch {
    // No selected layer details available
  }

  try {
    const raw = await evalTS("getSelectedPropertyDetails");
    if (raw && typeof raw === "object" && Array.isArray((raw as any).properties)) {
      selectedPropertyDetails = raw as SelectedPropertyDetails;
    }
  } catch {
    // No selected property details available
  }

  const pinnedContextBlock = buildPinnedContextBlock(pinnedContexts);
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

  if (compInfo) {
    lines.push(
      `Active Comp: ${compInfo.name} (${compInfo.width}x${compInfo.height} @ ${compInfo.fps}fps, ${compInfo.duration.toFixed(1)}s)`
    );
    lines.push(`Layers: ${compInfo.numLayers}`);

    if (compInfo.selectedLayers && compInfo.selectedLayers.length > 0) {
      const selected = compInfo.selectedLayers
        .map((l) => `${l.name} (${l.type})`)
        .join(", ");
      lines.push(`Selected layers: ${selected}`);
    } else {
      lines.push("Selected layers: (none)");
    }

    if (compInfo.layers && compInfo.layers.length > 0) {
      lines.push("");
      lines.push("## Layer Stack");
      for (const l of compInfo.layers) {
        lines.push(`  ${l.index}. ${l.name} [${l.type}]`);
      }
      if (compInfo.numLayers > compInfo.layers.length) {
        lines.push(`  ... and ${compInfo.numLayers - compInfo.layers.length} more`);
      }
    }
  }

  lines.push("");
  lines.push("## Constraints");
  lines.push("- ES3/ExtendScript only (var, no arrow functions, no template literals)");
  lines.push("- Wrap changes in app.beginUndoGroup() / app.endUndoGroup()");

  if (analysisSummary) {
    lines.push("");
    lines.push(analysisSummary);
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

  lines.push("");
  lines.push(
    "Important: trust the selection state above. If a section says (none), do NOT assume any layer/property is selected based on prior conversation."
  );

  lines.push("");
  const knowledgeContext = getKnowledgeContext(userMessage, { diagnostics: true });
  lines.push(knowledgeContext.text);

  lines.push("");
  lines.push("## AI Action Protocol");
  lines.push("- When you want to prepare a temporary runnable action, append an <ai-action> block.");
  lines.push('- Use exactly this format: <ai-action run="true">...ExtendScript ES3...</ai-action>');
  lines.push("- Set run=\"true\" only when the user wants the temporary action executed immediately.");
  lines.push("- The script should target the current project state and overwrite the previous AI Action.");

  return {
    systemContext: lines.join("\n"),
    projectRoot: projectRoot || undefined,
    diagnostics: knowledgeContext.diagnostics,
  };
}
