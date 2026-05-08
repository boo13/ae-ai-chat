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

function truncateString(value: string, maxLength: number): string {
  if (!value) return "";
  if (value.length <= maxLength) return value;
  return value.slice(0, maxLength - 3) + "...";
}

function stringifyValue(value: any): string {
  if (value === null) return "null";
  if (typeof value === "undefined") return "undefined";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "string") return value;

  try {
    if (value instanceof Array) {
      return JSON.stringify(value);
    }
  } catch (e) {}

  try {
    if (typeof value.length === "number" && typeof value !== "string") {
      var items: any[] = [];
      var count = Math.min(value.length, 8);
      for (var i = 0; i < count; i++) {
        items.push(value[i]);
      }
      if (value.length > count) {
        items.push("...");
      }
      return JSON.stringify(items);
    }
  } catch (e) {}

  try {
    return JSON.stringify(value);
  } catch (e) {}

  try {
    return String(value);
  } catch (e) {}

  return "[unavailable]";
}

function getPropertyValueTypeName(prop: Property): string {
  try {
    switch (prop.propertyValueType) {
      case PropertyValueType.NO_VALUE:
        return "NO_VALUE";
      case PropertyValueType.ThreeD_SPATIAL:
        return "ThreeD_SPATIAL";
      case PropertyValueType.ThreeD:
        return "ThreeD";
      case PropertyValueType.TwoD_SPATIAL:
        return "TwoD_SPATIAL";
      case PropertyValueType.TwoD:
        return "TwoD";
      case PropertyValueType.OneD:
        return "OneD";
      case PropertyValueType.COLOR:
        return "COLOR";
      case PropertyValueType.CUSTOM_VALUE:
        return "CUSTOM_VALUE";
      case PropertyValueType.MARKER:
        return "MARKER";
      case PropertyValueType.LAYER_INDEX:
        return "LAYER_INDEX";
      case PropertyValueType.MASK_INDEX:
        return "MASK_INDEX";
      case PropertyValueType.SHAPE:
        return "SHAPE";
      case PropertyValueType.TEXT_DOCUMENT:
        return "TEXT_DOCUMENT";
    }
  } catch (e) {}

  try {
    return String(prop.propertyValueType);
  } catch (e) {}

  return "unknown";
}

function walkLeafProperties(root: any, visitor: (prop: Property) => boolean | void): boolean {
  if (!root) return false;

  try {
    if (root instanceof Property) {
      return visitor(root) === false;
    }
  } catch (e) {}

  var numProperties = 0;
  try {
    numProperties = root.numProperties || 0;
  } catch (e) {
    numProperties = 0;
  }

  for (var i = 1; i <= numProperties; i++) {
    var child = null;
    try {
      child = root.property(i);
    } catch (e) {
      child = null;
    }
    if (!child) continue;
    if (walkLeafProperties(child, visitor)) {
      return true;
    }
  }

  return false;
}

function getEffectPropertyDetails(effect: PropertyGroup, maxProperties: number) {
  var properties: { name: string; matchName: string; value: string }[] = [];

  walkLeafProperties(effect, function (prop) {
    if (properties.length >= maxProperties) {
      return false;
    }

    try {
      if (prop.propertyValueType === PropertyValueType.NO_VALUE) {
        return;
      }
    } catch (e) {
      return;
    }

    var value = "";
    try {
      value = stringifyValue(prop.value);
    } catch (e) {
      return;
    }

    properties.push({
      name: prop.name || "Unnamed Property",
      matchName: prop.matchName || "",
      value: truncateString(value, 120),
    });
  });

  return properties;
}

function getLayerKeyframedDetails(layer: Layer, maxProperties: number) {
  var keyframed: { name: string; numKeys: number; firstKeyTime: number; lastKeyTime: number }[] = [];

  for (var i = 1; i <= layer.numProperties; i++) {
    var group = null;
    try {
      group = layer.property(i);
    } catch (e) {
      group = null;
    }
    if (!group) continue;

    var shouldStop = walkLeafProperties(group, function (prop) {
      if (keyframed.length >= maxProperties) {
        return false;
      }

      var numKeys = 0;
      try {
        numKeys = prop.numKeys;
      } catch (e) {
        numKeys = 0;
      }
      if (!numKeys || numKeys < 1) {
        return;
      }

      var firstKeyTime = 0;
      var lastKeyTime = 0;
      try {
        firstKeyTime = prop.keyTime(1);
        lastKeyTime = prop.keyTime(numKeys);
      } catch (e) {
        return;
      }

      keyframed.push({
        name: prop.name || "Unnamed Property",
        numKeys: numKeys,
        firstKeyTime: firstKeyTime,
        lastKeyTime: lastKeyTime,
      });
    });

    if (shouldStop || keyframed.length >= maxProperties) {
      break;
    }
  }

  return keyframed;
}

