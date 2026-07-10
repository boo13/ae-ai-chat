app.beginUndoGroup("Glow Treatment");
try {
  var comp = app.project.activeItem;
  if (!(comp instanceof CompItem) || comp.selectedLayers.length < 1) throw new Error("Select at least one layer.");
  for (var i = 0; i < comp.selectedLayers.length; i++) {
    var effects = comp.selectedLayers[i].property("ADBE Effect Parade");
    var glow = effects.addProperty("ADBE Glo2");
    glow.property("ADBE Glo2-0002").setValue(55);
    glow.property("ADBE Glo2-0003").setValue(35);
    glow.property("ADBE Glo2-0004").setValue(1.2);
  }
} finally {
  app.endUndoGroup();
}
