app.beginUndoGroup("Per Character 3D Fade");
try {
  var comp = app.project.activeItem;
  if (!(comp instanceof CompItem) || comp.selectedLayers.length < 1 || !(comp.selectedLayers[0] instanceof TextLayer)) throw new Error("Select a text layer.");
  var layer = comp.selectedLayers[0];
  layer.threeDPerChar = true;
  var animator = layer.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator");
  animator.name = "3D Fade";
  var props = animator.property("ADBE Text Animator Properties");
  props.addProperty("ADBE Text Opacity").setValue(0);
  props.addProperty("ADBE Text Position 3D").setValue([0, 0, -100]);
  var selector = animator.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
  var offset = selector.property("ADBE Text Percent Offset");
  offset.setValueAtTime(comp.time, -100);
  offset.setValueAtTime(comp.time + 1.5, 100);
} finally {
  app.endUndoGroup();
}
