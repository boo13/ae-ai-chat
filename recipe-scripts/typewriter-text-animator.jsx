app.beginUndoGroup("Typewriter Text Animator");
try {
  var comp = app.project.activeItem;
  if (!(comp instanceof CompItem) || comp.selectedLayers.length < 1 || !(comp.selectedLayers[0] instanceof TextLayer)) throw new Error("Select a text layer.");
  var layer = comp.selectedLayers[0];
  var animators = layer.property("ADBE Text Properties").property("ADBE Text Animators");
  var animator = animators.addProperty("ADBE Text Animator");
  animator.name = "Typewriter";
  animator.property("ADBE Text Animator Properties").addProperty("ADBE Text Opacity").setValue(0);
  var selector = animator.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
  var end = selector.property("ADBE Text Percent End");
  end.setValueAtTime(comp.time, 0);
  end.setValueAtTime(comp.time + 2, 100);
} finally {
  app.endUndoGroup();
}
