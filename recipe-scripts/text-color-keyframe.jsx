app.beginUndoGroup("Animate Text Color");
try {
  var comp = app.project.activeItem;
  if (!(comp instanceof CompItem)) {
    throw new Error("Open a composition first.");
  }
  if (comp.selectedLayers.length < 1) {
    throw new Error("Select a text layer.");
  }
  var layer = comp.selectedLayers[0];
  var textProp = layer.property("ADBE Text Properties").property("ADBE Text Document");
  // Read the current TextDocument to preserve font, size, and content.
  var docStart = textProp.value;
  docStart.applyFill = true;
  // fillColor uses 0.0-1.0 float components, NOT 0-255.
  docStart.fillColor = [1, 0, 0];
  textProp.setValueAtTime(0, docStart);
  // Create a second TextDocument for the end color.
  // In-place mutation of the same object does NOT create a new keyframe --
  // you must pass a distinct TextDocument to each setValueAtTime call.
  var docEnd = textProp.value;
  docEnd.applyFill = true;
  docEnd.fillColor = [0, 0, 1];
  textProp.setValueAtTime(2, docEnd);
} finally {
  app.endUndoGroup();
}
