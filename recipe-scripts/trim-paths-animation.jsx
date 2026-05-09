app.beginUndoGroup("Animate Trim Paths");
try {
  var comp = app.project.activeItem;
  if (!(comp instanceof CompItem)) {
    throw new Error("Open a composition first.");
  }
  var layer = comp.layers.addShape();
  layer.name = "Trim Paths Line";
  var contents = layer.property("ADBE Root Vectors Group");
  var group = contents.addProperty("ADBE Vector Group");
  group.name = "Animated Line";
  var groupContents = group.property("ADBE Vectors Group");
  var rect = groupContents.addProperty("ADBE Vector Shape - Rect");
  rect.property("ADBE Vector Rect Size").setValue([600, 180]);
  rect.property("ADBE Vector Rect Position").setValue([0, 0]);
  var stroke = groupContents.addProperty("ADBE Vector Graphic - Stroke");
  stroke.property("ADBE Vector Stroke Color").setValue([0.1, 0.8, 1, 1]);
  stroke.property("ADBE Vector Stroke Width").setValue(12);
  var trim = groupContents.addProperty("ADBE Vector Filter - Trim");
  var startProp = trim.property("ADBE Vector Trim Start");
  var endProp = trim.property("ADBE Vector Trim End");
  startProp.setValueAtTime(0, 0);
  startProp.setValueAtTime(2, 0);
  endProp.setValueAtTime(0, 0);
  endProp.setValueAtTime(2, 100);
  layer.property("ADBE Transform Group").property("ADBE Position").setValue([comp.width / 2, comp.height / 2]);
} finally {
  app.endUndoGroup();
}
