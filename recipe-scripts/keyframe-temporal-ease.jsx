app.beginUndoGroup("Ease Opacity Keyframes");
try {
  var comp = app.project.activeItem;
  if (!(comp instanceof CompItem)) {
    throw new Error("Open a composition first.");
  }
  var layer = comp.layers.addSolid([1, 0.45, 0.1], "Eased Opacity", comp.width, comp.height, comp.pixelAspect, comp.duration);
  var opacity = layer.property("ADBE Transform Group").property("ADBE Opacity");
  opacity.setValueAtTime(0, 0);
  opacity.setValueAtTime(1, 100);
  var easeIn = new KeyframeEase(0, 80);
  var easeOut = new KeyframeEase(0, 80);
  opacity.setTemporalEaseAtKey(1, [easeIn], [easeOut]);
  opacity.setTemporalEaseAtKey(2, [easeIn], [easeOut]);
} finally {
  app.endUndoGroup();
}
