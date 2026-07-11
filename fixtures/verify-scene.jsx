(function () {
  app.beginUndoGroup("AE AI Chat: Reset Verify Scene");
  try {
    var compName = "__AE_AI_VERIFY__";
    var solidName = "__AE_AI_VERIFY_SOLID__";
    var textName = "__AE_AI_VERIFY_TEXT__";
    var i;

    for (i = app.project.numItems; i >= 1; i--) {
      var item = app.project.item(i);
      if (item.name === compName || item.name === solidName) {
        item.remove();
      }
    }

    var comp = app.project.items.addComp(compName, 1920, 1080, 1, 5, 30);
    var solid = comp.layers.addSolid([0.2, 0.2, 0.2], solidName, 1920, 1080, 1, 5);
    var text = comp.layers.addText("Verify Scene");
    text.name = textName;

    var textProp = text.property("ADBE Text Properties").property("ADBE Text Document");
    var textDoc = textProp.value;
    textDoc.applyFill = true;
    textDoc.fillColor = [1, 1, 1];
    textDoc.justification = ParagraphJustification.LEFT_JUSTIFY;
    textProp.setValue(textDoc);
    text.property("ADBE Transform Group").property("ADBE Anchor Point").setValue([0, 0]);
    text.property("ADBE Transform Group").property("ADBE Position").setValue([80, 80]);

    for (i = 1; i <= comp.numLayers; i++) {
      comp.layer(i).selected = false;
    }
    solid.selected = true;
    comp.openInViewer();

    return JSON.stringify({
      success: true,
      comp: comp.name,
      selectedLayer: solid.name
    });
  } catch (error) {
    return JSON.stringify({ error: error.toString(), errorLine: error.line || null });
  } finally {
    app.endUndoGroup();
  }
}());
