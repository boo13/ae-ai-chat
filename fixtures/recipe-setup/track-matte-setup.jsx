(function () {
  var comp = app.project.activeItem;
  if (!(comp && comp instanceof CompItem)) {
    return JSON.stringify({ error: "No active composition for recipe setup." });
  }
  var i;
  for (i = 1; i <= comp.numLayers; i++) {
    comp.layer(i).selected = false;
  }
  var matte = null;
  var fill = null;
  for (i = 1; i <= comp.numLayers; i++) {
    var layer = comp.layer(i);
    if (layer.name === "__AE_AI_VERIFY_TEXT__") matte = layer;
    if (layer.name === "__AE_AI_VERIFY_SOLID__") fill = layer;
  }
  if (!matte || !fill) {
    return JSON.stringify({ error: "Verify layers not found for track matte setup." });
  }
  // selectedLayers is timeline-ordered: the text layer (index 1) becomes [0] (matte),
  // the solid (index 2) becomes [1] (fill), matching the recipe's expectation.
  matte.selected = true;
  fill.selected = true;
  return JSON.stringify({ success: true, selected: [matte.name, fill.name] });
}());
