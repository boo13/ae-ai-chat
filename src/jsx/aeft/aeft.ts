import { getActiveComp, getProjectDir } from "./aeft-utils";
import {
  diffRunSnapshots,
  type RunLayerSnapshot,
  type RunSnapshot,
} from "../../shared/run-diff";
import { GLOBAL_ENUMS } from "../../js/lib/knowledge/data/global-enums";

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

function getEffectPropertyDetails(
  effect: PropertyGroup,
  maxProperties: number,
  maxValueChars?: number
) {
  var valueChars = maxValueChars || 120;
  var properties: { name: string; matchName: string; value: string; expression?: string }[] = [];

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

    var detail: { name: string; matchName: string; value: string; expression?: string } = {
      name: prop.name || "Unnamed Property",
      matchName: prop.matchName || "",
      value: truncateString(value, valueChars),
    };
    try {
      if ((prop as any).canSetExpression && prop.expressionEnabled && prop.expression) {
        detail.expression = truncateString(prop.expression, 1000);
      }
    } catch (e) {}
    properties.push(detail);
  });

  return properties;
}

function getLayerKeyframedDetails(layer: Layer, maxProperties: number) {
  var keyframed: {
    name: string;
    numKeys: number;
    firstKeyTime: number;
    lastKeyTime: number;
    interpolation: string;
    eased: boolean;
  }[] = [];

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
      var interpolation = "linear";
      var eased = false;
      try {
        firstKeyTime = prop.keyTime(1);
        lastKeyTime = prop.keyTime(numKeys);
      } catch (e) {
        return;
      }

      for (var keyIndex = 1; keyIndex <= numKeys; keyIndex++) {
        try {
          var inType = prop.keyInInterpolationType(keyIndex);
          var outType = prop.keyOutInterpolationType(keyIndex);
          if (
            inType === KeyframeInterpolationType.HOLD ||
            outType === KeyframeInterpolationType.HOLD
          ) {
            interpolation = "hold";
          } else if (
            interpolation !== "hold" &&
            (inType === KeyframeInterpolationType.BEZIER ||
              outType === KeyframeInterpolationType.BEZIER)
          ) {
            interpolation = "bezier";
            eased = true;
          }
        } catch (e) {}
      }

      keyframed.push({
        name: prop.name || "Unnamed Property",
        numKeys: numKeys,
        firstKeyTime: firstKeyTime,
        lastKeyTime: lastKeyTime,
        interpolation: interpolation,
        eased: eased,
      });
    });

    if (shouldStop || keyframed.length >= maxProperties) {
      break;
    }
  }

  return keyframed;
}

