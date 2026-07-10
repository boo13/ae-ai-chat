app.beginUndoGroup("Responsive Text Box");
try {
  var comp = app.project.activeItem;
  if (!(comp instanceof CompItem) || comp.selectedLayers.length < 1 || !(comp.selectedLayers[0] instanceof TextLayer)) throw new Error("Select a text layer.");
  var textLayer = comp.selectedLayers[0];
  var box = comp.layers.addShape();
  box.name = textLayer.name + " Box";
  var contents = box.property("ADBE Root Vectors Group");
  var group = contents.addProperty("ADBE Vector Group");
  var groupContents = group.property("ADBE Vectors Group");
  var rect = groupContents.addProperty("ADBE Vector Shape - Rect");
  var fill = groupContents.addProperty("ADBE Vector Graphic - Fill");
  fill.property("ADBE Vector Fill Color").setValue([0.1, 0.1, 0.1, 1]);
  function quoteLayerName(value) {
    var result = "";
    for (var i = 0; i < value.length; i++) {
      var ch = value.charAt(i);
      if (ch === "\\" || ch === "'") result += "\\";
      result += ch;
    }
    return result;
  }
  var escaped = quoteLayerName(textLayer.name);
  rect.property("ADBE Vector Rect Size").expression = "var r = thisComp.layer('" + escaped + "').sourceRectAtTime(time, false);\n[r.width + 40, r.height + 30];";
  rect.property("ADBE Vector Rect Position").expression = "var r = thisComp.layer('" + escaped + "').sourceRectAtTime(time, false);\n[r.left + r.width / 2, r.top + r.height / 2];";
  box.property("ADBE Transform Group").property("ADBE Position").setValue(textLayer.property("ADBE Transform Group").property("ADBE Position").value);
  box.moveAfter(textLayer);
} finally {
  app.endUndoGroup();
}
