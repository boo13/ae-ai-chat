app.beginUndoGroup("3D Light Setup");
try {
  var comp = app.project.activeItem;
  if (!(comp instanceof CompItem)) throw new Error("Open a composition.");
  for (var i = 0; i < comp.selectedLayers.length; i++) {
    try { comp.selectedLayers[i].threeDLayer = true; } catch (e) {}
  }
  var light = comp.layers.addLight("Key Light", [comp.width * 0.35, comp.height * 0.3]);
  light.lightType = LightType.POINT;
  light.property("ADBE Transform Group").property("ADBE Position").setValue([comp.width * 0.35, comp.height * 0.3, -500]);
  light.property("ADBE Light Options Group").property("ADBE Light Intensity").setValue(100);
} finally {
  app.endUndoGroup();
}
