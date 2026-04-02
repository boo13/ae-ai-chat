import { getActiveComp, getProjectDir } from "./aeft-utils";

var lastAnalysisSummary = "";
var lastAnalysisUpdatedAt = "";

function pad2(value: number): string {
  return value < 10 ? "0" + value : String(value);
}

function formatTimestamp(date: Date): string {
  return (
    date.getFullYear() +
    "-" +
    pad2(date.getMonth() + 1) +
    "-" +
    pad2(date.getDate()) +
    "T" +
    pad2(date.getHours()) +
    ":" +
    pad2(date.getMinutes()) +
    ":" +
    pad2(date.getSeconds())
  );
}

function getSafeLayerType(layer: Layer): string {
  if (layer instanceof TextLayer) return "text";
  if (layer instanceof ShapeLayer) return "shape";
  if (layer instanceof AVLayer) return "av";
  if (layer instanceof CameraLayer) return "camera";
  if (layer instanceof LightLayer) return "light";
  return "unknown";
}

function getEffectNames(layer: Layer): string[] {
  var names: string[] = [];
  try {
    var effects = layer.property("ADBE Effect Parade");
    if (!effects) return names;

    for (var i = 1; i <= effects.numProperties; i++) {
      var effect = effects.property(i);
      if (effect && effect.name) {
        names.push(effect.name);
      }
    }
  } catch (e) {}

  return names;
}

function getExpressionNames(layer: Layer): string[] {
  var names: string[] = [];
  try {
    for (var i = 1; i <= layer.numProperties; i++) {
      var group = layer.property(i);
      if (!group || !(group instanceof PropertyGroup)) continue;

      for (var j = 1; j <= group.numProperties; j++) {
        var prop = group.property(j);
        if (!prop || !(prop instanceof Property)) continue;
        if ((prop as any).canSetExpression && prop.expressionEnabled) {
          names.push(prop.name);
        }
      }
    }
  } catch (e) {}

  return names;
}

function buildAnalysisSummary(comp: CompItem): string {
  var lines: string[] = [];
  var maxLayers = Math.min(comp.numLayers, 50);

  lines.push("## Cached Analysis");
  lines.push(
    "Comp: " +
      comp.name +
      " (" +
      comp.width +
      "x" +
      comp.height +
      " @ " +
      comp.frameRate +
      "fps, " +
      comp.duration.toFixed(2) +
      "s)"
  );
  lines.push("Layers analyzed: " + maxLayers + " of " + comp.numLayers);

  if (comp.selectedLayers && comp.selectedLayers.length > 0) {
    var selectedNames: string[] = [];
    for (var s = 0; s < comp.selectedLayers.length; s++) {
      selectedNames.push(comp.selectedLayers[s].name);
    }
    lines.push("Selected layers: " + selectedNames.join(", "));
  }

  lines.push("");
  lines.push("### Layer Notes");

  for (var i = 1; i <= maxLayers; i++) {
    var layer = comp.layer(i);
    var parts: string[] = [];
    parts.push(i + ". " + layer.name + " [" + getSafeLayerType(layer) + "]");

    if (layer.parent) {
      parts.push("parent=" + layer.parent.name);
    }

    if (!layer.enabled) {
      parts.push("disabled");
    }

    if (layer.locked) {
      parts.push("locked");
    }

    var effects = getEffectNames(layer);
    if (effects.length > 0) {
      parts.push("effects=" + effects.join(", "));
    }

    var expressions = getExpressionNames(layer);
    if (expressions.length > 0) {
      parts.push("expressions=" + expressions.join(", "));
    }

    lines.push("- " + parts.join(" | "));
  }

  return lines.join("\n");
}

export const getProjectInfo = () => {
  var projectName = "";
  var projectPath = "";

  if (app.project.file) {
    projectName = app.project.file.name.replace(/\.aep$/i, "");
    projectPath = app.project.file.parent.fsName;
  } else {
    projectName = "(unsaved project)";
    projectPath = "";
  }

  return {
    projectName: projectName,
    projectPath: projectPath,
    numItems: app.project.numItems,
  };
};

export const getActiveCompInfo = () => {
  var comp = getActiveComp();
  if (!comp) {
    return {
      error: "No active composition. Open a composition first.",
    };
  }

  var MAX_LAYERS = 30;

  function getLayerType(layer: Layer): string {
    return getSafeLayerType(layer);
  }

  var selectedLayers: { name: string; type: string; index: number }[] = [];
  if (comp.selectedLayers) {
    for (var i = 0; i < comp.selectedLayers.length; i++) {
      var layer = comp.selectedLayers[i];
      selectedLayers.push({
        name: layer.name,
        type: getLayerType(layer),
        index: layer.index,
      });
    }
  }

  // Cap layers to avoid exceeding CEP bridge return size limit (~10KB)
  var count = Math.min(comp.numLayers, MAX_LAYERS);
  var layers: { name: string; type: string; index: number }[] = [];
  for (var j = 1; j <= count; j++) {
    var l = comp.layer(j);
    layers.push({ name: l.name, type: getLayerType(l), index: l.index });
  }

  return {
    name: comp.name,
    width: comp.width,
    height: comp.height,
    fps: comp.frameRate,
    duration: comp.duration,
    numLayers: comp.numLayers,
    selectedLayers: selectedLayers,
    layers: layers,
  };
};

export const runAnalysisScript = () => {
  var comp = getActiveComp();
  if (!comp) {
    return { error: "No active composition. Open a composition first." };
  }

  try {
    lastAnalysisSummary = buildAnalysisSummary(comp);
    lastAnalysisUpdatedAt = formatTimestamp(new Date());
    return {
      success: true,
      message: "Analysis complete.",
      summary: lastAnalysisSummary,
      updatedAt: lastAnalysisUpdatedAt,
    };
  } catch (e: any) {
    return { error: "Analysis failed: " + e.toString() };
  }
};

export const getAnalysisSummary = () => {
  return {
    summary: lastAnalysisSummary,
    updatedAt: lastAnalysisUpdatedAt,
  };
};

export const runScriptFile = (filePath: string) => {
  var scriptFile = new File(filePath);
  if (!scriptFile.exists) {
    return { error: "Script not found: " + filePath };
  }

  try {
    app.beginUndoGroup("AI Chat: Run Script");
    //@ts-ignore
    var result = $.evalFile(scriptFile);
    app.endUndoGroup();
    return { success: true, message: "Script executed successfully.", result: String(result) };
  } catch (e: any) {
    try { app.endUndoGroup(); } catch (_) {}
    return { error: "Script failed: " + e.toString() };
  }
};

export const getProjectRoot = () => {
  var dir = getProjectDir();
  if (dir) {
    return dir.fsName || String(dir);
  }
  return "";
};

export const takeScreenshot = (timestamp: string) => {
  var comp = getActiveComp();
  if (!comp) {
    return { error: "No active composition found." };
  }

  var dir = getProjectDir();
  if (!dir) {
    return { error: "Save your project first." };
  }

  var screenshotsDir = new Folder(dir.fsName + "/screenshots");
  if (!screenshotsDir.exists) {
    screenshotsDir.create();
  }

  var fileName = "screenshot_" + timestamp + ".png";
  var file = new File(screenshotsDir.fsName + "/" + fileName);

  try {
    comp.saveFrameToPng(comp.time, file);
    return {
      success: true,
      path: file.fsName,
      fileName: fileName,
    };
  } catch (e: any) {
    return { error: "Failed to save screenshot: " + e.toString() };
  }
};
