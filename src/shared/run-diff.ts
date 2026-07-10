export interface RunLayerSnapshot {
  name: string;
  effects: number;
  effectDigest?: string;
  transform?: Record<string, string>;
  expressionDigest?: string;
  expressionCount?: number;
  keyframes?: number;
  inPoint?: number;
  outPoint?: number;
}

export interface RunSnapshot {
  comp: string;
  numLayers: number;
  duration?: number;
  workAreaStart?: number;
  workAreaDuration?: number;
  deep: boolean;
  layers: RunLayerSnapshot[];
}

function joinNames(names: string[], maxNames: number): string {
  var shown = names.length > maxNames ? names.slice(0, maxNames) : names;
  var joined = shown.join(", ");
  if (names.length > maxNames) joined += ", and " + (names.length - maxNames) + " more";
  return joined;
}

function changedTransformNames(
  before: Record<string, string> | undefined,
  after: Record<string, string> | undefined
): string[] {
  var names: string[] = [];
  if (!before || !after) return names;
  for (var name in before) {
    if (!Object.prototype.hasOwnProperty.call(before, name)) continue;
    if (before[name] !== after[name]) names.push(name);
  }
  for (var afterName in after) {
    if (!Object.prototype.hasOwnProperty.call(after, afterName)) continue;
    if (typeof before[afterName] === "undefined") names.push(afterName);
  }
  return names;
}

function numberChanged(a: number | undefined, b: number | undefined): boolean {
  return typeof a === "number" && typeof b === "number" && Math.abs(a - b) > 0.000001;
}

function push(notes: string[], note: string): void {
  if (notes.length < 12) notes.push(note);
}

export function diffRunSnapshots(
  before: RunSnapshot | null,
  after: RunSnapshot | null
): string[] {
  var notes: string[] = [];
  if (!before && !after) return notes;
  if (!before && after) return ["Active comp after run: " + after.comp];
  if (before && !after) return ["No active comp after the run."];
  if (!before || !after) return notes;
  if (before.comp !== after.comp) {
    return ['Active comp changed: "' + before.comp + '" -> "' + after.comp + '"'];
  }

  var buckets: { [name: string]: RunLayerSnapshot[] } = {};
  var i: number;
  for (i = 0; i < before.layers.length; i++) {
    var beforeLayer = before.layers[i];
    var bucketKey = "k:" + beforeLayer.name;
    if (!buckets[bucketKey]) buckets[bucketKey] = [];
    buckets[bucketKey].push(beforeLayer);
  }

  var added: string[] = [];
  for (i = 0; i < after.layers.length; i++) {
    var afterLayer = after.layers[i];
    var afterKey = "k:" + afterLayer.name;
    var bucket = buckets[afterKey];
    if (!bucket || bucket.length === 0) {
      added.push(afterLayer.name);
      continue;
    }
    var matched = bucket.shift() as RunLayerSnapshot;

    if (matched.effects !== afterLayer.effects) {
      push(notes, 'Effects on "' + afterLayer.name + '": ' + matched.effects + " -> " + afterLayer.effects);
    } else if (
      matched.effectDigest &&
      afterLayer.effectDigest &&
      matched.effectDigest !== afterLayer.effectDigest
    ) {
      push(notes, 'Effect parameters changed on "' + afterLayer.name + '"');
    }

    var transformNames = changedTransformNames(matched.transform, afterLayer.transform);
    if (transformNames.length > 0) {
      push(notes, 'Transform changed on "' + afterLayer.name + '" (' + transformNames.join(", ") + ')');
    }
    if (
      typeof matched.keyframes === "number" &&
      typeof afterLayer.keyframes === "number" &&
      matched.keyframes !== afterLayer.keyframes
    ) {
      push(notes, 'Keyframes changed on "' + afterLayer.name + '" (' + matched.keyframes + " -> " + afterLayer.keyframes + ')');
    }
    if (
      typeof matched.expressionCount === "number" &&
      typeof afterLayer.expressionCount === "number" &&
      (matched.expressionCount !== afterLayer.expressionCount ||
        matched.expressionDigest !== afterLayer.expressionDigest)
    ) {
      push(notes, 'Expressions changed on "' + afterLayer.name + '" (' + matched.expressionCount + " -> " + afterLayer.expressionCount + ')');
    }
    if (numberChanged(matched.inPoint, afterLayer.inPoint) || numberChanged(matched.outPoint, afterLayer.outPoint)) {
      push(notes, 'Layer timing changed on "' + afterLayer.name + '"');
    }
  }

  var removed: string[] = [];
  for (var name in buckets) {
    if (!Object.prototype.hasOwnProperty.call(buckets, name)) continue;
    while (buckets[name].length > 0) {
      removed.push(name.slice(2));
      buckets[name].pop();
    }
  }

  if (added.length > 0) notes.unshift("Layers added: " + joinNames(added, 10));
  if (removed.length > 0) notes.unshift("Layers removed: " + joinNames(removed, 10));
  if (before.numLayers !== after.numLayers) {
    push(notes, "Layer count: " + before.numLayers + " -> " + after.numLayers);
  }
  if (numberChanged(before.duration, after.duration)) {
    push(notes, "Comp duration: " + before.duration + " -> " + after.duration);
  }
  if (
    numberChanged(before.workAreaStart, after.workAreaStart) ||
    numberChanged(before.workAreaDuration, after.workAreaDuration)
  ) {
    push(notes, "Comp work area changed");
  }

  return notes.slice(0, 12);
}
