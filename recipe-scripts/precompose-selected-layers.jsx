app.beginUndoGroup("Pre-compose Selected Layers");
try {
  var comp = app.project.activeItem;
  if (!(comp instanceof CompItem)) {
    throw new Error("Open a composition first.");
  }
  if (comp.selectedLayers.length === 0) {
    throw new Error("Select at least one layer to pre-compose.");
  }
  // Collect 1-based integer indices -- precompose() does NOT accept Layer objects.
  var indices = [];
  var i;
  for (i = 0; i < comp.selectedLayers.length; i++) {
    indices.push(comp.selectedLayers[i].index);
  }
  // Sort ascending -- precompose expects a sorted index array.
  indices.sort(function(a, b) { return a - b; });
  var newCompName = "Precomp";
  // moveAllAttributes=true (the default) moves all layer attributes into the new comp.
  // Set to false only when pre-composing a single layer and you want to keep attributes.
  var newComp = comp.layers.precompose(indices, newCompName, true);
} finally {
  app.endUndoGroup();
}
