app.beginUndoGroup("Easy Ease Preset");
try {
  var comp = app.project.activeItem;
  if (!(comp instanceof CompItem) || comp.selectedProperties.length < 1) throw new Error("Select keyframed properties.");
  for (var i = 0; i < comp.selectedProperties.length; i++) {
    var prop = comp.selectedProperties[i];
    if (!(prop instanceof Property) || prop.numKeys < 1) continue;
    var dimensions = prop.value instanceof Array ? prop.value.length : 1;
    var easeIn = [];
    var easeOut = [];
    for (var d = 0; d < dimensions; d++) {
      easeIn.push(new KeyframeEase(0, 33.333));
      easeOut.push(new KeyframeEase(0, 33.333));
    }
    for (var k = 1; k <= prop.numKeys; k++) {
      prop.setInterpolationTypeAtKey(k, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
      prop.setTemporalEaseAtKey(k, easeIn, easeOut);
    }
  }
} finally {
  app.endUndoGroup();
}
