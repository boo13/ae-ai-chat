app.beginUndoGroup("Track Matte Setup");
try {
  var comp = app.project.activeItem;
  if (!(comp instanceof CompItem) || comp.selectedLayers.length < 2) throw new Error("Select matte then fill layers.");
  var matte = comp.selectedLayers[0];
  var fill = comp.selectedLayers[1];
  if (typeof fill.setTrackMatte !== "function") throw new Error("setTrackMatte requires After Effects 23 or newer.");
  fill.setTrackMatte(matte, TrackMatteType.ALPHA);
} finally {
  app.endUndoGroup();
}
