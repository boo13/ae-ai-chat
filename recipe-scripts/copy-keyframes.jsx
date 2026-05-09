app.beginUndoGroup("Copy Keyframes");
try {
  var comp = app.project.activeItem;
  if (!(comp instanceof CompItem)) {
    throw new Error("Open a composition first.");
  }
  if (comp.selectedLayers.length < 1) {
    throw new Error("Select at least one layer.");
  }
  var layer = comp.selectedLayers[0];
  var srcProp = layer.property("ADBE Transform Group").property("ADBE Opacity");
  var dstProp = layer.property("ADBE Transform Group").property("ADBE Opacity");
  // Replace srcProp and dstProp with the actual source and destination properties.
  // Both properties must exist on accessible layers in the composition.
  var keyCount = srcProp.numKeys;
  if (keyCount === 0) {
    throw new Error("Source property has no keyframes.");
  }
  // Snapshot all keyframe data before modifying anything.
  var snapTimes = [];
  var snapValues = [];
  var snapInEase = [];
  var snapOutEase = [];
  var i;
  for (i = 1; i <= keyCount; i++) {
    snapTimes.push(srcProp.keyTime(i));
    snapValues.push(srcProp.keyValue(i));
    snapInEase.push(srcProp.keyInTemporalEase(i));
    snapOutEase.push(srcProp.keyOutTemporalEase(i));
  }
  // Write keyframes to destination, then apply ease.
  for (i = 0; i < keyCount; i++) {
    dstProp.setValueAtTime(snapTimes[i], snapValues[i]);
  }
  for (i = 0; i < keyCount; i++) {
    dstProp.setTemporalEaseAtKey(i + 1, snapInEase[i], snapOutEase[i]);
  }
} finally {
  app.endUndoGroup();
}
