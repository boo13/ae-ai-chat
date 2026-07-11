(function () {
  var comp = app.project.activeItem;
  if (!(comp && comp instanceof CompItem)) {
    return JSON.stringify({ error: "No active composition for recipe setup." });
  }
  var i;
  for (i = 1; i <= comp.numLayers; i++) {
    comp.layer(i).selected = false;
  }
  var solid = null;
  for (i = 1; i <= comp.numLayers; i++) {
    if (comp.layer(i).name === "__AE_AI_VERIFY_SOLID__") {
      solid = comp.layer(i);
      break;
    }
  }
  if (!solid) {
    return JSON.stringify({ error: "Verify solid layer not found." });
  }
  solid.selected = true;
  var position = solid.property("ADBE Transform Group").property("ADBE Position");
  position.setValueAtTime(0, [200, 200]);
  position.setValueAtTime(1, [800, 600]);
  position.selected = true;
  return JSON.stringify({ success: true, selected: solid.name, keys: position.numKeys });
}());
