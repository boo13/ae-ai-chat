app.beginUndoGroup("Set Spatial Ease on Position");
try {
  var comp = app.project.activeItem;
  if (!(comp instanceof CompItem)) {
    throw new Error("Open a composition first.");
  }
  if (comp.selectedLayers.length < 1) {
    throw new Error("Select a layer.");
  }
  var layer = comp.selectedLayers[0];
  var position = layer.property("ADBE Transform Group").property("ADBE Position");
  // Create at least two position keyframes first.
  var cx = comp.width / 2;
  var cy = comp.height / 2;
  position.setValueAtTime(0, [cx - 300, cy]);
  position.setValueAtTime(1, [cx, cy - 200]);
  position.setValueAtTime(2, [cx + 300, cy]);
  // setSpatialTangentsAtKey only works on spatial (TwoD_SPATIAL / ThreeD_SPATIAL) properties.
  // It does NOT work on Scale, Opacity, or other non-spatial properties.
  // Disable auto-bezier and continuous bezier so AE does not override the tangents.
  var keyIndex;
  for (keyIndex = 1; keyIndex <= position.numKeys; keyIndex++) {
    position.setSpatialAutoBezierAtKey(keyIndex, false);
    position.setSpatialContinuousAtKey(keyIndex, false);
    // inTangent and outTangent are [x, y] pixel offsets from the keyframe anchor.
    position.setSpatialTangentsAtKey(keyIndex, [-100, 0], [100, 0]);
  }
} finally {
  app.endUndoGroup();
}
