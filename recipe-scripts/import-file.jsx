app.beginUndoGroup("Import File");
try {
  var comp = app.project.activeItem;
  if (!(comp instanceof CompItem)) {
    throw new Error("Open a composition first.");
  }
  // Replace this path with the actual file path using forward slashes.
  var filePath = "/path/to/your/file.mp4";
  var file = new File(filePath);
  if (!file.exists) {
    throw new Error("File not found: " + filePath);
  }
  var importOptions = new ImportOptions(file);
  // Use ImportAsType.COMP for layered files (PSD, AI) to preserve layers.
  // Use ImportAsType.FOOTAGE (the default) for video, image, and audio files.
  importOptions.importAs = ImportAsType.FOOTAGE;
  var footageItem = app.project.importFile(importOptions);
  // Optionally add the imported footage to the active comp as a new layer.
  var newLayer = comp.layers.add(footageItem);
  newLayer.startTime = 0;
} finally {
  app.endUndoGroup();
}
