app.beginUndoGroup("Reverse Keyframes");
try {
  var comp = app.project.activeItem;
  if (!comp || !(comp instanceof CompItem)) {
    throw new Error("Please select a composition.");
  }
  if (comp.selectedLayers.length === 0) {
    throw new Error("Select a layer.");
  }
  var layer = comp.selectedLayers[0];
  // Replace with the actual property path to reverse.
  var prop = layer.property("ADBE Transform Group").property("ADBE Position");
  var keyCount = prop.numKeys;
  if (keyCount < 2) {
    throw new Error("Property needs at least 2 keyframes to reverse.");
  }
  // Snapshot everything before touching keyframes.
  var i;
  var snapTimes = [];
  var snapValues = [];
  var snapInEase = [];
  var snapOutEase = [];
  var snapInInterp = [];
  var snapOutInterp = [];
  for (i = 1; i <= keyCount; i++) {
    snapTimes.push(prop.keyTime(i));
    snapValues.push(prop.keyValue(i));
    snapInEase.push(prop.keyInTemporalEase(i));
    snapOutEase.push(prop.keyOutTemporalEase(i));
    snapInInterp.push(prop.keyInInterpolationType(i));
    snapOutInterp.push(prop.keyOutInterpolationType(i));
  }
  // Delete all keys from highest index down (renumbering safe).
  for (i = keyCount; i >= 1; i--) {
    prop.removeKey(i);
  }
  // Rewrite in reverse: original last key maps to original first time.
  for (i = 0; i < keyCount; i++) {
    var srcIdx = keyCount - 1 - i; // reversed source index
    prop.setValueAtTime(snapTimes[i], snapValues[srcIdx]);
  }
  // Reapply eases with in/out swapped.
  for (i = 1; i <= keyCount; i++) {
    var srcIdx2 = keyCount - i; // reversed source index (0-based)
    prop.setTemporalEaseAtKey(
      i,
      snapOutEase[srcIdx2], // original outEase becomes inEase
      snapInEase[srcIdx2]   // original inEase becomes outEase
    );
  }
} catch (e) {
  alert("Error: " + e.toString());
} finally {
  app.endUndoGroup();
}
