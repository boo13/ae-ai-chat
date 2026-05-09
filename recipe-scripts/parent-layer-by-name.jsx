app.beginUndoGroup("Parent Layer by Name");
try {
  var comp = app.project.activeItem;
  if (!(comp instanceof CompItem)) {
    throw new Error("Open a composition first.");
  }
  var childName = "Title";
  var parentName = "Background Box";
  var child = comp.layer(childName);
  if (!child) {
    throw new Error("Layer not found: " + childName);
  }
  var parent = comp.layer(parentName);
  if (!parent) {
    throw new Error("Layer not found: " + parentName);
  }
  // Assigning .parent compensates transforms so the layer does not jump visually.
  // Use setParentWithJump(parent) if you want to preserve the raw transform values
  // and intentionally accept the visual snap (e.g. locking values before rigging).
  child.parent = parent;
} finally {
  app.endUndoGroup();
}
