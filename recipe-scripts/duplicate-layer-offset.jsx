app.beginUndoGroup("Duplicate and Offset Layer");
try {
  var comp = app.project.activeItem;
  if (!(comp instanceof CompItem)) {
    throw new Error("Open a composition first.");
  }
  if (comp.selectedLayers.length < 1) {
    throw new Error("Select a layer to duplicate.");
  }
  var original = comp.selectedLayers[0];
  // duplicate() inserts the copy at index 1 (top of stack).
  var copy = original.duplicate();
  copy.name = original.name + " copy";
  // startTime slides the whole layer bar in comp time (not a trim handle).
  // .inPoint and .outPoint are trim positions -- distinct from startTime.
  var offsetSeconds = 0.5;
  copy.startTime = original.startTime + offsetSeconds;
} finally {
  app.endUndoGroup();
}
