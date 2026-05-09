app.beginUndoGroup("Replace Footage");
try {
  var comp = app.project.activeItem;
  if (!comp || !(comp instanceof CompItem)) {
    throw new Error("Please select a composition.");
  }
  if (comp.selectedLayers.length === 0) {
    throw new Error("Select a layer to replace its source.");
  }
  var layer = comp.selectedLayers[0];

  // Option A: replaceSource -- changes which project item THIS layer references.
  // Other layers using the original item are unaffected.
  var newItem = app.project.importFile(
    new ImportOptions(new File("/path/to/new-file.mov"))
  );
  layer.replaceSource(newItem, false); // false = don't shift keyframes

  // Option B: FootageItem.replace() -- changes the source FILE for the project item.
  // ALL layers referencing that footage item update automatically.
  // layer.source.replace(new File("/path/to/new-file.mov"));
} catch (e) {
  alert("Error: " + e.toString());
} finally {
  app.endUndoGroup();
}
