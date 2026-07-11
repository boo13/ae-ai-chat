(function () {
  var comp = app.project.activeItem;
  if (!(comp && comp instanceof CompItem)) {
    return JSON.stringify({ error: "No active composition for recipe setup." });
  }
  var i;
  for (i = 1; i <= comp.numLayers; i++) {
    comp.layer(i).selected = false;
  }
  var target = null;
  for (i = 1; i <= comp.numLayers; i++) {
    if (comp.layer(i).name === "__AE_AI_VERIFY_TEXT__") {
      target = comp.layer(i);
      break;
    }
  }
  if (!target) {
    return JSON.stringify({ error: "Verify text layer not found." });
  }
  target.selected = true;
  return JSON.stringify({ success: true, selected: target.name });
}());
