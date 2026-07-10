app.beginUndoGroup("Wiggle With Controls");
try {
  var comp = app.project.activeItem;
  if (!(comp instanceof CompItem) || comp.selectedLayers.length < 1) throw new Error("Select a layer.");
  var layer = comp.selectedLayers[0];
  var effects = layer.property("ADBE Effect Parade");
  var frequency = effects.addProperty("ADBE Slider Control");
  frequency.name = "Wiggle Frequency";
  frequency.property(1).setValue(2);
  var amount = effects.addProperty("ADBE Slider Control");
  amount.name = "Wiggle Amount";
  amount.property(1).setValue(50);
  var position = layer.property("ADBE Transform Group").property("ADBE Position");
  position.expression = "var f = effect('Wiggle Frequency')('Slider');\nvar a = effect('Wiggle Amount')('Slider');\nwiggle(f, a);";
} finally {
  app.endUndoGroup();
}
