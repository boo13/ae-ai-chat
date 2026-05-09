app.beginUndoGroup("My Script Name");
try {
  var comp = app.project.activeItem;
  if (!comp || !(comp instanceof CompItem)) {
    throw new Error("Please select a composition.");
  }
  // All mutations go here.
  // Thrown errors will skip to catch, endUndoGroup still runs via finally.
} catch (e) {
  alert("Error: " + e.toString());
} finally {
  app.endUndoGroup();
}
