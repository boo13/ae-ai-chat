import { evalTS } from "../lib/utils/bolt";

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

export interface ChatContext {
  systemContext: string;
  projectRoot?: string;
}

export async function buildContext(): Promise<ChatContext> {
  let projectInfo: ProjectInfo | null = null;
  let compInfo: CompInfo | null = null;
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
