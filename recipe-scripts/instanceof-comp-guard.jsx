app.beginUndoGroup("Script Name");
try {
  if (!app.project) {
    throw new Error("No project is open.");
  }
  var comp = app.project.activeItem;
  if (!comp || !(comp instanceof CompItem)) {
    throw new Error("Please select a composition in the Project panel.");
  }
  // Safe to access comp.numLayers, comp.layers, comp.selectedLayers, etc.
  var numLayers = comp.numLayers;
  // ... your script logic here ...
} catch (e) {
  alert("Error: " + e.toString());
} finally {
  app.endUndoGroup();
}
