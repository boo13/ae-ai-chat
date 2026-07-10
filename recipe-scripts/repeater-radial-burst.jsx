app.beginUndoGroup("Repeater Radial Burst");
try {
  var comp = app.project.activeItem;
  if (!(comp instanceof CompItem)) throw new Error("Open a composition.");
  var shape = comp.layers.addShape();
  shape.name = "Radial Burst";
  var contents = shape.property("ADBE Root Vectors Group");
  var group = contents.addProperty("ADBE Vector Group");
  var groupContents = group.property("ADBE Vectors Group");
  var rect = groupContents.addProperty("ADBE Vector Shape - Rect");
  rect.property("ADBE Vector Rect Size").setValue([12, 180]);
  rect.property("ADBE Vector Rect Position").setValue([0, -150]);
  var fill = groupContents.addProperty("ADBE Vector Graphic - Fill");
  fill.property("ADBE Vector Fill Color").setValue([1, 0.3, 0.05, 1]);
  var repeater = groupContents.addProperty("ADBE Vector Filter - Repeater");
  repeater.property("ADBE Vector Repeater Copies").setValue(24);
  repeater.property("ADBE Vector Repeater Transform").property("ADBE Vector Repeater Rotation").setValue(15);
  shape.property("ADBE Transform Group").property("ADBE Position").setValue([comp.width / 2, comp.height / 2]);
} finally {
  app.endUndoGroup();
}
