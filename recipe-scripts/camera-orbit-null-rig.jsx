app.beginUndoGroup("Camera Orbit Rig");
try {
  var comp = app.project.activeItem;
  if (!(comp instanceof CompItem)) throw new Error("Open a composition.");
  var rig = comp.layers.addNull(comp.duration);
  rig.name = "Camera Orbit";
  rig.threeDLayer = true;
  rig.property("ADBE Transform Group").property("ADBE Position").setValue([comp.width / 2, comp.height / 2, 0]);
  var camera = comp.layers.addCamera("Orbit Camera", [comp.width / 2, comp.height / 2]);
  camera.property("ADBE Transform Group").property("ADBE Position").setValue([comp.width / 2, comp.height / 2, -1500]);
  camera.setParentWithJump(rig);
} finally {
  app.endUndoGroup();
}
