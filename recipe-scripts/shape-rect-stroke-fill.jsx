app.beginUndoGroup("Add Rectangle with Stroke and Fill");
try {
  var comp = app.project.activeItem;
  if (!(comp instanceof CompItem)) {
    throw new Error("Open a composition first.");
  }
  var layer = comp.layers.addShape();
  layer.name = "Rectangle";
  // All shape content lives under ADBE Root Vectors Group (the layer's Contents).
  var contents = layer.property("ADBE Root Vectors Group");
  // Add a Group -- path, stroke, and fill are siblings inside the group's ADBE Vectors Group.
  var group = contents.addProperty("ADBE Vector Group");
  group.name = "Rect Group";
  var groupContents = group.property("ADBE Vectors Group");
  // Add the rect path inside the group.
  var rect = groupContents.addProperty("ADBE Vector Shape - Rect");
  rect.property("ADBE Vector Rect Size").setValue([400, 200]);
  rect.property("ADBE Vector Rect Position").setValue([0, 0]);
  // Add stroke inside the same group (sibling of rect, not at root Contents level).
  var stroke = groupContents.addProperty("ADBE Vector Graphic - Stroke");
  stroke.property("ADBE Vector Stroke Color").setValue([1, 1, 1, 1]);
  stroke.property("ADBE Vector Stroke Width").setValue(4);
  // Add fill inside the same group.
  var fill = groupContents.addProperty("ADBE Vector Graphic - Fill");
  fill.property("ADBE Vector Fill Color").setValue([0.2, 0.4, 0.8, 1]);
  // Center the layer.
  layer.property("ADBE Transform Group").property("ADBE Position").setValue([comp.width / 2, comp.height / 2]);
} finally {
  app.endUndoGroup();
}
