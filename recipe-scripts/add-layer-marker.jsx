app.beginUndoGroup("Add Marker");
try {
  var comp = app.project.activeItem;
  if (!comp || !(comp instanceof CompItem)) {
    throw new Error("Please select a composition.");
  }
  // --- Layer marker ---
  if (comp.selectedLayers.length > 0) {
    var layer = comp.selectedLayers[0];
    var mv = new MarkerValue("My Marker");
    mv.duration = 0; // 0 = point marker; set > 0 for a duration span
    layer.property("Marker").setValueAtTime(1.0, mv); // 1.0 = time in seconds
  }
  // --- Composition marker ---
  // var compMv = new MarkerValue("Comp Marker");
  // comp.markerProperty.setValueAtTime(2.0, compMv);
} catch (e) {
  alert("Error: " + e.toString());
} finally {
  app.endUndoGroup();
}

// Read a marker's comment:
// var comment = layer.property("Marker").keyValue(1).comment;
