app.beginUndoGroup("Loop Keyframes");
try {
  var comp = app.project.activeItem;
  if (!(comp instanceof CompItem) || comp.selectedProperties.length < 1) throw new Error("Select at least one property.");
  for (var i = 0; i < comp.selectedProperties.length; i++) {
    var prop = comp.selectedProperties[i];
    if (prop instanceof Property && prop.canSetExpression) {
      prop.expression = "numKeys >= 2 ? loopOut('cycle') : value;";
    }
  }
} finally {
  app.endUndoGroup();
}
