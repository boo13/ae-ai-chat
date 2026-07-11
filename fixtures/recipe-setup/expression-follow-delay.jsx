(function () {
  var comp = app.project.activeItem;
  if (!(comp && comp instanceof CompItem)) {
    return JSON.stringify({ error: "No active composition for recipe setup." });
  }
  var i;
  for (i = 1; i <= comp.numLayers; i++) {
    comp.layer(i).selected = false;
  }
  var first = null;
  var second = null;
  for (i = 1; i <= comp.numLayers; i++) {
    var layer = comp.layer(i);
    if (layer.name === "__AE_AI_VERIFY_TEXT__") first = layer;
    if (layer.name === "__AE_AI_VERIFY_SOLID__") second = layer;
  }
  if (!first || !second) {
    return JSON.stringify({ error: "Verify layers not found." });
  }
  // selectedLayers is timeline-ordered: text (index 1) is [0] (driver), solid (index 2) is [1].
  first.selected = true;
  second.selected = true;
  return JSON.stringify({ success: true, selected: [first.name, second.name] });
}());
