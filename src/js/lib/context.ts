import { evalTS } from "../lib/utils/bolt";
import { getKnowledgeContext } from "./knowledge/index";

interface ProjectInfo {
  projectName: string;
  projectPath: string;
  numItems: number;
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
}

function formatSeconds(value: number): string {
  if (!Number.isFinite(value)) return "?s";
  const rounded = Math.abs(value - Math.round(value)) < 0.001 ? Math.round(value) : value;
  return `${rounded}s`;
}

function formatExpressionInline(expression: string): string {
  return expression.replace(/\s+/g, " ").trim();
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

export async function buildContext(userMessage?: string): Promise<ChatContext> {
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

  const lines: string[] = ["# AE Project Context"];

  if (projectInfo) {
    lines.push(
      `Project: ${projectInfo.projectName} | Items: ${projectInfo.numItems}`
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
      lines.push(`Selected: ${selected}`);
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
  }

  const selectedPropertyLines = buildSelectedPropertiesSection(selectedPropertyDetails);
  if (selectedPropertyLines.length > 0) {
    lines.push("");
    lines.push(...selectedPropertyLines);
  }

  lines.push("");
  lines.push(getKnowledgeContext(userMessage));

  lines.push("");
  lines.push("## AI Action Protocol");
  lines.push("- When you want to prepare a temporary runnable action, append an <ai-action> block.");
  lines.push('- Use exactly this format: <ai-action run="true">...ExtendScript ES3...</ai-action>');
  lines.push("- Set run=\"true\" only when the user wants the temporary action executed immediately.");
  lines.push("- The script should target the current project state and overwrite the previous AI Action.");

  return {
    systemContext: lines.join("\n"),
    projectRoot: projectRoot || undefined,
  };
}
