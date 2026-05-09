app.beginUndoGroup("Copy Layer to Comp");
try {
  var srcComp = app.project.activeItem;
  if (!srcComp || !(srcComp instanceof CompItem)) {
    throw new Error("Please select the source composition.");
  }
  if (srcComp.selectedLayers.length === 0) {
    throw new Error("Select a layer to copy.");
  }
  var layer = srcComp.selectedLayers[0];
  // Find target comp by name.
  var targetComp = null;
  var i;
  for (i = 1; i <= app.project.numItems; i++) {
    var item = app.project.item(i);
    if (item instanceof CompItem && item.name === "Target Comp Name") {
      targetComp = item;
      break;
    }
  }
  if (!targetComp) {
    throw new Error("Target composition not found.");
  }
  // copyToComp returns undefined, not the new layer.
  // The copy becomes targetComp.layer(1) immediately after the call.
  layer.copyToComp(targetComp);
  var newLayer = targetComp.layer(1);
} catch (e) {
  alert("Error: " + e.toString());
} finally {
  app.endUndoGroup();
}