function getLayerExpressionDetails(layer: Layer, maxProperties: number) {
  var expressions: { name: string; expression: string }[] = [];

  for (var i = 1; i <= layer.numProperties; i++) {
    var group = null;
    try {
      group = layer.property(i);
    } catch (e) {
      group = null;
    }
    if (!group) continue;

    var shouldStop = walkLeafProperties(group, function (prop) {
      if (expressions.length >= maxProperties) {
        return false;
      }

      try {
        if (!(prop as any).canSetExpression || !prop.expressionEnabled) {
          return;
        }
      } catch (e) {
        return;
      }

      var expression = "";
      try {
        expression = prop.expression || "";
      } catch (e) {
        expression = "";
      }
      if (!expression) {
        return;
      }

      expressions.push({
        name: prop.name || "Unnamed Property",
        expression: truncateString(expression, 200),
      });
    });

    if (shouldStop || expressions.length >= maxProperties) {
      break;
    }
  }

  return expressions;
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

  var expressionEngine = "";
  var bitsPerChannel = 8;
  var appVersion = "";
  try {
    //@ts-ignore
    expressionEngine = String(app.project.expressionEngine || "");
  } catch (_) {}
  try {
    //@ts-ignore
    bitsPerChannel = app.project.bitsPerChannel || 8;
  } catch (_) {}
  try {
    appVersion = String(app.version || "");
  } catch (_) {}

  return {
    projectName: projectName,
    projectPath: projectPath,
    numItems: app.project.numItems,
    expressionEngine: expressionEngine,
    bitsPerChannel: bitsPerChannel,
    appVersion: appVersion,
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

export function getProjectCompsList(): { label: string; compId: string }[] {
  var result: { label: string; compId: string }[] = [];

  for (var i = 1; i <= app.project.numItems; i++) {
    var item = app.project.item(i);
    if (item instanceof CompItem) {
      result.push({
        label: item.name,
        compId: String(item.id),
      });
    }
  }

  return result;
}

export function getSelectedLayersList(): { label: string; layerIndex: number; compName: string }[] {
  var result: { label: string; layerIndex: number; compName: string }[] = [];
  var comp = app.project.activeItem;
  if (!comp || !(comp instanceof CompItem)) return result;

  for (var i = 1; i <= comp.numLayers; i++) {
    var layer = comp.layer(i);
    if (layer.selected) {
      result.push({
        label: layer.name,
        layerIndex: i,
        compName: comp.name,
      });
    }
  }

  return result;
}

export function getEffectsOnSelectedLayer(): {
  label: string;
  matchName: string;
  effectIndex: number;
  layerIndex: number;
  layerName: string;
}[] {
  var result: {
    label: string;
    matchName: string;
    effectIndex: number;
    layerIndex: number;
    layerName: string;
  }[] = [];
  var comp = app.project.activeItem;
  if (!comp || !(comp instanceof CompItem)) return result;

  for (var i = 1; i <= comp.numLayers; i++) {
    var layer = comp.layer(i);
    if (!layer.selected) continue;

    var effects = layer.property("ADBE Effect Parade");
    if (!effects) continue;

    for (var j = 1; j <= effects.numProperties; j++) {
      var fx = effects.property(j);
      if (!fx) continue;

      result.push({
        label: fx.name,
        matchName: fx.matchName,
        effectIndex: j,
        layerIndex: i,
        layerName: layer.name,
      });
    }
  }

  return result;
}

export const getSelectedLayerDetails = () => {
  var comp = getActiveComp();
  if (!comp) {
    return { layers: [] };
  }

  var MAX_LAYERS = 3;
  var MAX_EFFECTS = 5;
  var MAX_EFFECT_PROPERTIES = 8;
  var MAX_KEYFRAMED_PROPERTIES = 20;
  var MAX_EXPRESSIONS = 10;
  var MAX_SERIALIZED_SIZE = 4096;

  var layers: {
    name: string;
    index: number;
    type: string;
    effects: {
      effectName: string;
      effectMatchName: string;
      properties: { name: string; matchName: string; value: string }[];
    }[];
    keyframed: { name: string; numKeys: number; firstKeyTime: number; lastKeyTime: number }[];
    expressions: { name: string; expression: string }[];
  }[] = [];

  var selectedCount = Math.min(comp.selectedLayers ? comp.selectedLayers.length : 0, MAX_LAYERS);
  for (var i = 0; i < selectedCount; i++) {
    var layer = comp.selectedLayers[i];
    if (!layer) continue;

    var effects: {
      effectName: string;
      effectMatchName: string;
      properties: { name: string; matchName: string; value: string }[];
    }[] = [];
    try {
      var effectParade = layer.property("ADBE Effect Parade");
      if (effectParade) {
        var effectCount = Math.min(effectParade.numProperties, MAX_EFFECTS);
        for (var j = 1; j <= effectCount; j++) {
          var effect = null;
          try {
            effect = effectParade.property(j);
          } catch (e) {
            effect = null;
          }
          if (!effect) continue;

          effects.push({
            effectName: effect.name || "Unnamed Effect",
            effectMatchName: effect.matchName || "",
            properties: getEffectPropertyDetails(effect as PropertyGroup, MAX_EFFECT_PROPERTIES),
          });
        }
      }
    } catch (e) {}

    layers.push({
      name: layer.name,
      index: layer.index,
      type: getSafeLayerType(layer),
      effects: effects,
      keyframed: getLayerKeyframedDetails(layer, MAX_KEYFRAMED_PROPERTIES),
      expressions: getLayerExpressionDetails(layer, MAX_EXPRESSIONS),
    });
  }

  var result = { layers: layers };
  while (result.layers.length > 0) {
    var serialized = "";
    try {
      serialized = JSON.stringify(result);
    } catch (e) {
      serialized = "";
    }
    if (!serialized || serialized.length <= MAX_SERIALIZED_SIZE) {
      break;
    }
    result.layers.pop();
  }

  return result;
};

export const getSelectedPropertyDetails = () => {
  var comp = getActiveComp();
  if (!comp) {
    return { properties: [] };
  }

  var MAX_PROPERTIES = 5;
  var MAX_TOTAL_KEYFRAMES = 50;

  var properties: any[] = [];
  var totalKeyframes = 0;
  var selectedCount = Math.min(comp.selectedProperties ? comp.selectedProperties.length : 0, MAX_PROPERTIES);

  for (var i = 0; i < selectedCount; i++) {
    var selected = comp.selectedProperties[i];
    if (!selected) continue;

    try {
      if (selected instanceof Property) {
        var currentValue = "[unavailable]";
        try {
          currentValue = truncateString(stringifyValue(selected.value), 240);
        } catch (e) {}

        var keyframes: { time: number; value: string }[] = [];
        var remainingKeyframes = MAX_TOTAL_KEYFRAMES - totalKeyframes;
        var numKeys = 0;
        try {
          numKeys = selected.numKeys || 0;
        } catch (e) {
          numKeys = 0;
        }

        var keyframeCount = Math.min(numKeys, remainingKeyframes);
        for (var j = 1; j <= keyframeCount; j++) {
          var keyTime = 0;
          var keyValue = "";
          try {
            keyTime = selected.keyTime(j);
            keyValue = truncateString(stringifyValue(selected.keyValue(j)), 240);
          } catch (e) {
            continue;
          }

          keyframes.push({
            time: keyTime,
            value: keyValue,
          });
          totalKeyframes++;
        }

        var expression = "";
        try {
          if ((selected as any).canSetExpression && selected.expressionEnabled) {
            expression = selected.expression || "";
          }
        } catch (e) {
          expression = "";
        }

        properties.push({
          kind: "property",
          name: selected.name || "Unnamed Property",
          matchName: selected.matchName || "",
          valueType: getPropertyValueTypeName(selected),
          currentValue: currentValue,
          keyframes: keyframes,
          expression: expression,
        });
        continue;
      }
    } catch (e) {}

    try {
      if (selected instanceof PropertyGroup) {
        var childNames: string[] = [];
        var childCount = 0;
        try {
          childCount = Math.min(selected.numProperties || 0, 20);
        } catch (e) {
          childCount = 0;
        }
        for (var k = 1; k <= childCount; k++) {
          var child = null;
          try {
            child = selected.property(k);
          } catch (e) {
            child = null;
          }
          if (child && child.name) {
            childNames.push(child.name);
          }
        }

        properties.push({
          kind: "group",
          name: selected.name || "Unnamed Group",
          matchName: selected.matchName || "",
          childProperties: childNames,
        });
      }
    } catch (e) {}
  }

  return { properties: properties };
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
    //@ts-ignore
    var exprErrors = $.global.__aiExprErrors || [];
    //@ts-ignore
    $.global.__aiExprErrors = [];
    return {
      success: exprErrors.length === 0,
      message: exprErrors.length === 0 ? "Script executed successfully." : "Script ran but expression errors occurred.",
      result: String(result),
      expressionErrors: exprErrors,
    };
  } catch (e: any) {
    try { app.endUndoGroup(); } catch (_) {}
    //@ts-ignore
    var catchExprErrors = $.global.__aiExprErrors || [];
    //@ts-ignore
    $.global.__aiExprErrors = [];
    return {
      error: "Script failed: " + e.toString(),
      errorLine: e.line || null,
      errorName: e.name || null,
      expressionErrors: catchExprErrors,
    };
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
