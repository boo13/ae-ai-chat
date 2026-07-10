app.beginUndoGroup("Expression Error Scan");
try {
  var comp = app.project.activeItem;
  if (!(comp instanceof CompItem)) throw new Error("Open a composition.");
  var errors = [];
  function walk(group, layerName) {
    for (var i = 1; i <= group.numProperties; i++) {
      var item = group.property(i);
      if (!item) continue;
      if (item instanceof Property) {
        if (item.canSetExpression && item.expressionEnabled) {
          try { item.valueAtTime(comp.time, false); } catch (e) {}
          if (item.expressionError) errors.push(layerName + " > " + item.name + ": " + item.expressionError);
        }
      } else {
        walk(item, layerName);
      }
    }
  }
  for (var layerIndex = 1; layerIndex <= comp.numLayers; layerIndex++) walk(comp.layer(layerIndex), comp.layer(layerIndex).name);
  if (errors.length) alert(errors.join("\n\n"));
  else alert("No expression errors found.");
} finally {
  app.endUndoGroup();
}
