app.beginUndoGroup("Bounce Overshoot");
try {
  var comp = app.project.activeItem;
  if (!(comp instanceof CompItem) || comp.selectedProperties.length < 1) throw new Error("Select a keyframed property.");
  for (var i = 0; i < comp.selectedProperties.length; i++) {
    var prop = comp.selectedProperties[i];
    if (prop instanceof Property && prop.canSetExpression) {
      prop.expression = "var amp = 0.08;\nvar freq = 3;\nvar decay = 5;\nif (numKeys < 1 || time <= key(numKeys).time) value;\nelse {\n  var t = time - key(numKeys).time;\n  var v = velocityAtTime(key(numKeys).time - thisComp.frameDuration / 10);\n  value + v * amp * Math.sin(freq * t * 2 * Math.PI) / Math.exp(decay * t);\n}";
    }
  }
} finally {
  app.endUndoGroup();
}
