app.beginUndoGroup("Follow With Delay");
try {
  var comp = app.project.activeItem;
  if (!(comp instanceof CompItem) || comp.selectedLayers.length < 2) throw new Error("Select leader then follower layers.");
  var leader = comp.selectedLayers[0];
  var follower = comp.selectedLayers[1];
  var delay = follower.property("ADBE Effect Parade").addProperty("ADBE Slider Control");
  delay.name = "Follow Delay";
  delay.property(1).setValue(0.15);
  function quoteLayerName(value) {
    var result = "";
    for (var i = 0; i < value.length; i++) {
      var ch = value.charAt(i);
      if (ch === "\\" || ch === "'") result += "\\";
      result += ch;
    }
    return result;
  }
  var escaped = quoteLayerName(leader.name);
  var position = follower.property("ADBE Transform Group").property("ADBE Position");
  position.expression = "var d = effect('Follow Delay')('Slider');\nthisComp.layer('" + escaped + "').transform.position.valueAtTime(time - d);";
} finally {
  app.endUndoGroup();
}
