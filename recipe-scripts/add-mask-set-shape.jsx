app.beginUndoGroup("Add Mask");
try {
  var comp = app.project.activeItem;
  if (!comp || !(comp instanceof CompItem)) {
    throw new Error("Please select a composition.");
  }
  if (comp.selectedLayers.length === 0) {
    throw new Error("Select at least one layer.");
  }
  var layer = comp.selectedLayers[0];
  var newMask = layer.Masks.addProperty("Mask");
  newMask.maskMode = MaskMode.ADD;
  newMask.inverted = false;
  var maskPath = newMask.property("maskShape");
  var s = maskPath.value;
  // Vertices are in layer space (centered at anchor point), not comp space.
  s.vertices = [[0, 0], [200, 0], [200, 200], [0, 200]];
  s.inTangents = [[0, 0], [0, 0], [0, 0], [0, 0]];
  s.outTangents = [[0, 0], [0, 0], [0, 0], [0, 0]];
  s.closed = true;
  maskPath.setValue(s);
  // Set feather (in pixels)
  newMask.property("ADBE Mask Feather").setValue(0);
  // Optional: set mask opacity and expansion
  // newMask.property("ADBE Mask Opacity").setValue(100);
  // newMask.property("ADBE Mask Expansion").setValue(0);
} catch (e) {
  alert("Error: " + e.toString());
} finally {
  app.endUndoGroup();
}
