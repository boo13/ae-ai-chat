app.beginUndoGroup("Enable Time Remap");
try {
  var comp = app.project.activeItem;
  if (!comp || !(comp instanceof CompItem)) {
    throw new Error("Please select a composition.");
  }
  if (comp.selectedLayers.length === 0) {
    throw new Error("Select a layer.");
  }
  var layer = comp.selectedLayers[0];
  layer.timeRemapEnabled = true;
  var timeRemap = layer.property("ADBE Time Remapping");
  // AE auto-creates 2 keyframes when enabling: at layer.inPoint and layer.outPoint.
  // keyValue is source-time in seconds (where in the source to sample),
  // NOT comp-time.
  // Read auto-created keyframes before adding new ones:
  var autoKeyCount = timeRemap.numKeys;
  // Example: hold on frame 0 until 1s, then play from frame 0 again at 2s
  // timeRemap.setValueAtTime(0, 0);      // comp 0s -> source 0s
  // timeRemap.setValueAtTime(1.0, 0);    // comp 1s -> still source 0s (hold)
  // timeRemap.setValueAtTime(2.0, 1.0);  // comp 2s -> source 1s
} catch (e) {
  alert("Error: " + e.toString());
} finally {
  app.endUndoGroup();
}
