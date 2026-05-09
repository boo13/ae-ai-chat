app.beginUndoGroup("Walk Properties");
try {
  var comp = app.project.activeItem;
  if (!comp || !(comp instanceof CompItem)) {
    throw new Error("Please select a composition.");
  }
  if (comp.selectedLayers.length === 0) {
    throw new Error("Select a layer.");
  }
  var layer = comp.selectedLayers[0];
  walkProperties(layer, function(prop) {
    // Example: log every property's matchName and current value
    if (prop.numProperties === 0) {
      // Leaf property -- safe to read .value
      // $.writeln(prop.matchName + ": " + prop.value);
    }
  });
} catch (e) {
  alert("Error: " + e.toString());
} finally {
  app.endUndoGroup();
}

function walkProperties(propertyGroup, callback) {
  var i;
  for (i = 1; i <= propertyGroup.numProperties; i++) {
    var prop = propertyGroup.property(i);
    callback(prop);
    if (prop.numProperties > 0) {
      walkProperties(prop, callback);
    }
  }
}
