app.beginUndoGroup("Duplicate Composition");
try {
  var comp = app.project.activeItem;
  if (!comp || !(comp instanceof CompItem)) {
    throw new Error("Please select a composition.");
  }
  // Shallow duplicate: nested comps remain shared references.
  // Use deepDuplicateComp for a fully decoupled copy.
  var compMap = {};
  var result = deepDuplicateComp(comp, compMap);
  result.name = comp.name + " copy";
  alert("Created: " + result.name);
} catch (e) {
  alert("Error: " + e.toString());
} finally {
  app.endUndoGroup();
}

function deepDuplicateComp(comp, compMap) {
  if (compMap[comp.id]) return compMap[comp.id];
  var dup = comp.duplicate();
  compMap[comp.id] = dup;
  var i;
  for (i = 1; i <= dup.numLayers; i++) {
    var layer = dup.layer(i);
    if (layer.source && layer.source instanceof CompItem) {
      layer.replaceSource(deepDuplicateComp(layer.source, compMap), false);
    }
  }
  return dup;
}