function getLayerExpressionDetails(
  layer: Layer,
  maxProperties: number,
  maxExprChars?: number
) {
  var exprChars = maxExprChars || 200;
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
        expression: truncateString(expression, exprChars),
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
  var expressionInventory: string[] = [];

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
      var layerExpressionCount = 0;
      walkLeafProperties(layer, function (prop) {
        if (layerExpressionCount >= 30) return false;
        try {
          if (!(prop as any).canSetExpression || !prop.expressionEnabled || !prop.expression) return;
          expressionInventory.push(
            layer.index + ". " + layer.name + " > " + prop.name +
            (prop.expressionError ? " | ERROR: " + truncateString(prop.expressionError, 240) : "") +
            " | " + truncateString(prop.expression.replace(/[\r\n]+/g, " "), 300)
          );
          layerExpressionCount++;
        } catch (e) {}
      });
    }

    lines.push("- " + parts.join(" | "));
  }

  if (expressionInventory.length > 0) {
    lines.push("");
    lines.push("### Expression Inventory");
    for (var inventoryIndex = 0; inventoryIndex < expressionInventory.length; inventoryIndex++) {
      lines.push("- " + expressionInventory[inventoryIndex]);
    }
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

interface LayerDetailLimits {
  maxEffects: number;
  maxEffectProperties: number;
  maxValueChars: number;
  maxKeyframed: number;
  maxExpressions: number;
  maxExprChars: number;
}

interface LayerDetail {
  name: string;
  index: number;
  type: string;
  effects: {
    effectName: string;
    effectMatchName: string;
    properties: { name: string; matchName: string; value: string }[];
  }[];
  keyframed: {
    name: string;
    numKeys: number;
    firstKeyTime: number;
    lastKeyTime: number;
    interpolation: string;
    eased: boolean;
  }[];
  expressions: { name: string; expression: string }[];
  transform?: string;
  text?: string;
  masks?: string;
  source?: string;
}

function getTransformSummary(layer: Layer): string {
  var transform = null;
  try { transform = layer.property("ADBE Transform Group"); } catch (e) {}
  if (!transform) return "";
  var parts: string[] = [];
  for (var i = 0; i < 5; i++) {
    var matchNames = ["ADBE Anchor Point", "ADBE Position", "ADBE Scale", "ADBE Rotate Z", "ADBE Opacity"];
    var labels = ["anchor", "position", "scale", "rotation", "opacity"];
    try {
      var prop = transform.property(matchNames[i]);
      if (prop && prop instanceof Property) parts.push(labels[i] + "=" + stringifyValue(prop.value));
    } catch (e) {}
  }
  try {
    if (!transform.property("ADBE Position")) {
      var split: string[] = [];
      var splitNames = ["ADBE Position_0", "ADBE Position_1", "ADBE Position_2"];
      for (var splitIndex = 0; splitIndex < splitNames.length; splitIndex++) {
        var splitProp = transform.property(splitNames[splitIndex]);
        if (splitProp && splitProp instanceof Property) split.push(stringifyValue(splitProp.value));
      }
      if (split.length) parts.push("position=[" + split.join(",") + "]");
    }
  } catch (e) {}
  return parts.join(", ");
}

function getJustificationLabel(value: any): string {
  var discovered = getDiscoveredEnumLabel("ParagraphJustification", value);
  if (discovered) return discovered.replace(/_/g, "-");
  try {
    if (value === ParagraphJustification.LEFT_JUSTIFY) return "left";
    if (value === ParagraphJustification.RIGHT_JUSTIFY) return "right";
    if (value === ParagraphJustification.CENTER_JUSTIFY) return "center";
    if (value === ParagraphJustification.FULL_JUSTIFY_LASTLINE_LEFT) return "justify-left";
  } catch (e) {}
  return String(value);
}

function getTextSummary(layer: Layer): string {
  if (!(layer instanceof TextLayer)) return "";
  try {
    var sourceText = layer.property("ADBE Text Properties").property("ADBE Text Document");
    if (!sourceText || !(sourceText instanceof Property)) return "";
    var doc = sourceText.value as TextDocument;
    var parts = [
      "font=" + String(doc.font || ""),
      "size=" + String(doc.fontSize),
      "justify=" + getJustificationLabel(doc.justification),
    ];
    try {
      if (doc.applyFill) parts.push("fill=" + stringifyValue(doc.fillColor));
    } catch (e) {}
    parts.push('text="' + truncateString(String(doc.text || "").replace(/[\r\n]+/g, " "), 60) + '"');
    return parts.join(", ");
  } catch (e) {}
  return "";
}

function getMaskModeLabel(value: any): string {
  var discovered = getDiscoveredEnumLabel("MaskMode", value);
  if (discovered) return discovered.replace(/_/g, "-");
  try {
    if (value === MaskMode.ADD) return "add";
    if (value === MaskMode.SUBTRACT) return "subtract";
    if (value === MaskMode.INTERSECT) return "intersect";
    if (value === MaskMode.NONE) return "none";
  } catch (e) {}
  return String(value);
}

function getMasksSummary(layer: Layer): string {
  try {
    var masks = layer.property("ADBE Mask Parade");
    if (!masks || masks.numProperties < 1) return "";
    var parts: string[] = [];
    var count = Math.min(masks.numProperties, 5);
    for (var i = 1; i <= count; i++) {
      var mask = masks.property(i) as MaskPropertyGroup;
      parts.push(mask.name + " (" + getMaskModeLabel(mask.maskMode) + ")");
    }
    if (masks.numProperties > count) parts.push("+" + (masks.numProperties - count) + " more");
    return parts.join(", ");
  } catch (e) {}
  return "";
}

function getSourceSummary(layer: Layer): string {
  if (!(layer instanceof AVLayer)) return "";
  try {
    if (!layer.source) return "";
    var source = layer.source;
    var parts = [source.name];
    try { if ((source as AVItem).width) parts.push((source as AVItem).width + "x" + (source as AVItem).height); } catch (e) {}
    try { if ((source as AVItem).duration) parts.push((source as AVItem).duration.toFixed(2) + "s"); } catch (e) {}
    return parts.join(" | ");
  } catch (e) {}
  return "";
}

function buildLayerDetail(layer: Layer, limits: LayerDetailLimits): LayerDetail {
  var effects: {
    effectName: string;
    effectMatchName: string;
    properties: { name: string; matchName: string; value: string }[];
  }[] = [];
  try {
    var effectParade = layer.property("ADBE Effect Parade");
    if (effectParade) {
      var effectCount = Math.min(effectParade.numProperties, limits.maxEffects);
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
          properties: getEffectPropertyDetails(
            effect as PropertyGroup,
            limits.maxEffectProperties,
            limits.maxValueChars
          ),
        });
      }
    }
  } catch (e) {}

  var detail: LayerDetail = {
    name: layer.name,
    index: layer.index,
    type: getSafeLayerType(layer),
    effects: effects,
    keyframed: getLayerKeyframedDetails(layer, limits.maxKeyframed),
    expressions: getLayerExpressionDetails(layer, limits.maxExpressions, limits.maxExprChars),
  };
  var transform = getTransformSummary(layer);
  var text = getTextSummary(layer);
  var masks = getMasksSummary(layer);
  var source = getSourceSummary(layer);
  if (transform) detail.transform = transform;
  if (text) detail.text = text;
  if (masks) detail.masks = masks;
  if (source) detail.source = source;
  return detail;
}

