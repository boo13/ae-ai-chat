app.beginUndoGroup("Assign Expression");
try {
  var comp = app.project.activeItem;
  if (!(comp instanceof CompItem)) {
    throw new Error("Open a composition first.");
  }
  var layer = comp.layers.addSolid([0.15, 0.18, 0.24], "Expression Opacity", comp.width, comp.height, comp.pixelAspect, comp.duration);
  var opacity = layer.property("ADBE Transform Group").property("ADBE Opacity");
  opacity.setValue(80);
  opacity.expression = "var base = 80;\nvar amount = 20;\nbase + Math.sin(time * 6) * amount;";
  if (opacity.expressionError !== "") {
    throw new Error(opacity.expressionError);
  }
} finally {
  app.endUndoGroup();
}
