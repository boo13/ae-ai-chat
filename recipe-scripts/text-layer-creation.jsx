app.beginUndoGroup("Create Text Layer");
try {
  var comp = app.project.activeItem;
  if (!(comp instanceof CompItem)) {
    throw new Error("Open a composition first.");
  }
  var textLayer = comp.layers.addText("Welcome");
  var textProp = textLayer.property("ADBE Text Properties").property("ADBE Text Document");
  var textDoc = textProp.value;
  textDoc.font = "ArialMT";
  textDoc.fontSize = 48;
  textDoc.applyFill = true;
  textDoc.fillColor = [1, 1, 1];
  textDoc.justification = ParagraphJustification.CENTER_JUSTIFY;
  textProp.setValue(textDoc);
  textLayer.property("ADBE Transform Group").property("ADBE Anchor Point").setValue([0, 0]);
  textLayer.property("ADBE Transform Group").property("ADBE Position").setValue([comp.width / 2, comp.height / 2]);
} finally {
  app.endUndoGroup();
}