function buildSelectedLayerDetailsData(
  maxLayers: number,
  limits: LayerDetailLimits,
  maxSerializedSize: number
) {
  var comp = getActiveComp();
  if (!comp) {
    return { layers: [] as LayerDetail[] };
  }

  var layers: LayerDetail[] = [];
  var selectedCount = Math.min(comp.selectedLayers ? comp.selectedLayers.length : 0, maxLayers);
  for (var i = 0; i < selectedCount; i++) {
    var layer = comp.selectedLayers[i];
    if (!layer) continue;
    layers.push(buildLayerDetail(layer, limits));
  }

  var result = { layers: layers };
  while (maxSerializedSize > 0 && result.layers.length > 0) {
    var serialized = "";
    try {
      serialized = JSON.stringify(result);
    } catch (e) {
      serialized = "";
    }
    if (!serialized || serialized.length <= maxSerializedSize) {
      break;
    }
    result.layers.pop();
  }

  return result;
}

export const getSelectedLayerDetails = () => {
  return buildSelectedLayerDetailsData(
    3,
    {
      maxEffects: 5,
      maxEffectProperties: 8,
      maxValueChars: 120,
      maxKeyframed: 20,
      maxExpressions: 10,
      maxExprChars: 200,
    },
    4096
  );
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

function getLayerParentName(layer: Layer): string {
  try {
    if (layer.parent) return layer.parent.name;
  } catch (e) {}
  return "";
}

function countLayerEffects(layer: Layer): number {
  try {
    var effects = layer.property("ADBE Effect Parade");
    return effects ? effects.numProperties : 0;
  } catch (e) {}
  return 0;
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
  blend?: string;
  matte?: string;
  adjustment?: boolean;
}

function getBlendingModeLabel(value: any): string {
  var discovered = getDiscoveredEnumLabel("BlendingMode", value);
  if (discovered) return discovered;
  try {
    if (value === BlendingMode.NORMAL) return "normal";
    if (value === BlendingMode.ADD) return "add";
    if (value === BlendingMode.MULTIPLY) return "multiply";
    if (value === BlendingMode.SCREEN) return "screen";
    if (value === BlendingMode.OVERLAY) return "overlay";
    if (value === BlendingMode.DIFFERENCE) return "difference";
  } catch (e) {}
  return String(value);
}

function getTrackMatteLabel(value: any): string {
  var discovered = getDiscoveredEnumLabel("TrackMatteType", value);
  if (discovered === "no track matte") return "";
  if (discovered) return discovered.replace(/_/g, "-");
  try {
    if (value === TrackMatteType.NO_TRACK_MATTE) return "";
    if (value === TrackMatteType.ALPHA) return "alpha";
    if (value === TrackMatteType.ALPHA_INVERTED) return "alpha-inverted";
    if (value === TrackMatteType.LUMA) return "luma";
    if (value === TrackMatteType.LUMA_INVERTED) return "luma-inverted";
  } catch (e) {}
  return String(value);
}

function getDiscoveredEnumLabel(groupName: string, value: any): string {
  var group = GLOBAL_ENUMS[groupName];
  if (!group) return "";
  for (var label in group) {
    if (String(group[label]) === String(value) || Number(group[label]) === Number(value)) {
      return label.toLowerCase().replace(/_/g, " ");
    }
  }
  return "";
}

function buildLayerStackRow(layer: Layer): LayerStackRow {
  var row: LayerStackRow = {
    index: layer.index,
    name: layer.name,
    type: getSafeLayerType(layer),
  };
  try {
    row.inPoint = layer.inPoint;
    row.outPoint = layer.outPoint;
  } catch (e) {}
  try {
    if (!layer.enabled) row.disabled = true;
  } catch (e) {}
  try {
    if (layer.locked) row.locked = true;
  } catch (e) {}
  try {
    if ((layer as any).threeDLayer) row.threeD = true;
  } catch (e) {}
  var parentName = getLayerParentName(layer);
  if (parentName) row.parent = parentName;
  var numEffects = countLayerEffects(layer);
  if (numEffects > 0) row.numEffects = numEffects;
  try {
    var blend = getBlendingModeLabel((layer as AVLayer).blendingMode);
    if (blend && blend !== "normal") row.blend = blend;
  } catch (e) {}
  try {
    var matte = getTrackMatteLabel((layer as AVLayer).trackMatteType);
    if (matte) row.matte = matte;
  } catch (e) {}
  try {
    if ((layer as AVLayer).adjustmentLayer) row.adjustment = true;
  } catch (e) {}
  return row;
}

function buildCompMarkers(comp: CompItem, maxMarkers: number) {
  var markers: { time: number; comment: string }[] = [];
  try {
    var markerProp = comp.markerProperty;
    if (!markerProp) return markers;
    var count = Math.min(markerProp.numKeys, maxMarkers);
    for (var i = 1; i <= count; i++) {
      var comment = "";
      try {
        comment = (markerProp.keyValue(i) as MarkerValue).comment || "";
      } catch (e) {}
      markers.push({
        time: markerProp.keyTime(i),
        comment: truncateString(comment, 80),
      });
    }
  } catch (e) {}
  return markers;
}

function buildCompSnapshot(comp: CompItem, maxLayers: number) {
  var selectedLayers: { name: string; type: string; index: number }[] = [];
  try {
    if (comp.selectedLayers) {
      for (var s = 0; s < comp.selectedLayers.length; s++) {
        var sel = comp.selectedLayers[s];
        selectedLayers.push({
          name: sel.name,
          type: getSafeLayerType(sel),
          index: sel.index,
        });
      }
    }
  } catch (e) {}

  var layers: LayerStackRow[] = [];
  var count = Math.min(comp.numLayers, maxLayers);
  for (var j = 1; j <= count; j++) {
    layers.push(buildLayerStackRow(comp.layer(j)));
  }

  var time = 0;
  var workAreaStart = 0;
  var workAreaDuration = 0;
  try {
    time = comp.time;
  } catch (e) {}
  try {
    workAreaStart = comp.workAreaStart;
    workAreaDuration = comp.workAreaDuration;
  } catch (e) {}

  return {
    name: comp.name,
    width: comp.width,
    height: comp.height,
    fps: comp.frameRate,
    duration: comp.duration,
    time: time,
    workAreaStart: workAreaStart,
    workAreaDuration: workAreaDuration,
    markers: buildCompMarkers(comp, 20),
    numLayers: comp.numLayers,
    selectedLayers: selectedLayers,
    layers: layers,
  };
}

interface ProjectItemRow {
  name: string;
  type: string;
  size?: string;
  folder?: string;
}

function buildProjectItems(maxItems: number) {
  var items: ProjectItemRow[] = [];
  for (var i = 1; i <= app.project.numItems && items.length < maxItems; i++) {
    var item = app.project.item(i);
    var row: ProjectItemRow = { name: item.name, type: "item" };
    try {
      if (item instanceof CompItem) {
        row.type = "comp";
        row.size = item.width + "x" + item.height;
      } else if (item instanceof FolderItem) {
        row.type = "folder";
      } else if (item instanceof FootageItem) {
        row.type = "footage";
        try {
          if (item.mainSource instanceof SolidSource) row.type = "solid";
        } catch (e) {}
        try {
          if (!item.hasVideo && item.hasAudio) row.type = "audio";
        } catch (e) {}
        try {
          if (item.width) row.size = item.width + "x" + item.height;
        } catch (e) {}
      }
    } catch (e) {}
    try {
      var parentFolder = (item as AVItem).parentFolder;
      if (parentFolder && parentFolder.name !== "Root") {
        row.folder = parentFolder.name;
      }
    } catch (e) {}
    items.push(row);
  }
  return { total: app.project.numItems, items: items };
}

var SNAPSHOT_LAYER_LIMITS: LayerDetailLimits = {
  maxEffects: 10,
  maxEffectProperties: 16,
  maxValueChars: 300,
  maxKeyframed: 24,
  maxExpressions: 12,
  maxExprChars: 2000,
};

// Collects the full per-message context in one call and hands it to the
// panel through a temp file, bypassing the ~10KB CEP bridge return limit.
export const getContextSnapshot = () => {
  var data: any = {
    project: null,
    items: null,
    comp: null,
    analysis: { summary: lastAnalysisSummary, updatedAt: lastAnalysisUpdatedAt },
    selectedLayers: { layers: [] },
    selectedProperties: { properties: [] },
  };

  try {
    data.project = getProjectInfo();
  } catch (e) {}

  try {
    data.items = buildProjectItems(40);
  } catch (e) {}

  try {
    var comp = getActiveComp();
    if (comp) data.comp = buildCompSnapshot(comp, 60);
  } catch (e) {}

  try {
    data.selectedLayers = buildSelectedLayerDetailsData(5, SNAPSHOT_LAYER_LIMITS, 0);
  } catch (e) {}

  try {
    data.selectedProperties = getSelectedPropertyDetails();
  } catch (e) {}

  var serialized = "";
  try {
    serialized = JSON.stringify(data);
  } catch (e) {
    return { error: "Failed to serialize context: " + e.toString() };
  }

  try {
    var file = new File(Folder.temp.fsName + "/ae-ai-chat-context.json");
    file.encoding = "UTF-8";
    if (file.open("w")) {
      file.write(serialized);
      file.close();
      return { file: file.fsName };
    }
  } catch (e) {}

  // Fallback: return inline, pruning the biggest arrays to fit the bridge.
  while (serialized.length > 8192) {
    var pruned = false;
    if (data.selectedLayers && data.selectedLayers.layers.length > 0) {
      data.selectedLayers.layers.pop();
      pruned = true;
    } else if (data.comp && data.comp.layers.length > 0) {
      data.comp.layers.pop();
      pruned = true;
    } else if (data.items && data.items.items.length > 0) {
      data.items.items.pop();
      pruned = true;
    } else if (data.analysis && data.analysis.summary) {
      data.analysis.summary = "";
      pruned = true;
    }
    if (!pruned) break;
    try {
      serialized = JSON.stringify(data);
    } catch (e) {
      break;
    }
  }
  return { inline: data };
};

function findCompById(compId: string): CompItem | null {
  var id = parseInt(compId, 10);
  if (!id) return null;
  for (var i = 1; i <= app.project.numItems; i++) {
    var item = app.project.item(i);
    if (item instanceof CompItem && item.id === id) return item;
  }
  return null;
}

function findCompByName(name: string): CompItem | null {
  if (!name) return null;
  for (var i = 1; i <= app.project.numItems; i++) {
    var item = app.project.item(i);
    if (item instanceof CompItem && item.name === name) return item;
  }
  return null;
}

function findLayerByIndexOrName(comp: CompItem, index: number, name: string): Layer | null {
  var layer: Layer | null = null;
  if (index >= 1 && index <= comp.numLayers) {
    layer = comp.layer(index);
  }
  if (layer && layer.name === name) return layer;
  // Index may have shifted since the chip was pinned - fall back to name.
  for (var i = 1; i <= comp.numLayers; i++) {
    if (comp.layer(i).name === name) return comp.layer(i);
  }
  return layer;
}

var PIN_LAYER_LIMITS: LayerDetailLimits = {
  maxEffects: 8,
  maxEffectProperties: 12,
  maxValueChars: 300,
  maxKeyframed: 16,
  maxExpressions: 8,
  maxExprChars: 1200,
};

interface PinInput {
  type: string;
  label: string;
  compId?: string;
  layerIndex?: number;
  compName?: string;
  matchName?: string;
  effectIndex?: number;
  layerName?: string;
}

function resolveCompPin(pin: PinInput) {
  var comp = findCompById(pin.compId || "") || findCompByName(pin.label);
  if (!comp) {
    return { pinType: "comp", label: pin.label, error: "Comp not found in project." };
  }
  var detail: any = buildCompSnapshot(comp, 30);
  detail.pinType = "comp";
  detail.label = pin.label;
  return detail;
}

function resolveLayerPin(pin: PinInput) {
  var comp = findCompByName(pin.compName || "") || getActiveComp();
  if (!comp) {
    return { pinType: "layer", label: pin.label, error: "Comp not found: " + pin.compName };
  }
  var layer = findLayerByIndexOrName(comp, pin.layerIndex || 0, pin.label);
  if (!layer) {
    return {
      pinType: "layer",
      label: pin.label,
      error: "Layer not found in comp \"" + comp.name + "\".",
    };
  }
  return {
    pinType: "layer",
    label: pin.label,
    compName: comp.name,
    layer: buildLayerDetail(layer, PIN_LAYER_LIMITS),
  };
}

function resolveEffectPin(pin: PinInput) {
  var comp = getActiveComp();
  if (!comp) {
    return { pinType: "effect", label: pin.label, error: "No active comp." };
  }
  var layer = findLayerByIndexOrName(comp, pin.layerIndex || 0, pin.layerName || "");
  if (!layer) {
    return {
      pinType: "effect",
      label: pin.label,
      error: "Layer \"" + pin.layerName + "\" not found in comp \"" + comp.name + "\".",
    };
  }
  var effects = layer.property("ADBE Effect Parade");
  if (!effects) {
    return {
      pinType: "effect",
      label: pin.label,
      error: "Layer \"" + layer.name + "\" has no effects.",
    };
  }
  var fx = null;
  var effectIndex = pin.effectIndex || 0;
  if (effectIndex >= 1 && effectIndex <= effects.numProperties) {
    fx = effects.property(effectIndex);
  }
  if (!fx || fx.matchName !== pin.matchName) {
    // Effect order may have changed - fall back to matchName lookup.
    for (var j = 1; j <= effects.numProperties; j++) {
      var candidate = effects.property(j);
      if (candidate && candidate.matchName === pin.matchName) {
        fx = candidate;
        effectIndex = j;
        break;
      }
    }
  }
  if (!fx) {
    return {
      pinType: "effect",
      label: pin.label,
      error: "Effect not found on layer \"" + layer.name + "\".",
    };
  }
  var enabled = true;
  try {
    enabled = (fx as PropertyGroup).enabled;
  } catch (e) {}
  return {
    pinType: "effect",
    label: pin.label,
    layerName: layer.name,
    layerIndex: layer.index,
    effectIndex: effectIndex,
    effectName: fx.name,
    effectMatchName: fx.matchName,
    enabled: enabled,
    properties: getEffectPropertyDetails(fx as PropertyGroup, 24, 300),
  };
}

// Resolves pinned context chips to actual AE state so the model sees real
// data (layer stacks, property values) instead of bare labels.
export const getPinnedContextDetails = (pins: PinInput[]) => {
  var items: any[] = [];
  if (!pins || !pins.length) return { items: items };

  var count = Math.min(pins.length, 6);
  for (var i = 0; i < count; i++) {
    var pin = pins[i];
    if (!pin || !pin.type) continue;
    try {
      if (pin.type === "comp") {
        items.push(resolveCompPin(pin));
      } else if (pin.type === "layer") {
        items.push(resolveLayerPin(pin));
      } else if (pin.type === "effect") {
        items.push(resolveEffectPin(pin));
      }
    } catch (e: any) {
      items.push({
        pinType: pin.type,
        label: pin.label,
        error: "Could not resolve: " + e.toString(),
      });
    }
  }

  var result = { items: items };
  while (result.items.length > 0) {
    var serialized = "";
    try {
      serialized = JSON.stringify(result);
    } catch (e) {
      serialized = "";
    }
    if (!serialized || serialized.length <= 8192) break;
    result.items.pop();
  }
  return result;
};

function fnv1a(value: string): string {
  var hash = 2166136261;
  for (var i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16);
}

function getTransformSnapshot(layer: Layer): { [name: string]: string } {
  var values: { [name: string]: string } = {};
  var group = null;
  try { group = layer.property("ADBE Transform Group"); } catch (e) {}
  if (!group) return values;
  var matchNames = ["ADBE Anchor Point", "ADBE Position", "ADBE Scale", "ADBE Rotate Z", "ADBE Opacity"];
  var names = ["anchor", "position", "scale", "rotation", "opacity"];
  for (var i = 0; i < matchNames.length; i++) {
    try {
      var prop = group.property(matchNames[i]);
      if (prop && prop instanceof Property) values[names[i]] = stringifyValue(prop.value);
    } catch (e) {}
  }
  if (typeof values.position === "undefined") {
    var split: string[] = [];
    var splitNames = ["ADBE Position_0", "ADBE Position_1", "ADBE Position_2"];
    for (var splitIndex = 0; splitIndex < splitNames.length; splitIndex++) {
      try {
        var splitProp = group.property(splitNames[splitIndex]);
        if (splitProp && splitProp instanceof Property) split.push(stringifyValue(splitProp.value));
      } catch (e) {}
    }
    if (split.length) values.position = "[" + split.join(",") + "]";
  }
  return values;
}

function getEffectDigest(layer: Layer): string {
  var parts: string[] = [];
  try {
    var effects = layer.property("ADBE Effect Parade");
    if (!effects) return fnv1a("");
    for (var i = 1; i <= effects.numProperties; i++) {
      var effect = effects.property(i);
      if (!effect) continue;
      parts.push(effect.matchName || effect.name || "");
      walkLeafProperties(effect, function (prop) {
        try {
          parts.push((prop.matchName || prop.name || "") + "=" + truncateString(stringifyValue(prop.value), 240));
        } catch (e) {}
      });
    }
  } catch (e) {}
  return fnv1a(parts.join("|"));
}

function getAnimationDigest(layer: Layer) {
  var expressionParts: string[] = [];
  var expressionCount = 0;
  var keyframes = 0;
  walkLeafProperties(layer, function (prop) {
    try { keyframes += prop.numKeys || 0; } catch (e) {}
    try {
      if ((prop as any).canSetExpression && prop.expressionEnabled && prop.expression) {
        expressionCount++;
        expressionParts.push((prop.matchName || prop.name || "") + "=" + prop.expression);
      }
    } catch (e) {}
  });
  return {
    expressionDigest: fnv1a(expressionParts.join("|")),
    expressionCount: expressionCount,
    keyframes: keyframes,
  };
}

function buildRunSnapshot(): RunSnapshot | null {
  var comp = getActiveComp();
  if (!comp) return null;
  var deep = comp.numLayers <= 60;
  var layers: RunLayerSnapshot[] = [];
  for (var i = 1; i <= comp.numLayers; i++) {
    var layer = comp.layer(i);
    var item: RunLayerSnapshot = {
      name: layer.name,
      effects: countLayerEffects(layer),
    };
    if (deep) {
      var animation = getAnimationDigest(layer);
      item.effectDigest = getEffectDigest(layer);
      item.transform = getTransformSnapshot(layer);
      item.expressionDigest = animation.expressionDigest;
      item.expressionCount = animation.expressionCount;
      item.keyframes = animation.keyframes;
      try { item.inPoint = layer.inPoint; } catch (e) {}
      try { item.outPoint = layer.outPoint; } catch (e) {}
    }
    layers.push(item);
  }
  return {
    comp: comp.name,
    numLayers: comp.numLayers,
    duration: comp.duration,
    workAreaStart: comp.workAreaStart,
    workAreaDuration: comp.workAreaDuration,
    deep: deep,
    layers: layers,
  };
}

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

  var before: RunSnapshot | null = null;
  try {
    before = buildRunSnapshot();
  } catch (_) {}

  function captureStateDiff(): string[] {
    var after: RunSnapshot | null = null;
    try {
      after = buildRunSnapshot();
    } catch (_) {}
    try {
      return diffRunSnapshots(before, after);
    } catch (_) {}
    return [];
  }

  try {
    app.beginUndoGroup("AI Chat: Run Script");
    //@ts-ignore
    $.global.__aiExprErrors = [];
    //@ts-ignore
    $.global.__aiExprSet = [];
    //@ts-ignore
    var result = $.evalFile(scriptFile);
    app.endUndoGroup();
    //@ts-ignore
    var exprErrors = $.global.__aiExprErrors || [];
    //@ts-ignore
    var expressionsSet = $.global.__aiExprSet || [];
    //@ts-ignore
    $.global.__aiExprErrors = [];
    //@ts-ignore
    $.global.__aiExprSet = [];
    return {
      success: exprErrors.length === 0,
      message: exprErrors.length === 0 ? "Script executed successfully." : "Script ran but expression errors occurred.",
      result: String(result),
      expressionErrors: exprErrors,
      expressionsSet: expressionsSet,
      stateDiff: captureStateDiff(),
    };
  } catch (e: any) {
    try { app.endUndoGroup(); } catch (_) {}
    //@ts-ignore
    var catchExprErrors = $.global.__aiExprErrors || [];
    //@ts-ignore
    var catchExpressionsSet = $.global.__aiExprSet || [];
    //@ts-ignore
    $.global.__aiExprErrors = [];
    //@ts-ignore
    $.global.__aiExprSet = [];
    return {
      error: "Script failed: " + e.toString(),
      errorLine: e.line || null,
      errorName: e.name || null,
      expressionErrors: catchExprErrors,
      expressionsSet: catchExpressionsSet,
      stateDiff: captureStateDiff(),
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
