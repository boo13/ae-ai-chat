app.beginUndoGroup("Animate Effect Properties");
try {
  var comp = app.project.activeItem;
  if (!(comp instanceof CompItem)) {
    throw new Error("Open a composition first.");
  }
  var layer;
  if (comp.selectedLayers.length > 0) {
    layer = comp.selectedLayers[0];
  } else {
    layer = comp.layers.addSolid([0.2, 0.2, 0.2], "Effect Target", comp.width, comp.height, comp.pixelAspect, comp.duration);
  }
  var effects = layer.property("ADBE Effect Parade");
  var blur = effects.addProperty("ADBE Gaussian Blur 2");
  var blurriness = blur.property("ADBE Gaussian Blur 2-0001");
  blurriness.setValueAtTime(0, 0);
  blurriness.setValueAtTime(1, 40);
  blur.property("ADBE Gaussian Blur 2-0002").setValue(1);
  blur.property("ADBE Gaussian Blur 2-0003").setValue(1);
} finally {
  app.endUndoGroup();
}
