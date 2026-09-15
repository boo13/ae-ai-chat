(function () {
  app.beginUndoGroup("AE AI Chat: Reset Variable Font Verify Scene");
  try {
    var compName = "__AE_AI_VERIFY_VF__";
    var textName = "__AE_AI_VERIFY_VF_TEXT__";
    var i;

    for (i = app.project.numItems; i >= 1; i--) {
      var item = app.project.item(i);
      if (item.name === compName) {
        item.remove();
      }
    }

    var comp = app.project.items.addComp(compName, 1920, 1080, 1, 5, 30);
    var text = comp.layers.addText("Verify Variable Font Scene");
    text.name = textName;

    var textProp = text.property("ADBE Text Properties").property("ADBE Text Document");
    var textDoc = textProp.value;
    textDoc.applyFill = true;
    textDoc.fillColor = [1, 1, 1];
    textDoc.fontSize = 100;
    textDoc.justification = ParagraphJustification.LEFT_JUSTIFY;

    var hasVariableFont = false;
    try {
      var vfFonts = app.fonts.fontsWithDefaultDesignAxes;
      if (vfFonts && vfFonts.length > 0) {
        textDoc.font = vfFonts[0].postScriptName;
        hasVariableFont = true;
      }
    } catch (e) {}

    textProp.setValue(textDoc);
    text.property("ADBE Transform Group").property("ADBE Anchor Point").setValue([0, 0]);
    text.property("ADBE Transform Group").property("ADBE Position").setValue([80, 200]);

    for (i = 1; i <= comp.numLayers; i++) {
      comp.layer(i).selected = false;
    }
    text.selected = true;
    comp.openInViewer();

    return JSON.stringify({
      success: true,
      comp: comp.name,
      selectedLayer: text.name,
      hasVariableFont: hasVariableFont
    });
  } catch (error) {
    return JSON.stringify({ error: error.toString(), errorLine: error.line || null });
  } finally {
    app.endUndoGroup();
  }
}());
